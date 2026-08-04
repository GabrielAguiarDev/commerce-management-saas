import "server-only";

import {
  lerCaixa,
  lerChamados,
  lerCustos,
  lerEquipe,
  lerMovsEstoque,
  lerNegocio,
  lerProdutos,
  lerVendas,
} from "@/lib/dados/leitura";
import { DADOS_VAZIOS } from "@/lib/estado";
import { exigirCliente } from "@/lib/sessao";
import type { DadosPortal } from "@/types/estado";

/**
 * O retrato completo do negócio, montado uma vez por navegação no layout.
 *
 * Fica no layout, e não em cada página, porque as telas precisam concordar
 * entre si: o "vendas de hoje" do topo e o do dashboard não podem sair de duas
 * leituras diferentes. E o menu depende dos módulos, que vêm daqui.
 *
 * As consultas são independentes e vão em paralelo — encadeá-las com um `await`
 * atrás do outro somaria todos os tempos de ida e volta. As duas exceções são
 * `lerCaixa`, que precisa das vendas para dizer quanto entrou em cada turno, e
 * `lerVendas`, que ela consome.
 */
export async function carregarPortal(): Promise<DadosPortal> {
  const sessao = await exigirCliente();

  // Sem sessão o middleware já redirecionou; chegar aqui significa ambiente sem
  // credenciais. A casca renderiza vazia em vez de estourar.
  if (!sessao.ok) return { ...DADOS_VAZIOS, erro: sessao.mensagem };

  const { supabase, tenantId, nome } = sessao;

  try {
    const [{ negocio, dados }, produtos, vendas, movs, custos, equipe, chamados] =
      await Promise.all([
        lerNegocio(supabase, tenantId, nome),
        lerProdutos(supabase),
        lerVendas(supabase),
        lerMovsEstoque(supabase),
        lerCustos(supabase),
        lerEquipe(supabase),
        lerChamados(supabase),
      ]);

    const caixa = await lerCaixa(supabase, vendas);

    return {
      negocio,
      dados,
      produtos,
      vendas,
      movs,
      custos,
      caixaAberto: caixa.aberto,
      caixasFechados: caixa.fechados,
      papeis: equipe.papeis,
      equipe: equipe.equipe,
      chamados,
      erro: null,
    };
  } catch (e) {
    // Uma tabela sem política de leitura devolve erro, não lista vazia. Dizer
    // "você não tem nada" seria mentira — a tela mostra o aviso.
    return {
      ...DADOS_VAZIOS,
      erro: e instanceof Error ? e.message : "Não foi possível carregar os dados do negócio.",
    };
  }
}
