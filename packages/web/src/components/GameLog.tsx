import type { LogEntry } from '@gld/engine';
import { logText } from '../text';

/** Journal des coups, le plus récent en haut. */
export function GameLog({ log, names }: { log: LogEntry[]; names: [string, string] }) {
  const lines = log
    .map((entry, index) => ({ index, text: logText(entry, names) }))
    .filter((line): line is { index: number; text: string } => line.text !== null)
    .reverse();
  return (
    <ol className="log" aria-label="Journal de la partie">
      {lines.map((line) => (
        <li key={line.index}>{line.text}</li>
      ))}
    </ol>
  );
}
