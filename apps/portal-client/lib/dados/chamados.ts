import type { AutorMensagem, Chamado, PerfilKey, StatusChamado } from "@/types/types";

export const SP_STATUS: Record<
  StatusChamado,
  { rotulo: string; bg: string; cor: string; ponto: string }
> = {
  aberto: {
    rotulo: "Aberto",
    bg: "var(--surface3)",
    cor: "var(--text2)",
    ponto: "var(--border2)",
  },
  andamento: {
    rotulo: "Em andamento",
    bg: "var(--accent-soft)",
    cor: "var(--accent)",
    ponto: "var(--accent)",
  },
  aguardando: {
    rotulo: "Aguardando você",
    bg: "var(--warn-soft)",
    cor: "var(--warn)",
    ponto: "var(--warn)",
  },
  resolvido: {
    rotulo: "Resolvido",
    bg: "var(--pos-soft)",
    cor: "var(--pos)",
    ponto: "var(--pos)",
  },
};

/** As quatro portas de entrada do chamado, com o exemplo que explica cada uma. */
export const SP_CATS: [string, string][] = [
  ["Dúvida", "Não sei como fazer algo no portal"],
  ["Problema técnico", "Algo travou, sumiu ou deu erro"],
  ["Financeiro", "Cobrança, plano ou nota fiscal"],
  ["Sugestão", "Uma ideia para melhorar o sistema"],
];

/** [autor, dias atrás, hora, texto, nome do anexo] */
type LinhaMsg = [AutorMensagem, number, string, string, string];

/** [protocolo, assunto, categoria, status, tem resposta não lida, mensagens] */
type LinhaChamado = [string, string, string, StatusChamado, boolean, LinhaMsg[]];

const SEED: Record<PerfilKey, LinhaChamado[]> = {
  petshop: [
    [
      "1084",
      "A impressora não imprime o comprovante depois da venda",
      "Problema técnico",
      "aguardando",
      true,
      [
        [
          "cliente",
          4,
          "09:12",
          'Depois da última atualização, quando eu finalizo a venda aparece "erro ao imprimir" e o comprovante não sai. Pelo computador a impressora imprime normal. Mandei o print do erro.',
          "erro-impressao.png",
        ],
        [
          "suporte",
          4,
          "11:40",
          'Oi, Marcela! Recebi o print, obrigado. Esse aviso costuma vir do driver da impressora térmica. Você pode conferir em Configurações › Preferências se "Imprimir comprovante" está ligado e me dizer o modelo da impressora?',
          "",
        ],
        [
          "cliente",
          3,
          "08:05",
          "Está ligado sim. A impressora é uma Elgin i9, comprada no ano passado.",
          "",
        ],
        [
          "suporte",
          1,
          "16:22",
          "Perfeito, obrigado. Conseguimos reproduzir o erro aqui com a i9 e a correção entra na atualização desta semana. Enquanto isso dá para reimprimir pelo histórico de vendas, no menu do lado direito de cada venda.\n\nVocê consegue testar por aí e me confirmar se sai o comprovante?",
          "",
        ],
      ],
    ],
    [
      "1079",
      "Como cadastrar banho com preço diferente por porte?",
      "Dúvida",
      "andamento",
      false,
      [
        [
          "cliente",
          6,
          "14:31",
          'Hoje eu tenho só um item "Banho" no catálogo, mas cobro valores diferentes para cão pequeno, médio e grande. Qual é o jeito certo de deixar isso no sistema?',
          "",
        ],
        [
          "suporte",
          5,
          "10:08",
          'Boa pergunta. Hoje o caminho é cadastrar três produtos do tipo serviço — "Banho P", "Banho M" e "Banho G" — cada um com o seu preço, e marcar os três como favoritos para aparecerem primeiro no PDV. Assim o relatório também separa quanto cada porte rendeu.',
          "",
        ],
        [
          "cliente",
          5,
          "17:45",
          "Entendi, fiz assim e funcionou. Vocês pretendem ter variação de preço dentro do mesmo produto?",
          "",
        ],
        [
          "suporte",
          4,
          "09:20",
          "Está no nosso mapa para o segundo semestre. Vou deixar este chamado aberto e te aviso por aqui quando entrar.",
          "",
        ],
      ],
    ],
    [
      "1071",
      "Cobrança de julho veio com valor diferente do plano",
      "Financeiro",
      "aberto",
      false,
      [
        [
          "cliente",
          0,
          "08:40",
          "O boleto deste mês veio R$ 39 mais caro do que o combinado quando eu assinei. Podem conferir, por favor? Não mudei nada no plano.",
          "boleto-julho.png",
        ],
      ],
    ],
    [
      "1058",
      "Sugestão: lembrete de retorno do banho",
      "Sugestão",
      "resolvido",
      false,
      [
        [
          "cliente",
          14,
          "19:02",
          "Seria muito útil o sistema avisar quando um cliente está há mais de 30 dias sem trazer o pet para banho. Hoje eu controlo isso num caderno.",
          "",
        ],
        [
          "suporte",
          13,
          "11:15",
          "Adorei a ideia, registrei junto com o time de produto. Ainda não temos data, mas ela entrou na lista de candidatas do módulo de clientes.",
          "",
        ],
        ["sistema", 12, "09:00", "Chamado marcado como resolvido pelo suporte.", ""],
      ],
    ],
    [
      "1046",
      "Erro ao fechar o caixa com sangria no mesmo dia",
      "Problema técnico",
      "resolvido",
      false,
      [
        [
          "cliente",
          22,
          "18:55",
          "Quando eu registro uma sangria e depois fecho o caixa, o valor esperado em dinheiro fica errado — ele não desconta a retirada.",
          "",
        ],
        [
          "suporte",
          21,
          "10:30",
          "Confirmado, era um erro nosso no cálculo do esperado. A correção foi publicada hoje de manhã. Pode fechar o caixa normalmente que o valor já sai certo.",
          "",
        ],
        ["cliente", 21, "18:20", "Fechei agora e bateu certinho. Obrigada pela rapidez!", ""],
        ["sistema", 21, "18:21", "Chamado marcado como resolvido por você.", ""],
      ],
    ],
  ],
  acaraje: [
    [
      "1081",
      "Quero mudar o nome do negócio no comprovante",
      "Dúvida",
      "aguardando",
      true,
      [
        [
          "cliente",
          2,
          "15:10",
          "No comprovante ainda aparece o nome antigo. Onde eu troco?",
          "",
        ],
        [
          "suporte",
          1,
          "09:35",
          'Oi, Dona Rita! É em Configurações › Dados do negócio, no campo "Nome do negócio". Depois de salvar, o próximo comprovante já sai com o nome novo. Consegue tentar por aí?',
          "",
        ],
      ],
    ],
    [
      "1074",
      "O total do dia não bate com o que anotei",
      "Problema técnico",
      "andamento",
      false,
      [
        [
          "cliente",
          5,
          "20:14",
          "Anotei R$ 620 no papel e o sistema mostrou R$ 585. Acho que faltou lançar duas vendas no fim da tarde.",
          "",
        ],
        [
          "suporte",
          4,
          "10:45",
          "Obrigado por avisar. Olhando o histórico do dia, a diferença bate com duas vendas estornadas às 17:40 — venda estornada sai do faturamento mas continua no histórico. Confere aí em Vendas se foram essas duas?",
          "",
        ],
      ],
    ],
  ],
};

export function mkChamados(perfil: PerfilKey): Chamado[] {
  return (SEED[perfil] || []).map((c) => ({
    id: c[0],
    assunto: c[1],
    categoria: c[2],
    status: c[3],
    naoLido: c[4],
    msgs: c[5].map((m) => ({ autor: m[0], d: m[1], hora: m[2], texto: m[3], anexo: m[4] })),
  }));
}

/** O próximo protocolo é o maior já usado + 1, para não repetir número. */
export function proximoProtocolo(chamados: Chamado[]): string {
  const maior = chamados.reduce((a, c) => Math.max(a, Number(c.id) || 0), 1000);
  return String(maior + 1);
}

/** Chamado resolvido é histórico: só volta a aceitar resposta se for reaberto. */
export function podeResponder(c: Chamado): boolean {
  return c.status !== "resolvido";
}
