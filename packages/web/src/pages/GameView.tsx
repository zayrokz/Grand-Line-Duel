import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getLegalMoves } from '@gld/engine';
import type { GameDoc, Move, PlayerView, Seat } from '@gld/engine';
import { api, errorMessage } from '../api';
import { Board } from '../components/Board';
import { RoyalView } from '../components/Cards';
import { CardSheet } from '../components/CardSheet';
import type { SheetTarget } from '../components/CardSheet';
import { GameLog } from '../components/GameLog';
import { Modal } from '../components/Modal';
import { PendingPanel } from '../components/PendingPanel';
import { PlayerPanel } from '../components/PlayerPanel';
import { Pyramid } from '../components/Pyramid';
import { useToast } from '../components/Toast';
import { Treasure } from '../components/Treasure';
import { useMoveSender } from '../hooks/useMoveSender';
import { useNow } from '../hooks/useNow';
import { ICONS, RESOURCES, TERMS } from '../theme';
import { EndOverlay } from './EndOverlay';

type Mode =
  | { kind: 'idle' }
  | { kind: 'take'; cells: number[] }
  | { kind: 'privilege'; cells: number[] }
  | { kind: 'reserveGold'; target: SheetTarget };

const IDLE: Mode = { kind: 'idle' };
const sameCells = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length &&
  [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface Props {
  gameId: string;
  game: GameDoc;
  reserved: string[];
  uid: string;
}

export function GameView({ gameId, game, reserved, uid }: Props) {
  const toast = useToast();
  const now = useNow(1000);
  const pub = game.state!;
  const seat = game.playerUids.indexOf(uid) as Seat;
  const oppSeat: Seat = seat === 0 ? 1 : 0;
  const me = pub.players[seat];
  const opp = pub.players[oppSeat];
  const names: [string, string] = [
    game.players[0]?.nickname ?? 'Joueur 1',
    game.players[1]?.nickname ?? 'Joueur 2',
  ];
  const oppName = names[oppSeat];

  const view = useMemo<PlayerView>(() => ({ pub, seat, reserved }), [pub, seat, reserved]);
  const legal = useMemo(() => getLegalMoves(view), [view]);
  const playing = game.status === 'playing';
  const myTurn = playing && pub.current === seat && pub.winner === null;
  const head = pub.pending[0];
  const mainPhase = myTurn && !head;

  // L'état local de sélection est lié à une version : il se réinitialise à chaque nouveau coup.
  const [modeState, setModeState] = useState<{ version: number; mode: Mode }>({
    version: game.version,
    mode: IDLE,
  });
  const mode = modeState.version === game.version ? modeState.mode : IDLE;
  const setMode = (next: Mode) => setModeState({ version: game.version, mode: next });

  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [hideEnd, setHideEnd] = useState(false);

  const onError = useCallback((message: string) => toast(message), [toast]);
  const { send, busy } = useMoveSender(gameId, game.version, onError);
  const play = (move: Move) => {
    setSheet(null);
    void send(move);
  };

  /* ---------- Plateau : cases sélectionnables selon le contexte ---------- */
  const takeLines = useMemo(
    () => legal.flatMap((m) => (m.type === 'takeTokens' ? [m.cells] : [])),
    [legal],
  );
  let selectable = new Set<number>();
  let selected = new Set<number>();
  let onCell: (cell: number) => void = () => {};

  if (myTurn && head?.kind === 'token') {
    selectable = new Set(legal.flatMap((m) => (m.type === 'abilityToken' ? [m.cell] : [])));
    onCell = (cell) => play({ type: 'abilityToken', cell });
  } else if (mainPhase && mode.kind === 'reserveGold') {
    selectable = new Set(pub.board.flatMap((t, i) => (t === 'gold' ? [i] : [])));
    onCell = (goldCell) => reserveWith(mode.target, goldCell);
  } else if (mainPhase && mode.kind === 'privilege') {
    selected = new Set(mode.cells);
    selectable = new Set(
      pub.board.flatMap((t, i) =>
        t && t !== 'gold' && (selected.has(i) || selected.size < me.privileges) ? [i] : [],
      ),
    );
    onCell = (cell) =>
      setMode({
        kind: 'privilege',
        cells: selected.has(cell) ? mode.cells.filter((c) => c !== cell) : [...mode.cells, cell],
      });
  } else if (mainPhase) {
    const current = mode.kind === 'take' ? mode.cells : [];
    selected = new Set(current);
    selectable = new Set(
      pub.board.flatMap((_, cell) =>
        selected.has(cell) ||
        takeLines.some((line) => [...current, cell].every((c) => line.includes(c)))
          ? [cell]
          : [],
      ),
    );
    onCell = (cell) => {
      const cells = selected.has(cell) ? current.filter((c) => c !== cell) : [...current, cell];
      setMode(cells.length > 0 ? { kind: 'take', cells } : IDLE);
    };
  }

  /* ---------- Actions ---------- */
  function reserveWith(target: SheetTarget, goldCell: number) {
    play(
      target.kind === 'card'
        ? { type: 'reserve', goldCell, cardId: target.cardId }
        : { type: 'reserveDeck', goldCell, level: target.level },
    );
  }

  function startReserve(target: SheetTarget) {
    const golds = pub.board.flatMap((t, i) => (t === 'gold' ? [i] : []));
    setSheet(null);
    if (golds.length === 1) reserveWith(target, golds[0]!);
    else setMode({ kind: 'reserveGold', target });
  }

  const canUsePrivileges = legal.some((m) => m.type === 'usePrivileges');
  const canReplenish = legal.some((m) => m.type === 'replenish');
  const canPass = legal.some((m) => m.type === 'pass');
  const buyable = useMemo(
    () => new Set(legal.flatMap((m) => (m.type === 'buy' ? [m.cardId] : []))),
    [legal],
  );

  /* ---------- Délai de tour ---------- */
  const deadline = game.turnDeadline?.toMillis() ?? null;
  const remaining = deadline !== null ? deadline - now : null;
  const timer = playing && remaining !== null ? formatTime(remaining) : null;
  const canClaim = playing && !myTurn && remaining !== null && remaining <= 0;

  async function claim() {
    try {
      await api.claimTimeout({ gameId });
    } catch (error) {
      toast(errorMessage(error));
    }
  }

  async function leave() {
    setConfirmLeave(false);
    try {
      await api.leaveGame({ gameId });
    } catch (error) {
      toast(errorMessage(error));
    }
  }

  /* ---------- Barre d'action ---------- */
  let actionBar: ReactNode;
  if (!playing) {
    actionBar = <p className="hint">Partie terminée.</p>;
  } else if (head) {
    actionBar = (
      <PendingPanel
        pending={head}
        mine={myTurn}
        opponentName={oppName}
        legal={legal}
        me={me}
        opponent={opp}
        busy={busy}
        send={play}
      />
    );
  } else if (!myTurn) {
    actionBar = (
      <div className="action-row">
        <p className="hint">
          Tour de <strong>{oppName}</strong>
          {timer && ` · ${timer}`}
        </p>
        {canClaim && (
          <button className="danger" onClick={claim}>
            Réclamer la victoire (délai dépassé)
          </button>
        )}
      </div>
    );
  } else if (mode.kind === 'take') {
    const complete = takeLines.some((line) => sameCells(line, mode.cells));
    actionBar = (
      <div className="action-row">
        <button
          className="primary"
          disabled={!complete || busy}
          onClick={() => play({ type: 'takeTokens', cells: mode.cells })}
        >
          Prendre {mode.cells.length} jeton{mode.cells.length > 1 ? 's' : ''}
        </button>
        <button className="ghost" onClick={() => setMode(IDLE)}>
          Annuler
        </button>
        {!complete && <p className="hint">Les jetons doivent se suivre en ligne droite.</p>}
      </div>
    );
  } else if (mode.kind === 'privilege') {
    actionBar = (
      <div className="action-row">
        <button
          className="primary"
          disabled={mode.cells.length === 0 || busy}
          onClick={() => play({ type: 'usePrivileges', cells: mode.cells })}
        >
          Prendre {mode.cells.length}/{me.privileges} avec {TERMS.privilege}
        </button>
        <button className="ghost" onClick={() => setMode(IDLE)}>
          Annuler
        </button>
        <p className="hint">Choisis n’importe quels jetons (sauf {RESOURCES.gold.plural}).</p>
      </div>
    );
  } else if (mode.kind === 'reserveGold') {
    actionBar = (
      <div className="action-row">
        <p className="hint">Choisis le {RESOURCES.gold.name} à prendre sur le plateau.</p>
        <button className="ghost" onClick={() => setMode(IDLE)}>
          Annuler
        </button>
      </div>
    );
  } else {
    actionBar = (
      <div className="action-row">
        <p className="hint">
          <strong>À toi de jouer{timer && ` · ${timer}`}</strong> — touche des jetons à prendre ou
          une carte à recruter/réserver.
        </p>
        {canUsePrivileges && (
          <button className="secondary" onClick={() => setMode({ kind: 'privilege', cells: [] })}>
            <img src={ICONS.privilege} alt="" className="inline-icon" /> Utiliser {TERMS.privilege}{' '}
            ({me.privileges})
          </button>
        )}
        {canReplenish && (
          <button className="secondary" disabled={busy} onClick={() => play({ type: 'replenish' })}>
            Remplir le plateau ({pub.bagCount})
          </button>
        )}
        {canPass && (
          <button className="secondary" disabled={busy} onClick={() => play({ type: 'pass' })}>
            Passer
          </button>
        )}
      </div>
    );
  }

  const ended = game.status === 'finished' || game.status === 'abandoned';

  return (
    <div className="game">
      <header className="game-bar">
        <span className={`turn-indicator ${myTurn ? 'mine' : ''}`}>
          {ended ? 'Partie terminée' : myTurn ? 'À toi de jouer' : `Tour de ${oppName}`}
          {timer && !ended && <span className="timer"> {timer}</span>}
        </span>
        <span className="game-bar-actions">
          <button className="ghost small mobile-only" onClick={() => setShowLog(true)}>
            Journal
          </button>
          {playing && (
            <button className="ghost small" onClick={() => setConfirmLeave(true)}>
              Abandonner
            </button>
          )}
          {ended && hideEnd && (
            <button className="ghost small" onClick={() => setHideEnd(false)}>
              Résultat
            </button>
          )}
        </span>
      </header>

      <div className="game-grid">
        <div className="area-opp">
          <PlayerPanel
            info={game.players[oppSeat]}
            player={opp}
            active={playing && pub.current === oppSeat}
            isMe={false}
            timer={!myTurn ? timer : null}
          />
        </div>

        <div className="area-market">
          <Treasure player={me} />
          <div className="royals" aria-label={`${TERMS.royals} disponibles`}>
            {pub.royals.map((id) => (
              <RoyalView key={id} royalId={id} size="sm" />
            ))}
          </div>
          <div className="supply">
            <span title={`${TERMS.privileges} disponibles`}>
              <img src={ICONS.privilege} alt={TERMS.privileges} className="inline-icon" /> ×
              {pub.privileges}
            </span>
            <span title="Jetons dans le sac">👝 {pub.bagCount}</span>
          </div>
        </div>

        <div className="area-pyramid">
          <Pyramid
            pub={pub}
            highlight={mainPhase ? buyable : undefined}
            onCard={(cardId) => setSheet({ kind: 'card', cardId })}
            onDeck={(level) => setSheet({ kind: 'deck', level })}
          />
        </div>

        <div className="area-board">
          <Board board={pub.board} selectable={selectable} selected={selected} onCell={onCell} />
        </div>

        <div className="area-me">
          <PlayerPanel
            info={game.players[seat]}
            player={me}
            active={myTurn}
            isMe
            reserved={reserved}
            onReserved={(cardId) => setSheet({ kind: 'card', cardId })}
            timer={myTurn ? timer : null}
          />
        </div>

        <aside className="area-log desktop-only">
          <h3>Journal</h3>
          <GameLog log={pub.log} names={names} />
        </aside>
      </div>

      <div className={`action-bar ${myTurn ? 'my-turn' : ''}`} aria-busy={busy}>
        {actionBar}
      </div>

      {sheet && (
        <CardSheet
          target={sheet}
          view={view}
          canAct={mainPhase && !busy}
          legal={legal}
          onBuy={(cardId) => play({ type: 'buy', cardId })}
          onReserve={startReserve}
          onClose={() => setSheet(null)}
        />
      )}
      {showLog && (
        <Modal title="Journal de bord" onClose={() => setShowLog(false)}>
          <GameLog log={pub.log} names={names} />
        </Modal>
      )}
      {confirmLeave && (
        <Modal title="Abandonner la partie ?" onClose={() => setConfirmLeave(false)}>
          <p>L’abandon compte comme une défaite et donne la victoire à {oppName}.</p>
          <div className="action-row">
            <button className="danger" onClick={leave}>
              Abandonner
            </button>
            <button className="ghost" onClick={() => setConfirmLeave(false)}>
              Continuer à jouer
            </button>
          </div>
        </Modal>
      )}
      {ended && !hideEnd && (
        <EndOverlay
          gameId={gameId}
          game={game}
          seat={seat}
          uid={uid}
          onHide={() => setHideEnd(true)}
        />
      )}
    </div>
  );
}
