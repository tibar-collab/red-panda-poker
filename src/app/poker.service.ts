import { Injectable, computed, signal } from '@angular/core';
import { RealtimeChannel, SupabaseClient, createClient } from '@supabase/supabase-js';
import { DEFAULT_ROOM, SUPABASE_KEY, SUPABASE_URL, cardValue } from './config';

/**
 * Zustand einer Schätzrunde. Jeder Client schickt seine Sicht davon mit jeder
 * Zustandsnachricht mit. Gewinner ist immer die "neueste" Runde
 * (höchste Rundennummer, bei Gleichstand der jüngste Zeitstempel).
 * So brauchen wir weder Server noch Datenbank, und wer später dazukommt,
 * übernimmt automatisch den aktuellen Stand.
 */
export interface RoundState {
  n: number;
  revealed: boolean;
  topic: string;
  at: number;
}

/** Was jeder Client per Broadcast von sich veröffentlicht. */
interface MemberState {
  id: string;
  name: string;
  spectator: boolean;
  voted: boolean;
  /** Wird erst nach dem Aufdecken veröffentlicht. */
  vote: string | null;
  round: RoundState;
}

export interface Participant {
  id: string;
  name: string;
  spectator: boolean;
  voted: boolean;
  vote: string | null;
  isMe: boolean;
}

export type ConnectionStatus = 'offline' | 'connecting' | 'online' | 'error';

const NAME_KEY = 'rpp.name';
const SPECTATOR_KEY = 'rpp.spectator';

function newerRound(a: RoundState, b: RoundState): RoundState {
  if (a.n !== b.n) return a.n > b.n ? a : b;
  return a.at >= b.at ? a : b;
}

function sameRound(a: RoundState, b: RoundState): boolean {
  return a.n === b.n && a.revealed === b.revealed && a.topic === b.topic && a.at === b.at;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* privater Modus o. Ä. – dann merken wir uns eben nichts */
  }
}

@Injectable({ providedIn: 'root' })
export class PokerService {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  /** Eine ID pro Browser-Tab, damit zwei Tabs zwei Teilnehmer sind. */
  private readonly myId = crypto.randomUUID();
  private lastSent = '';
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  readonly room = signal(DEFAULT_ROOM);
  readonly status = signal<ConnectionStatus>('offline');
  readonly name = signal<string>(safeGet(NAME_KEY) ?? '');
  readonly spectator = signal<boolean>(safeGet(SPECTATOR_KEY) === '1');
  readonly myVote = signal<string | null>(null);
  readonly round = signal<RoundState>({ n: 0, revealed: false, topic: '', at: 0 });
  /** Letzter bekannter Zustand je Teilnehmer (per Broadcast). */
  private readonly states = signal(new Map<string, MemberState>());
  /** Wer laut Presence gerade verbunden ist. */
  private readonly online = signal(new Set<string>());
  private readonly others = computed(() =>
    [...this.states().values()].filter((p) => this.online().has(p.id)),
  );

  readonly joined = computed(() => this.status() !== 'offline');

  readonly participants = computed<Participant[]>(() => {
    const me: Participant = {
      id: this.myId,
      name: this.name(),
      spectator: this.spectator(),
      voted: this.myVote() !== null,
      vote: this.myVote(),
      isMe: true,
    };
    const n = this.round().n;
    const others = this.others().map<Participant>((p) => {
      // Einträge aus einer älteren Runde gelten als "noch nicht gewählt".
      const current = p.round.n === n;
      return {
        id: p.id,
        name: p.name,
        spectator: p.spectator,
        voted: current && p.voted,
        vote: current ? p.vote : null,
        isMe: false,
      };
    });
    return [me, ...others].sort((a, b) =>
      a.spectator !== b.spectator ? (a.spectator ? 1 : -1) : a.name.localeCompare(b.name, 'de'),
    );
  });

  readonly voters = computed(() => this.participants().filter((p) => !p.spectator));
  readonly votedCount = computed(() => this.voters().filter((p) => p.voted).length);

  /** Auswertung – nur sinnvoll, wenn aufgedeckt. */
  readonly result = computed(() => {
    const votes = this.voters()
      .map((p) => p.vote)
      .filter((v): v is string => v !== null);
    const numbers = votes.map(cardValue).filter((v): v is number => v !== null);
    const distribution = new Map<string, number>();
    for (const v of votes) distribution.set(v, (distribution.get(v) ?? 0) + 1);
    const avg = numbers.length ? numbers.reduce((s, n) => s + n, 0) / numbers.length : null;
    const min = numbers.length ? Math.min(...numbers) : null;
    const max = numbers.length ? Math.max(...numbers) : null;
    const consensus = votes.length >= 2 && distribution.size === 1 && numbers.length === votes.length;
    return {
      count: votes.length,
      avg,
      min,
      max,
      consensus,
      distribution: [...distribution.entries()].sort(
        (a, b) => b[1] - a[1] || (cardValue(a[0]) ?? 999) - (cardValue(b[0]) ?? 999),
      ),
    };
  });

  /** Raum aus der URL lesen: …/#/mein-raum */
  readRoomFromUrl(): void {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, '')).trim();
    const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
    this.room.set(clean || DEFAULT_ROOM);
  }

  async join(name: string, spectator: boolean): Promise<void> {
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed) return;
    this.name.set(trimmed);
    this.spectator.set(spectator);
    safeSet(NAME_KEY, trimmed);
    safeSet(SPECTATOR_KEY, spectator ? '1' : '0');
    if (spectator) this.myVote.set(null);

    if (this.channel) {
      this.publish();
      return;
    }

    this.status.set('connecting');
    this.supabase ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const channel = this.supabase.channel(`poker:${this.room()}`, {
      config: { presence: { key: this.myId }, broadcast: { self: false } },
    });
    this.channel = channel;

    // Presence: nur "wer ist gerade online".
    channel.on('presence', { event: 'sync' }, () => {
      this.online.set(new Set(Object.keys(channel.presenceState())));
    });
    // Broadcast: der eigentliche Zustand jedes Teilnehmers.
    channel.on('broadcast', { event: 'state' }, ({ payload }) => this.onState(payload as MemberState));
    channel.on('broadcast', { event: 'hello' }, () => this.publish(true));

    channel.subscribe((state) => {
      if (state === 'SUBSCRIBED') {
        this.status.set('online');
        void channel.track({ id: this.myId });
        void channel.send({ type: 'broadcast', event: 'hello', payload: {} });
        this.publish(true);
        clearInterval(this.heartbeat);
        // Regelmäßig den eigenen Stand wiederholen – heilt verlorene Nachrichten.
        this.heartbeat = setInterval(() => this.publish(true), 15_000);
      } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
        this.status.set('error');
      } else if (state === 'CLOSED' && this.channel === channel) {
        this.status.set('error');
      }
    });
  }

  async leave(): Promise<void> {
    const ch = this.channel;
    this.channel = null;
    clearInterval(this.heartbeat);
    this.states.set(new Map());
    this.online.set(new Set());
    this.myVote.set(null);
    this.status.set('offline');
    if (ch) {
      await ch.untrack().catch(() => undefined);
      await this.supabase?.removeChannel(ch);
    }
  }

  vote(card: string): void {
    if (this.spectator() || this.round().revealed) return;
    this.myVote.set(this.myVote() === card ? null : card);
    this.publish();
  }

  reveal(): void {
    const r = this.round();
    if (r.revealed) return;
    this.round.set({ ...r, revealed: true, at: Date.now() });
    this.publish();
  }

  newRound(): void {
    const r = this.round();
    this.myVote.set(null);
    this.round.set({ n: r.n + 1, revealed: false, topic: '', at: Date.now() });
    this.publish();
  }

  setTopic(topic: string): void {
    const t = topic.slice(0, 120);
    const r = this.round();
    if (t === r.topic) return;
    this.round.set({ ...r, topic: t, at: Date.now() });
    this.publish();
  }

  private onState(p: MemberState): void {
    if (!p?.id || p.id === this.myId || !p.round) return;
    this.states.update((m) => new Map(m).set(p.id, p));

    const mine = this.round();
    const best = newerRound(mine, p.round);
    if (!sameRound(best, mine)) {
      if (best.n > mine.n) this.myVote.set(null);
      this.round.set(best);
    }
    // Ggf. unsere Karte nach dem Aufdecken nachreichen o. Ä.
    this.publish();
  }

  /** Eigenen Zustand an alle senden (nur wenn sich etwas geändert hat, außer force). */
  private publish(force = false): void {
    const ch = this.channel;
    if (!ch || this.status() !== 'online') return;
    const round = this.round();
    const payload: MemberState = {
      id: this.myId,
      name: this.name(),
      spectator: this.spectator(),
      voted: this.myVote() !== null,
      vote: round.revealed ? this.myVote() : null,
      round,
    };
    const json = JSON.stringify(payload);
    if (!force && json === this.lastSent) return;
    this.lastSent = json;
    void ch.send({ type: 'broadcast', event: 'state', payload });
  }
}
