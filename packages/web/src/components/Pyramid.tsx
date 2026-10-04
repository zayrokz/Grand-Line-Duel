import { LEVELS } from '@gld/engine';
import type { Level, PublicState } from '@gld/engine';
import { CardBack, CardView, EmptySlot } from './Cards';

interface Props {
  pub: PublicState;
  onCard: (cardId: string) => void;
  onDeck: (level: Level) => void;
  highlight?: ReadonlySet<string>;
}

/** Pyramide : paquets à gauche, 3 / 4 / 5 cartes visibles par niveau. */
export function Pyramid({ pub, onCard, onDeck, highlight }: Props) {
  return (
    <section className="pyramid" aria-label="Pyramide de cartes">
      {[...LEVELS].reverse().map((level) => (
        <div key={level} className={`pyramid-row pyramid-row-${level}`}>
          {pub.deckCounts[level] > 0 ? (
            <CardBack
              level={level}
              label={String(pub.deckCounts[level])}
              onClick={() => onDeck(level)}
            />
          ) : (
            <EmptySlot />
          )}
          {pub.pyramid[level].map((cardId, index) =>
            cardId ? (
              <CardView
                key={cardId}
                cardId={cardId}
                onClick={() => onCard(cardId)}
                highlight={highlight?.has(cardId)}
              />
            ) : (
              <EmptySlot key={`empty-${index}`} />
            ),
          )}
        </div>
      ))}
    </section>
  );
}
