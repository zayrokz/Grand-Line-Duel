import type { Ref } from 'react';
import type { TokenColor } from '@gld/engine';
import { RESOURCES } from '../theme';
import { Chip } from './Token';

interface Props {
  board: (TokenColor | null)[];
  selectable: ReadonlySet<number>;
  selected: ReadonlySet<number>;
  onCell: (cell: number) => void;
  /** Cases dont le jeton est encore « en vol » depuis le sac (affiché à l'atterrissage). */
  hidden?: ReadonlySet<number>;
  ref?: Ref<HTMLDivElement>;
}

/** Plateau 5×5 de jetons. Seules les cases jouables sont activables. */
export function Board({ board, selectable, selected, onCell, hidden, ref }: Props) {
  // Quand le joueur choisit des jetons, ceux qu'il ne peut pas prendre s'estompent.
  const interactive = selectable.size > 0 || selected.size > 0;
  return (
    <div
      ref={ref}
      className="board"
      role="grid"
      aria-label="Plateau de ressources"
      data-interactive={interactive}
    >
      {board.map((token, cell) => {
        const canSelect = selectable.has(cell);
        const isSelected = selected.has(cell);
        const label = token ? RESOURCES[token].name : 'case vide';
        return (
          <button
            key={cell}
            type="button"
            role="gridcell"
            className="cell"
            data-cell={cell}
            data-selectable={canSelect}
            data-selected={isSelected}
            disabled={!canSelect && !isSelected}
            aria-pressed={isSelected}
            aria-label={`Ligne ${Math.floor(cell / 5) + 1}, colonne ${(cell % 5) + 1} : ${label}`}
            onClick={() => onCell(cell)}
          >
            {token && !hidden?.has(cell) && (
              <span key={`${cell}-${token}`} className="cell-token">
                <Chip color={token} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
