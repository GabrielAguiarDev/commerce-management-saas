#!/usr/bin/env node
/**
 * Confere se o banco tem o que o código espera.
 *
 * POR QUE EXISTE: as migrations deste repositório são aplicadas à mão, no
 * editor SQL do Supabase, e não há `supabase migrate` para dizer o que já
 * rodou. Já aconteceu de uma migration ser dada como aplicada e não estar — e
 * o sintoma foi registrar venda parar de funcionar em produção, porque
 * `recordSale` grava uma coluna que aquela migration cria.
 *
 * Este script troca "acho que apliquei" por uma resposta.
 *
 * COMO FUNCIONA: só leitura, pela API REST, com a chave de serviço. Cada
 * verificação é uma pergunta que o banco responde por si — uma coluna é
 * consultada de verdade, uma função é chamada com argumentos vazios só para
 * ver se ela existe. Nada é gravado.
 *
 * O QUE ESTA API CONSEGUE PROVAR, E O QUE NÃO — as três formas aqui foram
 * escolhidas depois de duas darem falso negativo:
 *
 *   COLUNA  → `select=<coluna>`. Um 42703 vem do Postgres e prova a ausência.
 *             Um `insert` provaria menos: falha com PGRST204 tanto quando a
 *             coluna não existe quanto quando o cache de schema está velho.
 *
 *   FUNÇÃO  → a lista `/rpc/*` do OpenAPI. NÃO chame a função para testar: um
 *             POST com corpo `{}` devolve PGRST202 ("no matches ... without
 *             parameters") para toda função que tenha argumento obrigatório,
 *             e isso se parece exatamente com uma função que não existe.
 *
 *   CHECK   → NÃO DÁ. Esta versão do PostgREST não publica constraint em lugar
 *             nenhum — verificado contra `tenant_fiscal_settings.environment`,
 *             que tem CHECK desde a fase 1 do fiscal e também não aparece. Não
 *             há como confirmar por leitura, e provocar a violação exigiria
 *             gravar. O script imprime a consulta para rodar no editor SQL em
 *             vez de fingir uma resposta.
 *
 * USO:  node scripts/verificar-banco.mjs
 *       (lê apps/portal-admin/.env.local)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function lerEnv(caminho) {
  const out = {};
  for (const linha of readFileSync(join(raiz, caminho), 'utf8').split('\n')) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = lerEnv('apps/portal-admin/.env.local');
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !CHAVE) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em apps/portal-admin/.env.local');
  process.exit(2);
}

const headers = {
  apikey: CHAVE,
  Authorization: `Bearer ${CHAVE}`,
  'Content-Type': 'application/json',
};

/** A coluna existe? Consulta de verdade — 42703 é o Postgres dizendo que não. */
async function coluna(tabela, col) {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabela}?select=${col}&limit=1`, { headers });
  if (r.ok) return true;
  const corpo = await r.json().catch(() => ({}));
  if (corpo.code === '42703' || corpo.code === 'PGRST204') return false;
  return `? ${corpo.code ?? r.status}`;
}

/** A tabela existe? */
async function tabela(nome) {
  const r = await fetch(`${URL_BASE}/rest/v1/${nome}?select=*&limit=1`, { headers });
  if (r.ok) return true;
  const corpo = await r.json().catch(() => ({}));
  // 42P01 = relação inexistente; PGRST205 = PostgREST não a conhece.
  if (corpo.code === '42P01' || corpo.code === 'PGRST205' || r.status === 404) return false;
  return `? ${corpo.code ?? r.status}`;
}

/** Todas as funções publicadas, pelo OpenAPI. Ver a nota do cabeçalho. */
async function funcoesPublicadas() {
  const r = await fetch(`${URL_BASE}/rest/v1/`, { headers });
  const spec = await r.json();
  return new Set(
    Object.keys(spec.paths ?? {})
      .filter((p) => p.startsWith('/rpc/'))
      .map((p) => p.slice(5)),
  );
}

/** Os buckets, pela API de Storage — que é outro serviço, fora do PostgREST. */
async function buckets() {
  const r = await fetch(`${URL_BASE}/storage/v1/bucket`, { headers });
  if (!r.ok) return null;
  const lista = await r.json();
  return new Map(lista.map((b) => [b.id, b]));
}

const VERDE = '\x1b[32m', VERMELHO = '\x1b[31m', CINZA = '\x1b[90m', RESET = '\x1b[0m';
const marca = (ok) => (ok === true ? `${VERDE}✓${RESET}` : ok === false ? `${VERMELHO}✗${RESET}` : `${CINZA}${ok}${RESET}`);

let faltando = 0;
function linha(rotulo, ok) {
  if (ok !== true) faltando++;
  console.log(`  ${marca(ok)}  ${rotulo}`);
}

console.log(`\nBanco: ${URL_BASE}\n`);

const rpc = await funcoesPublicadas();
const bkt = await buckets();

console.log('20260817140000_fiscal_emissao.sql');
linha('sales.customer_document', await coluna('sales', 'customer_document'));
linha('sales.customer_name', await coluna('sales', 'customer_name'));
for (const f of ['create_sale', 'enqueue_fiscal_document', 'fiscal_document_payload', 'mark_fiscal_document']) {
  linha(`função ${f}`, rpc.has(f));
}

console.log('\n20260828010000_tenant_settings.sql');
linha('tabela tenant_settings', await tabela('tenant_settings'));
linha('profiles.ui_theme', await coluna('profiles', 'ui_theme'));

console.log('\n20260828020000_activity_log.sql');
linha('tabela activity_log', await tabela('activity_log'));
linha('função log_activity', rpc.has('log_activity'));

console.log('\n20260828030000_storage_buckets.sql');
linha('tenants.logo_path', await coluna('tenants', 'logo_path'));
if (bkt === null) {
  linha('buckets (API de Storage não respondeu)', '?');
} else {
  linha('bucket tenant-logos (público)', bkt.get('tenant-logos')?.public === true);
  linha('bucket support-attachments (privado)', bkt.get('support-attachments')?.public === false);
}

console.log(
  faltando === 0
    ? `\n${VERDE}Tudo que a API consegue provar está no lugar.${RESET}`
    : `\n${VERMELHO}${faltando} item(ns) faltando.${RESET} Rode a migration correspondente e passe de novo.`,
);

// Os CHECKs de 20260828000000 não têm como ser lidos daqui — ver o cabeçalho.
console.log(`
${CINZA}Os CHECKs de 20260828000000_state_column_checks.sql não são verificáveis
pela API REST. Para conferir, rode isto no editor SQL do Supabase:

  select conrelid::regclass as tabela, conname
    from pg_constraint
   where conname like '%_vocab_check'
   order by 1;

Esperado: 12 linhas. Se vierem menos, aquela migration parou no meio.${RESET}
`);

process.exit(faltando === 0 ? 0 : 1);
