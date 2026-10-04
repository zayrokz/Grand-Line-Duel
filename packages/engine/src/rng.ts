/**
 * Générateur pseudo-aléatoire déterministe et imprévisible : SHA-256 en mode compteur sur une
 * graine secrète de 256 bits tirée par le serveur (`valeur_i = SHA-256(graine ":" i)`).
 *
 * Pourquoi pas un simple PRNG 32 bits (mulberry32…) ? La pyramide et le plateau initiaux sont
 * publics : avec une graine de 32 bits, un joueur pourrait essayer les 2³² graines hors ligne,
 * retrouver celle de la partie et connaître l'ordre des paquets et des remplissages. Avec une
 * fonction de hachage cryptographique et 256 bits de graine, c'est impossible.
 *
 * L'implémentation est synchrone et sans dépendance (WebCrypto est asynchrone) pour que le
 * moteur reste pur et partagé entre le navigateur et Node.
 */

export interface RngState {
  /** Graine secrète (64 caractères hexadécimaux en production). */
  seed: string;
  /** Nombre de tirages déjà effectués. */
  counter: number;
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 (FIPS 180-4) d'une chaîne encodée en UTF-8. Renvoie les 8 mots de 32 bits. */
export function sha256Words(message: string): number[] {
  const data = new TextEncoder().encode(message);
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(data);
  bytes[data.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bitLength = data.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 2 ** 32));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const w = new Array<number>(64).fill(0);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t++) {
      const w15 = w[t - 15]!;
      const w2 = w[t - 2]!;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[t] = (w[t - 16]! + s0 + w[t - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let t = 0; t < 64; t++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + K[t]! + w[t]!) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    const add = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = (h[i]! + add[i]!) >>> 0;
  }
  return h;
}

export function sha256Hex(message: string): string {
  return sha256Words(message)
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

/** Tire un réel uniforme dans [0, 1) (53 bits) et renvoie le nouvel état. */
export function nextRandom(state: RngState): [value: number, next: RngState] {
  const [hi, lo] = sha256Words(`${state.seed}:${state.counter}`) as [number, number];
  const value = ((hi >>> 5) * 67108864 + (lo >>> 6)) / 9007199254740992;
  return [value, { seed: state.seed, counter: state.counter + 1 }];
}

/** Mélange de Fisher-Yates déterministe. */
export function shuffle<T>(items: readonly T[], state: RngState): [shuffled: T[], next: RngState] {
  const result = [...items];
  let rng = state;
  for (let i = result.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(rng);
    rng = next;
    const j = Math.floor(r * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return [result, rng];
}
