import { readFileSync, writeFileSync } from 'node:fs';
import { onRequestGet } from '../functions/p/[id].js';

const id = process.argv[2];
const outFile = process.argv[3];

if (!id || !outFile) {
  process.stderr.write('Uso: node scripts/serve-product.mjs <id> <arquivo_saida>\n');
  process.exit(1);
}

const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));

globalThis.fetch = async () => ({ ok: true, async json() { return config; } });

const res = await onRequestGet({
  request: { url: 'https://filz.com.br/p/' + id },
  env: {},
  params: { id }
});
const html = await res.text();

if (res.status !== 200) {
  process.stderr.write('Erro ao renderizar /p/' + id + ': ' + res.status + ' ' + html.slice(0, 120) + '\n');
  process.exit(1);
}

writeFileSync(outFile, html, 'utf8');
console.error('[serve-product] /p/' + id + ' renderizado com sucesso');
