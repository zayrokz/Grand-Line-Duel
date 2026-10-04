import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-grand-line-duel';
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(
        fileURLToPath(new URL('../../../firestore.rules', import.meta.url)),
        'utf8',
      ),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), { nickname: 'Alice', currentGameId: 'g1' });
    await setDoc(doc(db, 'users/alice/history/g0'), { result: 'win' });
    await setDoc(doc(db, 'games/g1'), { status: 'playing', playerUids: ['alice', 'bob'] });
    await setDoc(doc(db, 'games/g1/private/alice'), { reserved: ['L1-01'] });
    await setDoc(doc(db, 'games/g1/private/bob'), { reserved: ['L3-02'] });
    await setDoc(doc(db, 'gameSecrets/g1'), { sec: { rng: 1 } });
    await setDoc(doc(db, 'roomCodes/ABCDEF'), { gameId: 'g1' });
    await setDoc(doc(db, 'rateLimits/alice'), { move: { count: 1 } });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('règles Firestore : lecture', () => {
  it('refuse toute lecture sans authentification', async () => {
    await assertFails(getDoc(doc(anon(), 'games/g1')));
    await assertFails(getDoc(doc(anon(), 'users/alice')));
  });

  it('profil et historique : propriétaire uniquement', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
    await assertFails(getDoc(doc(as('bob'), 'users/alice')));
    await assertSucceeds(getDocs(collection(as('alice'), 'users/alice/history')));
    await assertFails(getDocs(collection(as('bob'), 'users/alice/history')));
    await assertFails(getDocs(collection(as('alice'), 'users')));
  });

  it('partie : joueurs du salon uniquement', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'games/g1')));
    await assertSucceeds(getDoc(doc(as('bob'), 'games/g1')));
    await assertFails(getDoc(doc(as('mallory'), 'games/g1')));
    await assertSucceeds(
      getDocs(
        query(collection(as('alice'), 'games'), where('playerUids', 'array-contains', 'alice')),
      ),
    );
    await assertFails(getDocs(collection(as('mallory'), 'games')));
  });

  it('cartes réservées : chaque joueur ne lit que les siennes', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'games/g1/private/alice')));
    await assertFails(getDoc(doc(as('alice'), 'games/g1/private/bob')));
    await assertFails(getDocs(collection(as('alice'), 'games/g1/private')));
  });

  it('secrets, codes de salon et compteurs : jamais lisibles', async () => {
    await assertFails(getDoc(doc(as('alice'), 'gameSecrets/g1')));
    await assertFails(getDoc(doc(as('alice'), 'roomCodes/ABCDEF')));
    await assertFails(getDocs(collection(as('alice'), 'roomCodes')));
    await assertFails(getDoc(doc(as('alice'), 'rateLimits/alice')));
  });
});

describe('règles Firestore : écriture', () => {
  it('refuse toute écriture client, même sur ses propres documents', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'users/alice'), { nickname: 'Hack' }));
    await assertFails(updateDoc(doc(db, 'users/alice'), { 'stats.wins': 999 }));
    await assertFails(setDoc(doc(db, 'users/alice/history/x'), { result: 'win' }));
    await assertFails(updateDoc(doc(db, 'games/g1'), { status: 'finished' }));
    await assertFails(setDoc(doc(db, 'games/g2'), { playerUids: ['alice'] }));
    await assertFails(deleteDoc(doc(db, 'games/g1')));
    await assertFails(setDoc(doc(db, 'games/g1/private/alice'), { reserved: [] }));
    await assertFails(setDoc(doc(db, 'gameSecrets/g1'), { sec: {} }));
    await assertFails(setDoc(doc(db, 'roomCodes/ZZZZZZ'), { gameId: 'g1' }));
    await assertFails(setDoc(doc(db, 'rateLimits/alice'), {}));
    await assertFails(setDoc(doc(db, 'anything/else'), { a: 1 }));
  });
});
