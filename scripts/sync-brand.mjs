/**
 * Espalha a marca de `@aguiar/brand` para os consumidores que NÃO conseguem
 * importar TypeScript, e vigia os que ninguém consegue gerar.
 *
 *     pnpm brand:sync          escreve os arquivos gerados e confere os assets
 *     pnpm brand:check         só confere; não escreve nada (sai 1 se divergir)
 *
 * ┌─ POR QUE ESTE SCRIPT EXISTE ────────────────────────────────────────────┐
 * │ `packages/brand/src/index.ts` é a fonte da verdade da identidade. Três  │
 * │ tipos de consumidor não conseguem lê-la:                                │
 * │                                                                          │
 * │  1. CSS. Um `globals.css` não importa TS. → geramos `brand.css`, que os │
 * │     dois portais e o site importam e do qual derivam seus tokens.       │
 * │  2. O `app.json` do Expo. É JSON estático, lido pelo EAS sem avaliar    │
 * │     JavaScript — por isso ele CONTINUA JSON, e é remendado aqui, em vez │
 * │     de virar um `app.config.ts` que importaria a marca. Um `.ts` de     │
 * │     config não consegue `require` de um pacote publicado como TS puro:  │
 * │     o Node cairia no arquivo `.ts` do pacote em tempo de execução.      │
 * │  3. Os ARQUIVOS DE ARTE — os SVGs de ícone, o `offline.html`, os PNGs.  │
 * │     Esses ninguém gera: a cor está dentro do desenho, e qual traço é a  │
 * │     marca e qual é o fundo não se descobre por regex. Aqui eles são     │
 * │     CONFERIDOS — cada um declara quais valores da marca tem que conter, │
 * │     e o script falha nomeando o que sumiu. Trocar continua sendo        │
 * │     trabalho de mão; ESQUECER, não.                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { BRAND } from "../packages/brand/src/index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");

const problems = [];
const written = [];

const path = (p) => resolve(ROOT, p);
const show = (p) => relative(ROOT, p);

/**
 * Escreve um arquivo gerado — ou, em `--check`, só reclama se ele estiver
 * desatualizado. É o que permite rodar o mesmo script no CI e num hook.
 */
function emit(file, content) {
  const target = path(file);
  const current = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
  if (current === content) return;

  if (CHECK_ONLY) {
    problems.push(`${show(target)} está desatualizado — rode \`pnpm brand:sync\``);
    return;
  }
  writeFileSync(target, content, "utf8");
  written.push(show(target));
}

/* ---------------------------------------------------------------------------
   1. `packages/ui/src/brand.css` — a marca como variáveis CSS.

   Só a identidade, num `:root` e sem tema: quem tem tema (os portais) mapeia
   estes nomes para os seus próprios em `tokens.css`, e quem não tem (o site)
   aponta direto. Nenhuma superfície mora aqui — ver o cabeçalho do pacote.
--------------------------------------------------------------------------- */

/** `#1b9abd` → `27, 154, 189`, para quem precisa da marca COM ALFA. */
const rgbOf = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

const CSS_VARS = [
  ["A marca", null],
  ["--brand", BRAND.primary],
  [
    // `color-mix()` seria o jeito moderno, e é o que `accent.css` usa. Aqui
    // não serve: o Lightning CSS, que compila o CSS dos apps, emite um
    // fallback `@supports` cujo valor é a cor CHAPADA — um halo de 28% viraria
    // um borrão azul sólido em qualquer navegador anterior a 2023. Os canais
    // separados não têm essa armadilha e funcionam em tudo.
    "--brand-rgb",
    rgbOf(BRAND.primary),
  ],
  ["--brand-ink", BRAND.ink],
  ["--brand-lifted", BRAND.lifted],
  ["--brand-text", BRAND.text],
  ["--brand-hi", BRAND.hi],
  ["--brand-bright", BRAND.bright],
  ["--brand-soft", BRAND.soft],
  ["--brand-petrol", BRAND.petrol],
  ["Estados, sobre fundo claro", null],
  ["--pos", BRAND.pos],
  ["--pos-soft", BRAND.posSoft],
  ["--warn", BRAND.warn],
  ["--warn-soft", BRAND.warnSoft],
  ["--danger", BRAND.danger],
  ["--danger-soft", BRAND.dangerSoft],
  ["Estados, sobre fundo escuro — quem tem tema escuro aponta para estes", null],
  ["--pos-dark", BRAND.posDark],
  ["--warn-dark", BRAND.warnDark],
  ["--danger-dark", BRAND.dangerDark],
];

const brandCss = `/* ---------------------------------------------------------------------------
   A MARCA — ARQUIVO GERADO. NÃO EDITE.

   Sai de \`packages/brand/src/index.ts\` por \`pnpm brand:sync\`. Editar aqui é
   perder a edição no próximo sync, e pior: é criar um segundo lugar onde a
   marca está escrita, que é exatamente o que este arquivo existe para acabar.

   O QUE ELE TEM: a identidade e nada mais — o azul da marca em cada
   luminosidade, o petrol e as três cores de estado. Sem superfície, sem borda,
   sem cinza, sem tema. Cada produto mapeia estes nomes para o vocabulário dele:
   os portais em \`tokens.css\`, o site no \`globals.css\` dele.

   COMO ENTRA:  @import "@aguiar/ui/brand.css";
--------------------------------------------------------------------------- */

:root {
${CSS_VARS.map(([name, value]) =>
  value === null ? `  /* ${name} */` : `  ${name}: ${value};`,
)
  .join("\n")
  .replace(/\n  \/\*/g, "\n\n  /*")
  .replace(/^\n\n/, "")}
}
`;

emit("packages/ui/src/brand.css", brandCss);

/* ---------------------------------------------------------------------------
   2. `apps/mobile/app.json` — o petrol do splash e do ícone adaptativo.

   Três campos, no mesmo arquivo, que precisam ser o mesmo valor: o fundo do
   splash, o fundo do splash no modo escuro e o fundo do ícone adaptativo do
   Android. Eram três literais escritos à mão; agora saem daqui.

   O JSON é reescrito campo a campo, e não regerado: `app.json` tem muita coisa
   que não é cor, e um arquivo de configuração do Expo não é lugar de conteúdo
   gerado por nós.
--------------------------------------------------------------------------- */

const APP_JSON = path("apps/mobile/app.json");
const appJsonRaw = readFileSync(APP_JSON, "utf8");

/**
 * Só as ocorrências de `"backgroundColor": "<hex>"`. É o único campo de cor do
 * arquivo; se um dia houver outro, ele entra aqui explicitamente em vez de a
 * regex ficar mais esperta.
 */
const appJsonNext = appJsonRaw.replace(
  /("backgroundColor"\s*:\s*")#[0-9a-fA-F]{3,8}(")/g,
  `$1${BRAND.ink.toUpperCase()}$2`,
);

if (appJsonNext !== appJsonRaw) {
  if (CHECK_ONLY) {
    problems.push(`${show(APP_JSON)} está desatualizado — rode \`pnpm brand:sync\``);
  } else {
    writeFileSync(APP_JSON, appJsonNext, "utf8");
    written.push(show(APP_JSON));
  }
}

/* ---------------------------------------------------------------------------
   3. Os arquivos que ninguém gera — CONFERIDOS, nunca reescritos.

   Sobram três tipos de arquivo em que a marca está escrita e de onde não dá
   para tirá-la: os SVGs de ícone (a cor está dentro do desenho), o
   `offline.html` (uma página solta, servida pelo service worker sem o bundle
   do Next, que por isso copia a paleta à mão) e os PNGs de ícone (binários).

   A pergunta que se faz aqui é de PRESENÇA, não de ausência: cada arquivo
   declara quais valores da marca ele TEM que conter, e o script falha se algum
   sumiu. É o corte certo — trocar `primary` faz falhar, na hora, todo arquivo
   de arte que ainda está no azul velho.

   O que não dá para fazer é o contrário, procurar hex "errado": a paleta
   inteira dos produtos é lavagem do petrol da marca, então praticamente todo
   cinza do sistema cai na mesma família de matiz que ela. Uma varredura por
   família acusaria a borda de um card como se fosse a marca desbotada.
--------------------------------------------------------------------------- */

const ART = [
  { file: "apps/portal-client/public/icons/icon.svg", expects: ["primary", "ink"] },
  { file: "apps/portal-client/public/icons/icon-maskable.svg", expects: ["primary", "ink"] },
  { file: "apps/portal-client/public/icons/apple-icon.svg", expects: ["primary", "ink"] },
  {
    /**
     * A última tela do portal. Ela copia a paleta à mão porque não carrega o
     * bundle do Next — é a única tela em que isso é aceitável, e a razão está
     * escrita no próprio arquivo. Estes são os tokens dela que SÃO a marca:
     * o destaque nos dois temas, o petrol, o âmbar do aviso.
     */
    file: "apps/portal-client/public/offline.html",
    expects: ["primary", "lifted", "ink", "petrol", "warn", "warnSoft", "warnDark"],
  },
];

/** Os binários. Ninguém os lê aqui; só se lembra de quem trocou a marca. */
const BY_HAND = [
  "apps/portal-client/public/icons/icon-192.png (e -512, e as duas maskable)",
  "apps/portal-admin/public/images/icon.png (e icon-bg.png)",
  "apps/mobile/assets/icon.png (e splash-icon.png, adaptive-icon.png)",
  "apps/*/public/logo-email.png",
];

for (const { file, expects } of ART) {
  const target = path(file);
  const source = readFileSync(target, "utf8").toLowerCase();
  const missing = expects.filter((key) => !source.includes(BRAND[key].toLowerCase()));
  if (missing.length > 0) {
    problems.push(
      `${show(target)} não carrega mais ${missing
        .map((key) => `${key} (${BRAND[key]})`)
        .join(", ")}. ` + `A troca aqui é na mão — o arquivo não é gerado.`,
    );
  }
}

/* ------------------------------------------------------------------------- */

if (written.length > 0) {
  console.log(`marca atualizada em:\n${written.map((f) => `  ${f}`).join("\n")}`);
  console.log(
    "\nfalta na mão — os binários, que este script não lê:\n" +
      BY_HAND.map((f) => `  ${f}`).join("\n"),
  );
} else if (problems.length === 0) {
  console.log("marca em dia.");
}

if (problems.length > 0) {
  console.error(`\n${problems.map((p) => `  ✗ ${p}`).join("\n")}\n`);
  process.exit(1);
}
