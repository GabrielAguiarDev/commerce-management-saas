import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Botao } from '@components/ui/Botao';
import { Box } from '@components/ui/Box';
import { Campo } from '@components/ui/Campo';
import { Text } from '@components/ui/Text';
import { useRegistrarAjuste, useTurnoAberto } from '@domain/cash';
import { CaixaError } from '@domain/cash/cashTypes';
import { useRegistrarCusto } from '@domain/costs';
import { CustoError } from '@domain/costs/costsTypes';
import { lerQuantidadeMovimento, useRegistrarMovimentacao } from '@domain/stock';
import { EstoqueError } from '@domain/stock/stockTypes';
import { ERROS_CAIXA, ERROS_CUSTO, ERROS_ESTOQUE, TOASTS } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { lerCentavos } from '@utils/dinheiro';

/**
 * O sheet de DOIS CAMPOS, usado por quatro fluxos diferentes.
 *
 * No protótipo era um único bloco `sheetSimples` com os rótulos trocando por
 * `sheetTipo`. Mantivemos a ideia — o desenho é literalmente o mesmo — mas com
 * a configuração numa tabela (`CONFIGURACAO`) em vez de quatro ternários
 * aninhados, que era como o protótipo resolvia e é onde um rótulo errado passa
 * despercebido.
 */

type TipoSimples = 'sangria' | 'reforco' | 'movimento' | 'custo';

interface ConfiguracaoDoSheet {
  titulo: string;
  texto: string;
  rotulo1: string;
  placeholder1: string;
  rotulo2: string;
  placeholder2: string;
  botao: string;
  tecladoCampo1: 'decimal-pad' | 'default';
  tecladoCampo2: 'decimal-pad' | 'default' | 'numbers-and-punctuation';
}

const CONFIGURACAO: Record<TipoSimples, ConfiguracaoDoSheet> = {
  sangria: {
    titulo: 'Retirar dinheiro',
    texto: 'Retirada de dinheiro da gaveta. Fica registrado no turno.',
    rotulo1: 'Valor',
    placeholder1: 'R$ 0,00',
    rotulo2: 'Motivo',
    placeholder2: 'Ex: pagamento do gás',
    botao: 'Registrar retirada',
    tecladoCampo1: 'decimal-pad',
    tecladoCampo2: 'default',
  },
  reforco: {
    titulo: 'Colocar dinheiro',
    texto: 'Dinheiro colocado na gaveta para troco.',
    rotulo1: 'Valor',
    placeholder1: 'R$ 0,00',
    rotulo2: 'Motivo',
    placeholder2: 'Ex: pagamento do gás',
    botao: 'Registrar entrada',
    tecladoCampo1: 'decimal-pad',
    tecladoCampo2: 'default',
  },
  movimento: {
    titulo: 'Movimentar estoque',
    texto: 'Entradas viram custo variável automaticamente.',
    rotulo1: 'Produto',
    placeholder1: 'Ração premium 15kg',
    rotulo2: 'Quantidade (use − para saída)',
    placeholder2: '+10',
    botao: 'Salvar movimentação',
    tecladoCampo1: 'default',
    tecladoCampo2: 'numbers-and-punctuation',
  },
  custo: {
    titulo: 'Novo custo',
    texto: 'Custos fixos se repetem todo mês.',
    rotulo1: 'Nome do custo',
    placeholder1: 'Ex: aluguel',
    rotulo2: 'Valor',
    placeholder2: 'R$ 0,00',
    botao: 'Salvar custo',
    tecladoCampo1: 'default',
    tecladoCampo2: 'decimal-pad',
  },
};

interface SheetSimplesProps {
  tipo: TipoSimples;
  /** Pré-preenchimento do campo 1 (o "Movimentar" de um item de estoque). */
  valorInicial?: string;
  produtoId?: string;
}

export function SheetSimples({ tipo, valorInicial = '', produtoId }: SheetSimplesProps) {
  const conf = CONFIGURACAO[tipo];

  const fecharSheet = useUIStore((s) => s.fecharSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const { data: turno } = useTurnoAberto();
  const ajuste = useRegistrarAjuste();
  const movimentacao = useRegistrarMovimentacao();
  const custo = useRegistrarCusto();

  const [campo1, setCampo1] = useState(valorInicial);
  const [campo2, setCampo2] = useState('');

  const ocupado = ajuste.isPending || movimentacao.isPending || custo.isPending;

  function erroEmToast(erro: unknown) {
    if (erro instanceof CaixaError) return mostrarToast(ERROS_CAIXA[erro.codigo], { tom: 'erro' });
    if (erro instanceof EstoqueError)
      return mostrarToast(ERROS_ESTOQUE[erro.codigo], { tom: 'erro' });
    if (erro instanceof CustoError) return mostrarToast(ERROS_CUSTO[erro.codigo], { tom: 'erro' });
    return mostrarToast('Não deu para salvar agora.', { tom: 'erro' });
  }

  function confirmar() {
    const sucesso = (mensagem: string) => () => {
      fecharSheet();
      mostrarToast(mensagem);
    };

    if (tipo === 'sangria' || tipo === 'reforco') {
      if (!turno) return mostrarToast(ERROS_CAIXA.caixa_fechado, { tom: 'erro' });
      return ajuste.mutate(
        {
          turnoId: turno.id,
          tipo,
          valorCentavos: lerCentavos(campo1) ?? 0,
          motivo: campo2,
        },
        {
          onSuccess: sucesso(
            tipo === 'sangria' ? TOASTS.sangriaRegistrada : TOASTS.reforcoRegistrado,
          ),
          onError: erroEmToast,
        },
      );
    }

    if (tipo === 'movimento') {
      return movimentacao.mutate(
        {
          produtoId: produtoId ?? null,
          produtoNome: campo1,
          delta: lerQuantidadeMovimento(campo2) ?? 0,
        },
        { onSuccess: sucesso(TOASTS.estoqueAtualizado), onError: erroEmToast },
      );
    }

    return custo.mutate(
      { nome: campo1, valorCentavos: lerCentavos(campo2) ?? 0 },
      { onSuccess: sucesso(TOASTS.custoRegistrado), onError: erroEmToast },
    );
  }

  return (
    <BottomSheet titulo={conf.titulo} aoFechar={fecharSheet}>
      <Box gap="s13">
        <Text variant="bodyRelaxed" color="textMuted">
          {conf.texto}
        </Text>

        <Campo
          rotulo={conf.rotulo1}
          valor={campo1}
          aoMudar={setCampo1}
          placeholder={conf.placeholder1}
          keyboardType={conf.tecladoCampo1}
        />

        <Campo
          rotulo={conf.rotulo2}
          valor={campo2}
          aoMudar={setCampo2}
          placeholder={conf.placeholder2}
          keyboardType={conf.tecladoCampo2}
        />

        <Botao
          titulo={conf.botao}
          aoTocar={confirmar}
          altura={54}
          variantTexto="buttonMd"
          carregando={ocupado}
        />
      </Box>
    </BottomSheet>
  );
}
