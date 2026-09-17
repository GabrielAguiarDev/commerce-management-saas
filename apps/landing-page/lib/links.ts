/**
 * Para onde a página leva.
 *
 * ┌─ ÂNCORA E ENDEREÇO SÃO DUAS COISAS, DESDE QUE EXISTEM SUBPÁGINAS ──────┐
 * │ Enquanto o site era uma página só, `"#planos"` servia às duas pontas:  │
 * │ era o `href` do menu e, sem o `#`, o `id` da dobra. Com `/sobre`,      │
 * │ `/contato` e `/termos` no ar isso quebra — o cabeçalho é o mesmo em    │
 * │ todas as páginas, e um `href="#planos"` dentro de `/contato` aponta    │
 * │ para uma dobra que não está ali.                                       │
 * │                                                                        │
 * │ Daí o par: `*_ID` é o nome da âncora (o que vira `id` da seção) e a    │
 * │ constante sem sufixo é o ENDEREÇO COMPLETO, com a barra na frente.     │
 * │ De qualquer página o link leva à home e pousa na dobra certa; estando  │
 * │ na home, o navegador só rola, sem recarregar nada.                     │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export const MODULES_ID = "modulos";
export const PLANS_ID = "planos";
export const HOW_ID = "como";
export const CTA_ID = "cta";

export const MODULES = `/#${MODULES_ID}`;
export const PLANS = `/#${PLANS_ID}`;
export const HOW = `/#${HOW_ID}`;

/** As três páginas do rodapé. */
export const ABOUT = "/sobre";
export const CONTACT = "/contato";
export const TERMS = "/termos";

/**
 * O DESTINO DE RESERVA das chamadas para ação.
 *
 * Os seis botões de "começar" não apontam mais para cá: eles abrem a conversa
 * no WhatsApp, com o número que vem do banco e uma primeira mensagem por dobra
 * (ver `lib/whatsapp.ts` e `COPY.cta.whatsapp`). Este é o caminho que sobra
 * quando aquela leitura falha — build sem as variáveis de ambiente, banco fora
 * do ar no minuto do deploy.
 *
 * É a página de CONTATO, e não mais a âncora `#cta`: a última dobra é ela
 * mesma um desses botões, e apontá-la para a própria âncora fazia o clique
 * não levar a lugar nenhum. O contato tem o e-mail, quando configurado, e
 * sempre diz ao visitante o que fazer quando nenhum canal carregou.
 *
 * Quando o cadastro do portal do cliente estiver publicado, é aqui que a URL
 * dele entra, e aí a decisão passa a ser qual dos dois caminhos cada botão
 * segue.
 */
export const SIGNUP = CONTACT;

/**
 * O e-mail que o formulário de contato abre, lido de `CONTACT_EMAIL`.
 *
 * NÃO HÁ ENDEREÇO FIXO NO CÓDIGO, de propósito. O que ficava aqui era um
 * exemplo publicado como se fosse real: o botão "Enviar" abria o app de e-mail
 * do visitante com um destinatário que não existe, e a mensagem sumia sem
 * ninguém saber. Sem a variável, devolve `null` e a página de contato esconde
 * o formulário e o bloco de e-mail em vez de prometer uma caixa que ninguém lê.
 *
 * Só o SERVIDOR chama isto (a página é renderizada no build), então a
 * variável fica sem o prefixo `NEXT_PUBLIC_`.
 */
export function contactEmail(): string | null {
  const v = process.env.CONTACT_EMAIL?.trim();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}
