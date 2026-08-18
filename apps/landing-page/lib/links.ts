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

/**
 * O DESTINO DE RESERVA das chamadas para ação.
 *
 * Os seis botões de "começar" não apontam mais para cá: eles abrem a conversa
 * no WhatsApp, com o número que vem do banco e uma primeira mensagem por dobra
 * (ver `lib/whatsapp.ts` e `COPY.cta.whatsapp`). Esta âncora é o que sobra
 * quando aquela leitura falha — build sem as variáveis de ambiente, banco fora
 * do ar no minuto do deploy —, e existe porque um botão que rola a página é
 * melhor que um botão que não faz nada.
 *
 * Quando o cadastro do portal do cliente estiver publicado, é aqui que a URL
 * dele entra, e aí a decisão passa a ser qual dos dois caminhos cada botão
 * segue.
 */
export const SIGNUP = `/#${CTA_ID}`;

/** As três páginas do rodapé. */
export const ABOUT = "/sobre";
export const CONTACT = "/contato";
export const TERMS = "/termos";

/**
 * O e-mail que o formulário de contato abre.
 *
 * ⚠️  PENDENTE: trocar pelo endereço de verdade. Enquanto for este, o botão
 * "Enviar" abre o app de e-mail com um destinatário que não existe.
 */
export const CONTACT_EMAIL = "contato@aguiarone.com.br";
