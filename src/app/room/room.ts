import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DECK } from '../config';
import { Panda, PandaMood } from '../panda/panda';
import { PokerService } from '../poker.service';

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Panda],
  styleUrl: './room.scss',
  templateUrl: './room.html',
})
export class Room implements OnDestroy {
  protected readonly poker = inject(PokerService);
  protected readonly deck = DECK;
  protected readonly copied = signal(false);
  protected readonly leaves = Array.from({ length: 22 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 13) % 10) / 10,
    duration: 2.2 + ((i * 7) % 10) / 6,
    size: 14 + ((i * 11) % 14),
  }));

  private topicTimer: ReturnType<typeof setTimeout> | undefined;
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly mood = computed<PandaMood>(() => {
    const r = this.poker.round();
    if (r.revealed) return this.poker.result().consensus ? 'happy' : 'reveal';
    return this.poker.votedCount() > 0 ? 'waiting' : 'idle';
  });

  protected readonly statusText = computed(() => {
    const voters = this.poker.voters().length;
    const voted = this.poker.votedCount();
    if (this.poker.round().revealed) {
      return this.poker.result().consensus ? 'Alle sind sich einig! 🎉' : 'Karten liegen auf dem Tisch';
    }
    if (voters === 0) return 'Noch niemand schätzt mit';
    if (voted === 0) return 'Wählt eure Karten …';
    if (voted === voters) return 'Alle haben gewählt – aufdecken!';
    return `${voted} von ${voters} haben gewählt`;
  });

  /** Für Hervorhebung von niedrigster/höchster Karte. */
  protected extreme(vote: string | null): 'min' | 'max' | null {
    const res = this.poker.result();
    if (!this.poker.round().revealed || vote === null || res.min === res.max) return null;
    const v = vote === '½' ? 0.5 : Number(vote);
    if (v === res.min) return 'min';
    if (v === res.max) return 'max';
    return null;
  }

  protected barWidth(count: number): number {
    return Math.round((count / Math.max(1, this.poker.result().count)) * 100);
  }

  protected formatAvg(avg: number | null): string {
    return avg === null ? '–' : avg.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  }

  protected onTopicInput(value: string): void {
    clearTimeout(this.topicTimer);
    this.topicTimer = setTimeout(() => this.poker.setTopic(value), 400);
  }

  protected onTopicCommit(value: string): void {
    clearTimeout(this.topicTimer);
    this.poker.setTopic(value);
  }

  protected toggleSpectator(): void {
    void this.poker.join(this.poker.name(), !this.poker.spectator());
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(location.href);
      this.copied.set(true);
      clearTimeout(this.copiedTimer);
      this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
    } catch {
      prompt('Link zum Teilen:', location.href);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.topicTimer);
    clearTimeout(this.copiedTimer);
  }
}
