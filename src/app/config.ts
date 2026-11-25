/**
 * Öffentliche Supabase-Konfiguration.
 *
 * Der Publishable Key ist dafür gedacht, im Browser zu stehen. Wir nutzen
 * ausschließlich Supabase Realtime (Presence + Broadcast) – es gibt keine Tabellen mit Daten.
 */
export const SUPABASE_URL = 'https://ecfkknlmrjrzkgwnxucq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_34q-VKLGAcx2Q7sf0POzjw_r_Ym7Qnb';

/** Raum, der ohne #/raum-id in der URL verwendet wird. */
export const DEFAULT_ROOM = 'team';

/** Fibonacci-Deck. */
export const DECK: readonly string[] = ['0', '½', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

/** Wandelt eine Karte in eine Zahl um (oder null für ? / ☕). */
export function cardValue(card: string): number | null {
  if (card === '½') return 0.5;
  const n = Number(card);
  return Number.isFinite(n) ? n : null;
}
