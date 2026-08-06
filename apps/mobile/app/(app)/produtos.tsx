import { useState } from 'react';

import { Botao, Box, Campo, Chips, Icone, Pilula, Screen, Text, Toque } from '@components';
import type { OpcaoDeChip } from '@components';
import {
  categoriaEspecialDoTenant,
  filtrarCatalogo,
  useAlternarFavorito,
  useCatalogo,
} from '@domain/catalog';
import type { FiltroCatalogo, Produto, SituacaoEstoque } from '@domain/catalog';
import { useCapacidades } from '@domain/tenant';
import { TOASTS } from '@i18n';
import { useSessaoStore } from '@store/sessaoStore';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';
import type { ThemeColor } from '@theme';

/** Badge de estoque: cor e texto derivam da situação, num lugar só. */
const BADGE: Record<SituacaoEstoque, { fundo: ThemeColor; texto: ThemeColor }> = {
  em_dia: { fundo: 'successSoft', texto: 'success' },
  baixo: { fundo: 'warningSoft', texto: 'warning' },
  zerado: { fundo: 'dangerSoft', texto: 'danger' },
};

function rotuloDoBadge(produto: Produto): string {
  const e = produto.estoque;
  if (!e) return '';
  if (e.situacao === 'zerado') return 'Sem estoque';
  if (e.situacao === 'baixo') return `${e.quantidade} — está baixo`;
  return `${e.quantidade} em estoque`;
}

export default function TelaProdutos() {
  const tenantId = useSessaoStore((s) => s.tenantId);
  const { capacidades } = useCapacidades();
  const { data: produtos = [] } = useCatalogo();
  const { mutate: alternarFavorito } = useAlternarFavorito();
  const abrirSheet = useUIStore((s) => s.abrirSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroCatalogo>('todos');

  // O rótulo do 3º chip muda com o ramo: "Serviços" no petshop, "Bebidas" na
  // barraca. Vem do dado do negócio, não de um `if` de perfil na tela.
  const categoriaEspecial = tenantId ? categoriaEspecialDoTenant(tenantId) : null;

  const opcoes: OpcaoDeChip<FiltroCatalogo>[] = [
    { chave: 'todos', rotulo: 'Todos' },
    { chave: 'favoritos', rotulo: 'Favoritos' },
    ...(categoriaEspecial ? [{ chave: 'especial' as const, rotulo: categoriaEspecial }] : []),
  ];

  const lista = filtrarCatalogo(produtos, { busca, filtro, categoriaEspecial });

  return (
    <Screen titulo="Produtos" subtitulo={`${produtos.length} cadastrados`}>
      <Campo
        valor={busca}
        aoMudar={setBusca}
        placeholder="Buscar por nome ou código"
        altura={48}
        raio={15}
        accessibilityLabel="Buscar por nome ou código"
        returnKeyType="search"
        prefixo={<Icone nome="busca" tamanho={17} cor="textMuted" />}
      />

      <Chips opcoes={opcoes} selecionada={filtro} aoSelecionar={setFiltro} />

      {lista.map((produto) => (
        <Box
          key={produto.id}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s14"
          flexDirection="row"
          gap="s12"
          alignItems="flex-start"
        >
          <Toque
            accessibilityLabel={
              produto.favorito ? `Desfavoritar ${produto.nome}` : `Favoritar ${produto.nome}`
            }
            accessibilityState={{ selected: produto.favorito }}
            onPress={() => alternarFavorito(produto.id)}
            width={34}
            height={34}
            borderRadius="r11"
            backgroundColor={produto.favorito ? 'primarySoft' : 'surface2'}
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="star" color={produto.favorito ? 'primary' : 'textMuted'}>
              ★
            </Text>
          </Toque>

          <Box flex={1} minWidth={0}>
            <Text variant="titleSm">{produto.nome}</Text>
            <Text variant="captionSm" color="textMuted" marginTop="s3">
              {metaDoProduto(produto, capacidades.temCustos)}
            </Text>

            <Box flexDirection="row" gap="s6" marginTop="s9" flexWrap="wrap" alignItems="center">
              <Text variant="moneyMd">{formatarBRL(produto.precoCentavos)}</Text>
              {capacidades.temEstoque && produto.estoque ? (
                <Pilula
                  texto={rotuloDoBadge(produto)}
                  corDeFundo={BADGE[produto.estoque.situacao].fundo}
                  corDoTexto={BADGE[produto.estoque.situacao].texto}
                />
              ) : null}
            </Box>
          </Box>

          <Toque
            accessibilityLabel={`Mais ações de ${produto.nome}`}
            // Edição completa fora de escopo desta fase — o protótipo também
            // só avisa. Registrado em DEVELOPMENT.md › Pendências.
            onPress={() => mostrarToast(TOASTS.edicaoIndisponivel(produto.nome))}
            width={34}
            height={34}
            borderRadius="r11"
            borderWidth={1}
            borderColor="line"
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="rowLabel" color="textMuted">
              ⋯
            </Text>
          </Toque>
        </Box>
      ))}

      <Box marginTop="s2">
        <Botao
          titulo="+ Cadastro rápido"
          aoTocar={() => abrirSheet({ tipo: 'produto' })}
          variante="tracejado"
          altura={52}
          raio={18}
          variantTexto="buttonSm"
        />
      </Box>
    </Screen>
  );
}

/** "Código 7891 · custa R$ 132,00" — a linha de meta abaixo do nome. */
function metaDoProduto(produto: Produto, temCustos: boolean): string {
  const base = produto.ehServico ? 'Serviço' : `Código ${produto.codigo ?? '—'}`;
  if (temCustos && produto.custoCentavos !== null) {
    return `${base} · custa ${formatarBRL(produto.custoCentavos)}`;
  }
  return base;
}
