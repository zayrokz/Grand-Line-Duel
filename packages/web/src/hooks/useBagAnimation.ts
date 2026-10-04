import { useEffect, useRef, useState } from 'react';
import { SPIRAL } from '@gld/engine';
import type { TokenColor } from '@gld/engine';
import { RESOURCES } from '../theme';

const EMPTY: ReadonlySet<number> = new Set();
const SHAKE_MS = 320;
const STAGGER_MS = 110;
const FLIGHT_MS = 650;
const CLOSE_DELAY_MS = 350;
const SCROLL_MS = 550;

interface Spill {
  /** Cases remplies, dans l'ordre de la spirale, avec la couleur du jeton posé. */
  tokens: { cell: number; color: TokenColor }[];
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animation du sac (pioche). Quand des cases vides se remplissent (remplissage du plateau, par
 * l'un ou l'autre joueur), le sac tremble, s'ouvre, et les jetons volent un par un vers leur case
 * dans l'ordre de la spirale, puis le sac se referme. Quand des jetons retournent dans le sac
 * (achat, défausse), il rebondit. Rien n'est animé au premier affichage.
 */
export function useBagAnimation(board: (TokenColor | null)[], bagCount: number) {
  const bagRef = useRef<HTMLButtonElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [previous, setPrevious] = useState({ board, bagCount });
  const [spill, setSpill] = useState<Spill | null>(null);
  const [landed, setLanded] = useState<ReadonlySet<number>>(EMPTY);
  const [bagOpen, setBagOpen] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);

  // Comparaison avec l'état précédent (mise à jour pendant le rendu, motif recommandé par React).
  if (previous.board !== board || previous.bagCount !== bagCount) {
    const filled = board.flatMap((token, cell) =>
      token !== null && previous.board[cell] === null ? [{ cell, color: token }] : [],
    );
    if (bagCount > previous.bagCount) setBounceKey((k) => k + 1);
    if (filled.length > 0 && !prefersReducedMotion()) {
      filled.sort((a, b) => SPIRAL.indexOf(a.cell) - SPIRAL.indexOf(b.cell));
      setSpill({ tokens: filled });
      setLanded(EMPTY);
    }
    setPrevious({ board, bagCount });
  }

  useEffect(() => {
    if (!spill) return undefined;
    const timers: number[] = [];
    const flyers: HTMLElement[] = [];
    const animations: Animation[] = [];
    const land = (cell: number) => setLanded((set) => new Set(set).add(cell));

    // Sur téléphone, le plateau peut être hors de l'écran : on l'amène en vue avant le vol.
    let scrollDelay = 0;
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (boardRect) {
      const visible = Math.min(boardRect.bottom, window.innerHeight) - Math.max(boardRect.top, 0);
      if (visible < boardRect.height * 0.6) {
        boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrollDelay = SCROLL_MS;
      }
    }

    timers.push(window.setTimeout(() => setBagOpen(true), SHAKE_MS + scrollDelay));
    spill.tokens.forEach(({ cell, color }, index) => {
      timers.push(
        window.setTimeout(
          () => {
            const bag = bagRef.current;
            const target = boardRef.current?.querySelector<HTMLElement>(`[data-cell="${cell}"]`);
            if (!bag || !target || typeof document.body.animate !== 'function') {
              land(cell);
              return;
            }
            const from = bag.getBoundingClientRect();
            const to = target.getBoundingClientRect();
            const size = to.width * 0.86;
            const start = {
              x: from.left + from.width / 2 - size / 2,
              y: from.top + from.height * 0.22 - size / 2,
            };
            const end = {
              x: to.left + to.width / 2 - size / 2,
              y: to.top + to.height / 2 - size / 2,
            };
            const peak = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 90 };
            // Même rendu que les jetons du plateau : disque en relief (voir .chip dans styles.css).
            const img = document.createElement('span');
            img.className = 'flying-token chip';
            img.style.setProperty('--chip', RESOURCES[color].color);
            img.style.setProperty('--size', `${size}px`);
            img.style.width = `${size}px`;
            img.style.height = `${size}px`;
            const face = document.createElement('img');
            face.src = RESOURCES[color].icon;
            face.alt = '';
            img.appendChild(face);
            document.body.appendChild(img);
            flyers.push(img);
            const animation = img.animate(
              [
                {
                  transform: `translate(${start.x}px, ${start.y}px) scale(0.25) rotate(-40deg)`,
                  opacity: 0,
                },
                {
                  transform: `translate(${start.x}px, ${start.y - 30}px) scale(0.7) rotate(-20deg)`,
                  opacity: 1,
                  offset: 0.15,
                },
                {
                  transform: `translate(${peak.x}px, ${peak.y}px) scale(1.15) rotate(120deg)`,
                  offset: 0.55,
                },
                {
                  transform: `translate(${end.x}px, ${end.y}px) scale(1) rotate(360deg)`,
                  opacity: 1,
                },
              ],
              { duration: FLIGHT_MS, easing: 'cubic-bezier(.25,.75,.35,1)', fill: 'forwards' },
            );
            animations.push(animation);
            animation.onfinish = () => {
              img.remove();
              land(cell);
            };
          },
          SHAKE_MS + scrollDelay + 60 + index * STAGGER_MS,
        ),
      );
    });
    const total =
      SHAKE_MS + scrollDelay + 60 + spill.tokens.length * STAGGER_MS + FLIGHT_MS + CLOSE_DELAY_MS;
    timers.push(
      window.setTimeout(() => {
        setBagOpen(false);
        setSpill(null);
      }, total),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      animations.forEach((a) => a.cancel());
      flyers.forEach((f) => f.remove());
    };
  }, [spill]);

  const hiddenCells: ReadonlySet<number> = spill
    ? new Set(spill.tokens.map((t) => t.cell).filter((cell) => !landed.has(cell)))
    : EMPTY;

  return {
    bagRef,
    boardRef,
    hiddenCells,
    bagOpen,
    shaking: spill !== null && !bagOpen,
    bounceKey,
  };
}
