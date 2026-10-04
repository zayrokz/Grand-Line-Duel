/**
 * Construit le paquet déployable `dist/` :
 * - `index.js` : bundle ESM (moteur et zod inclus) ; firebase-admin/functions restent externes ;
 * - `package.json` minimal, sans dépendance de workspace (Cloud Build ne saurait pas la résoudre) ;
 * - fichiers `.env*` éventuels (paramètres des Functions, ex. ALLOWED_ORIGINS).
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(out, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-admin/*', 'firebase-functions', 'firebase-functions/*'],
  logLevel: 'info',
});

const deps = Object.fromEntries(
  ['firebase-admin', 'firebase-functions'].map((name) => [name, pkg.dependencies[name]]),
);
writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'grand-line-duel-functions',
      private: true,
      type: 'module',
      main: 'index.js',
      engines: { node: '22' },
      dependencies: deps,
    },
    null,
    2,
  ) + '\n',
);

for (const file of readdirSync(root)) {
  if (file.startsWith('.env') && file !== '.env.example')
    copyFileSync(join(root, file), join(out, file));
}
