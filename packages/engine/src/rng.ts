/**
 * Générateur pseudo-aléatoire mulberry32 : état sur 32 bits, sérialisable dans Firestore.
 * Les fonctions sont pures : elles renvoient la valeur tirée et le nouvel état.
 */
export function nextRandom(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Mélange de Fisher-Yates déterministe. */
export function shuffle<T>(items: readonly T[], state: number): [shuffled: T[], next: number] {
  const result = [...items];
  let rng = state >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(rng);
    rng = next;
    const j = Math.floor(r * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return [result, rng];
}
