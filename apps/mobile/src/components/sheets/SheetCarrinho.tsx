import { usePathname } from 'expo-router';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Botao } from '@components/ui/Botao';
import { Box } from '@components/ui/Box';
import { Divisor } from '@components/ui/Divisor';
import { Seletor } from '@components/ui/Seletor';
import { Text } from '@components/ui/Text';
import { Toque } from '@components/ui/Toque';
import { ROTAS } from '@domain/navigation/rotas';
import { subtotalCentavos, totalCentavos } from '@domain/sales/carrinho';
import { useFinalizarVenda } from '@domain/sales';
import { VendaError } from '@domain/sales/salesTypes';
import { irParaRaiz } from '@hooks/navegacao';
import { CONFIRMACOES, ERROS_VENDA, TOASTS } from '@i18n';
import { useCarrinhoStore } from '@store/carrinhoStore';
import { useConexaoStore } from '@store/conexaoStore';
import { formasAceitasAtivas, usePreferenciasStore } from '@store/preferenciasStore';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';

/**
 * "Sua venda": o sheet do carrinho.
 *
 * Concentra o fluxo que fecha a venda, e por isso é o único sheet que:
 *  - lê as formas de pagamento das Preferências (o que estiver desligado lá
 *    não aparece aqui);
 *  - dispara um toast com Desfazer que RESTAURA o carrinho e reabre este mesmo
 *    sheet — a rede de segurança do balconista que tocou em Finalizar sem
 *    querer.
 */
export function SheetCarrinho() {
  const caminho = usePathname();

  const itens = useCarrinhoStore((s) => s.itens);
  const formaPagamento = useCarrinhoStore((s) => s.formaPagamento);
  const definirForma = useCarrinhoStore((s) => s.definirFormaPagamento);
  const incrementar = useCarrinhoStore((s) => s.incrementar);
  const decrementar = useCarrinhoStore((s) => s.decrementar);
  const finalizarCarrinho = useCarrinhoStore((s) => s.finalizar);
  const cancelarCarrinho = useCarrinhoStore((s) => s.cancelar);
  const desfazerCarrinho = useCarrinhoStore((s) => s.desfazer);

  const formasAceitas = usePreferenciasStore((s) => s.formasAceitas);
  const online = useConexaoStore((s) => s.online);

  const abrirSheet = useUIStore((s) => s.abrirSheet);
  const fecharSheet = useUIStore((s) => s.fecharSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const pedirConfirmacao = useUIStore((s) => s.pedirConfirmacao);

  const { mutate: registrar, isPending } = useFinalizarVenda();

  const total = totalCentavos(itens);
  const opcoes = formasAceitasAtivas(formasAceitas).map((f) => ({ valor: f, rotulo: f }));

  // A forma guardada no carrinho pode ter sido DESLIGADA nas Preferências
  // depois de escolhida. Cair na primeira aceita evita finalizar com uma forma
  // que o negócio não aceita mais.
  const formaValida = opcoes.some((o) => o.valor === formaPagamento)
    ? formaPagamento
    : (opcoes[0]?.valor ?? '');

  function finalizar() {
    const totalDaVenda = total;
    const snapshot = itens;

    registrar(
      { itens: snapshot, formaPagamento: formaValida },
      {
        onSuccess: () => {
          finalizarCarrinho();
          fecharSheet();
          // Depois de fechar a venda o balconista quase sempre começa outra:
          // o protótipo leva de volta para Vender, e é o certo.
          if (caminho !== ROTAS.vender) irParaRaiz(ROTAS.vender);

          mostrarToast(
            online
              ? TOASTS.vendaRegistrada(formatarBRL(totalDaVenda))
              : TOASTS.vendaSalvaOffline(formatarBRL(totalDaVenda)),
            {
              comDesfazer: true,
              aoDesfazer: () => {
                desfazerCarrinho();
                abrirSheet({ tipo: 'carrinho' });
              },
            },
          );
        },
        onError: (erro) => {
          const codigo = erro instanceof VendaError ? erro.codigo : 'desconhecido';
          mostrarToast(ERROS_VENDA[codigo], { tom: 'erro' });
        },
      },
    );
  }

  function pedirCancelamento() {
    pedirConfirmacao({
      ...CONFIRMACOES.cancelarVenda,
      rotuloBotao: CONFIRMACOES.cancelarVenda.botao,
      destrutivo: true,
      aoConfirmar: () => {
        cancelarCarrinho();
        fecharSheet();
        mostrarToast(TOASTS.vendaCancelada);
      },
    });
  }

  return (
    <BottomSheet titulo="Sua venda" aoFechar={fecharSheet}>
      {itens.map((item) => (
        <Box key={item.produtoId}>
          <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s12">
            <Box flex={1} minWidth={0}>
              <Text variant="titleXs">{item.nome}</Text>
              <Text variant="captionSm" color="textMuted" marginTop="s3">
                {formatarBRL(item.precoUnitarioCentavos)} cada
              </Text>
            </Box>

            <Box flexDirection="row" alignItems="center" gap="s8">
              <BotaoPasso
                rotulo={`Diminuir ${item.nome}`}
                simbolo="−"
                aoTocar={() => decrementar(item.produtoId)}
              />
              <Box minWidth={22} alignItems="center">
                <Text variant="moneyMd">{item.quantidade}</Text>
              </Box>
              <BotaoPasso
                rotulo={`Aumentar ${item.nome}`}
                simbolo="+"
                aoTocar={() => incrementar(item.produtoId)}
              />
            </Box>

            <Box minWidth={74} alignItems="flex-end">
              <Text variant="moneyBase">{formatarBRL(subtotalCentavos(item))}</Text>
            </Box>
          </Box>
          <Divisor />
        </Box>
      ))}

      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingTop="s16"
        paddingBottom="s14"
      >
        <Text variant="rowLabel" color="textMuted" fontSize={14}>
          Total
        </Text>
        <Text variant="totalValue">{formatarBRL(total)}</Text>
      </Box>

      <Text variant="label" color="textMuted" marginBottom="s7">
        Forma de pagamento
      </Text>
      <Seletor
        valor={formaValida}
        opcoes={opcoes}
        aoSelecionar={definirForma}
        rotuloAcessivel="Forma de pagamento"
      />

      <Box marginTop="s14">
        <Botao
          titulo={`Finalizar venda · ${formatarBRL(total)}`}
          aoTocar={finalizar}
          altura={56}
          raio={17}
          variantTexto="buttonLg"
          carregando={isPending}
          desabilitado={itens.length === 0 || opcoes.length === 0}
        />
      </Box>

      <Box marginTop="s8">
        <Botao
          titulo="Cancelar venda"
          aoTocar={pedirCancelamento}
          variante="fantasma"
          altura={46}
          corDoTexto="danger"
          variantTexto="buttonXs"
        />
      </Box>
    </BottomSheet>
  );
}

function BotaoPasso({
  simbolo,
  rotulo,
  aoTocar,
}: {
  simbolo: string;
  rotulo: string;
  aoTocar: () => void;
}) {
  return (
    <Toque
      accessibilityLabel={rotulo}
      onPress={aoTocar}
      width={36}
      height={36}
      borderRadius="r12"
      borderWidth={1}
      borderColor="line"
      alignItems="center"
      justifyContent="center"
    >
      <Text variant="stepper">{simbolo}</Text>
    </Toque>
  );
}
