import type { TokenColor } from '@gld/engine';
import { RESOURCES } from '../theme';

interface Props {
  board: (TokenColor | null)[];
  selectable: ReadonlySet<number>;
  selected: ReadonlySet<number>;
  onCell: (cell: number) => void;
}

/** Plateau 5×5 de jetons. Seules les cases jouables sont activables. */
export function Board({ board, selectable, selected, onCell }: Props) {
  return (
    <div className="board" role="grid" aria-label="Plateau de ressources">
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
            data-selectable={canSelect}
            data-selected={isSelected}
            disabled={!canSelect && !isSelected}
            aria-pressed={isSelected}
            aria-label={`Ligne ${Math.floor(cell / 5) + 1}, colonne ${(cell % 5) + 1} : ${label}`}
            onClick={() => onCell(cell)}
          >
            {token && (
              <img
                key={`${cell}-${token}`}
                className="cell-token"
                src={RESOURCES[token].icon}
                alt=""
                draggable={false}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
