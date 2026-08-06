import { Botao, Box, Cartao, Divisor, Screen, Text, Toque } from '@components';
import { produtosComEstoque, resumoDeEstoque, useCatalogo } from '@domain/catalog';
import type { Produto, SituacaoEstoque } from '@domain/catalog';
import { useMovimentacoes } from '@domain/stock';
import { useUIStore } from '@store/uiStore';
import type { ThemeColor } from '@theme';

const COR_DA_SITUACAO: Record<SituacaoEstoque, ThemeColor> = {
  em_dia: 'success',
  baixo: 'warning',
  zerado: 'danger',
};

const PALAVRA_DA_SITUACAO: Record<SituacaoEstoque, string> = {
  em_dia: 'em dia',
  baixo: 'está baixo',
  zerado: 'zerado',
};

/**
 * Estoque.
 *
 * Os três contadores do topo são DERIVADOS do catálogo (`resumoDeEstoque`), não
 * lidos de um endpoint separado. O protótipo trazia 4/1/1 fixos; derivando, o
 * número continua sendo o mesmo e passa a acompanhar cada movimentação.
 */
export default function TelaEstoque() {
  const { data: produtos = [] } = useCatalogo();
  const { data: movimentos = [] } = useMovimentacoes();
  const abrirSheet = useUIStore((s) => s.abrirSheet);

  const comEstoque = produtosComEstoque(produtos);
  const resumo = resumoDeEstoque(produtos);

  return (
    <Screen titulo="Estoque" subtitulo="O que tem e o que está acabando">
      <Box flexDirection="row" gap="s10">
        <Contador rotulo="Em dia" valor={resumo.emDia} cor="success" />
        <Contador rotulo="Baixo" valor={resumo.baixo} cor="warning" />
        <Contador rotulo="Zerado" valor={resumo.zerado} cor="danger" />
      </Box>

      {comEstoque.map((produto) => (
        <LinhaDeEstoque
          key={produto.id}
          produto={produto}
          aoMovimentar={() =>
            abrirSheet({ tipo: 'movimento', produtoId: produto.id, produtoNome: produto.nome })
          }
        />
      ))}

      <Text variant="sectionLabel" color="textMuted" marginTop="s6">
        Últimas movimentações
      </Text>

      <Cartao paddingVertical="s4" paddingHorizontal="s16">
        {movimentos.map((m) => (
          <Box key={m.id}>
            <Box flexDirection="row" gap="s10" alignItems="center" paddingVertical="s12">
              <Box minWidth={44}>
                <Text variant="tinyBold" color={m.delta < 0 ? 'danger' : 'success'}>
                  {m.sinal}
                </Text>
              </Box>
              <Box flex={1} minWidth={0}>
                <Text variant="rowText">{m.produtoNome}</Text>
                <Text variant="hint" color="textMuted" marginTop="s2">
                  {m.origem}
                </Text>
              </Box>
              <Text variant="hint" color="textMuted">
                {m.quando}
              </Text>
            </Box>
            <Divisor />
          </Box>
        ))}
      </Cartao>

      <Botao
        titulo="+ Registrar movimentação"
        aoTocar={() => abrirSheet({ tipo: 'movimento' })}
        variante="tracejado"
        altura={52}
        raio={18}
        variantTexto="buttonSm"
      />
    </Screen>
  );
}

function Contador({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: ThemeColor }) {
  return (
    <Cartao flex={1} borderRadius="r18" padding="s14">
      <Text variant="hint" color="textMuted">
        {rotulo}
      </Text>
      <Text variant="statValue" color={cor} marginTop="s4">
        {valor}
      </Text>
    </Cartao>
  );
}

function LinhaDeEstoque({
  produto,
  aoMovimentar,
}: {
  produto: Produto;
  aoMovimentar: () => void;
}) {
  const estoque = produto.estoque;
  if (!estoque) return null;

  return (
    <Box
      backgroundColor="surface"
      borderColor="line"
      borderWidth={1}
      borderRadius="r18"
      padding="s14"
      flexDirection="row"
      alignItems="center"
      gap="s12"
    >
      <Box
        width={8}
        height={38}
        borderRadius="full"
        backgroundColor={COR_DA_SITUACAO[estoque.situacao]}
      />
      <Box flex={1} minWidth={0}>
        <Text variant="titleXs">{produto.nome}</Text>
        <Text variant="captionSm" color="textMuted" marginTop="s3">
          {estoque.quantidade} em estoque · mínimo {estoque.minimo} ·{' '}
          {PALAVRA_DA_SITUACAO[estoque.situacao]}
        </Text>
      </Box>
      <Toque
        accessibilityLabel={`Movimentar ${produto.nome}`}
        onPress={aoMovimentar}
        height={36}
        paddingHorizontal="s13"
        borderRadius="r12"
        borderWidth={1}
        borderColor="line"
        alignItems="center"
        justifyContent="center"
      >
        <Text variant="buttonTiny" color="primary">
          Movimentar
        </Text>
      </Toque>
    </Box>
  );
}
