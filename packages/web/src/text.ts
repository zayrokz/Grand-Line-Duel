/** Textes de l'interface en français : erreurs, journal de partie, décisions. */
import { getCard, getRoyal, MAX_RESERVED, MAX_TOKENS } from '@gld/engine';
import type {
  ApiErrorReason,
  IllegalReason,
  LogEntry,
  Pending,
  Seat,
  TokenColor,
  TokenCounts,
} from '@gld/engine';
import { cardTheme, RESOURCES, royalTheme, TERMS, WIN_REASONS } from './theme';

export const ERROR_MESSAGES: Record<ApiErrorReason, string> = {
  'invalid-input': 'Requête invalide.',
  'invalid-nickname':
    'Pseudo invalide : 2 à 20 caractères (lettres, chiffres, espaces, tiret, apostrophe, point).',
  'invalid-avatar': 'Avatar invalide.',
  'invalid-code': 'Code de salon invalide : 6 caractères.',
  'rate-limited': 'Doucement, moussaillon ! Trop de tentatives, réessaie dans un instant.',
  'room-not-found': 'Salon introuvable. Vérifie le code.',
  'room-full': 'Ce salon est déjà complet.',
  'room-closed': 'Ce salon est fermé.',
  'already-in-game': 'Tu as déjà une partie en cours.',
  'opponent-busy': 'Ton adversaire est déjà dans une autre partie.',
  'not-a-player': 'Tu ne participes pas à cette partie.',
  'game-not-active': 'La partie n’est plus en cours.',
  'stale-version': 'Le plateau vient de changer, réessaie.',
  'not-your-turn': 'Ce n’est pas ton tour.',
  'illegal-move': 'Coup illégal.',
  'timeout-not-reached': 'Le délai de ton adversaire n’est pas encore écoulé.',
  'game-not-over': 'La partie n’est pas terminée.',
};

export const ILLEGAL_MESSAGES: Record<IllegalReason, string> = {
  'game-over': 'La partie est terminée.',
  'not-your-turn': 'Ce n’est pas ton tour.',
  'decision-pending': 'Termine d’abord la décision en cours.',
  'wrong-decision': 'Ce choix ne correspond pas à la décision attendue.',
  'privileges-unavailable': `Tu ne peux pas utiliser de ${TERMS.privilege} maintenant.`,
  'invalid-cells': 'Sélection de cases invalide.',
  'empty-cell': 'Une des cases est vide.',
  'gold-forbidden': `Interdit de prendre des ${RESOURCES.gold.plural} ainsi.`,
  'not-a-line': 'Les jetons doivent être adjacents et en ligne droite.',
  'already-replenished': 'Le plateau a déjà été rempli ce tour-ci.',
  'bag-empty': 'Le sac est vide.',
  'reserve-limit': `Tu as déjà ${MAX_RESERVED} cartes réservées.`,
  'gold-required': `Il faut un ${RESOURCES.gold.name} sur le plateau pour réserver.`,
  'card-unavailable': 'Cette carte n’est plus disponible.',
  'deck-empty': 'Ce paquet est vide.',
  'cannot-afford': 'Tu n’as pas assez de ressources.',
  'joker-needs-bonus': 'Il faut posséder une carte à bonus pour acheter une carte polyvalente.',
  'invalid-color': 'Couleur invalide.',
  'invalid-royal': `Cette ${TERMS.royal} n’est pas disponible.`,
  'invalid-discard': 'Nombre de jetons à rendre incorrect.',
  'pass-not-allowed': 'Tu as encore une action possible.',
};

export function tokenLabel(color: TokenColor, count = 1): string {
  const theme = RESOURCES[color];
  return `${count} ${count > 1 ? theme.plural : theme.name}`;
}

export function tokensText(tokens: TokenColor[] | Partial<TokenCounts>): string {
  const counts: Partial<Record<TokenColor, number>> = {};
  if (Array.isArray(tokens)) {
    for (const t of tokens) counts[t] = (counts[t] ?? 0) + 1;
  } else {
    Object.assign(counts, tokens);
  }
  const parts = (Object.entries(counts) as [TokenColor, number][])
    .filter(([, n]) => n > 0)
    .map(([color, n]) => tokenLabel(color, n));
  return parts.length > 0 ? parts.join(', ') : 'rien';
}

/** Phrase du journal. `names[seat]` est le pseudo affiché. */
export function logText(entry: LogEntry, names: [string, string]): string | null {
  const p = 'p' in entry ? names[entry.p] : '';
  const other = (seat: Seat) => names[seat === 0 ? 1 : 0];
  switch (entry.t) {
    case 'start':
      return `La partie commence : ${names[entry.first]} joue en premier.`;
    case 'turn':
      return entry.extra ? `${p} joue un tour supplémentaire.` : null;
    case 'privileges':
      return `${p} utilise ${entry.tokens.length} ${TERMS.privilege} : ${tokensText(entry.tokens)}.`;
    case 'replenish':
      return `${p} remplit le plateau (${entry.count} jeton${entry.count > 1 ? 's' : ''}).`;
    case 'take':
      return `${p} prend ${tokensText(entry.tokens)}.`;
    case 'gainPrivilege':
      return entry.from === 'supply'
        ? `${p} reçoit 1 ${TERMS.privilege}.`
        : `${p} prend 1 ${TERMS.privilege} à ${other(entry.p)}.`;
    case 'reserve':
      return `${p} réserve une carte de niveau ${entry.level} (${
        entry.from === 'deck' ? 'dessus du paquet' : 'pyramide'
      }).`;
    case 'buy':
      return `${p} recrute « ${cardTheme(getCard(entry.card)).name} »${
        entry.fromReserve ? ' (réservée)' : ''
      } pour ${tokensText(entry.paid)}.`;
    case 'joker':
      return `${p} associe « ${cardTheme(getCard(entry.card)).name} » à : ${RESOURCES[entry.color].plural}.`;
    case 'abilityToken':
      return `${p} se ravitaille : ${tokenLabel(entry.color)}.`;
    case 'steal':
      return `${p} vole ${tokenLabel(entry.color)} à ${other(entry.p)} !`;
    case 'royal':
      return `${p} obtient le soutien de « ${royalTheme(getRoyal(entry.royal)).name} ».`;
    case 'discard':
      return `${p} remet dans le sac : ${tokensText(entry.tokens)}.`;
    case 'pass':
      return `${p} passe son tour (aucune action possible).`;
    case 'end':
      return `🏆 ${names[entry.winner]} remporte la partie (${WIN_REASONS[entry.reason]}) !`;
  }
}

/** Consigne affichée pour la décision en attente. */
export function pendingPrompt(pending: Pending, mine: boolean, opponent: string): string {
  if (!mine) return `${opponent} fait un choix…`;
  switch (pending.kind) {
    case 'joker':
      return `Carte polyvalente : choisis la couleur de son bonus.`;
    case 'token':
      return `Ravitaillement : prends 1 ${RESOURCES[pending.color].name} sur le plateau.`;
    case 'steal':
      return `Abordage : choisis la ressource à voler à ${opponent}.`;
    case 'royal':
      return `Nouvelle ${TERMS.crown} ! Choisis une ${TERMS.royal}.`;
    case 'discard':
      return `Tu as plus de ${MAX_TOKENS} jetons : remets-en ${pending.count} dans le sac.`;
  }
}
