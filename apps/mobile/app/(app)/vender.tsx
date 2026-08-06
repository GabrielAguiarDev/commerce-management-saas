import { useState } from 'react';

import { Box, Campo, EstadoVazio, Icone, Screen, Text, Toque } from '@components';
import { buscaSemResultado, gradeDeVenda, useCatalogo } from '@domain/catalog';
import type { Produto } from '@domain/catalog';
import { TOASTS } from '@i18n';
import { useCarrinhoStore } from '@store/carrinhoStore';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';

/**
 * Nova venda.
 *
 * A grade sem busca mostra só os FAVORITOS — é a tela de bate-rápido do
 * balcão, e o dono decide o que fica à mão favoritando em Produtos. Com busca,
 * o catálogo inteiro entra. A regra é pura e vive em `gradeDeVenda`.
 */
export default function TelaVender() {
  const [busca, setBusca] = useState('');
  const { data: produtos = [] } = useCatalogo();
  const adicionar = useCarrinhoStore((s) => s.adicionar);
  const abrirSheet = useUIStore((s) => s.abrirSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);

  const grade = gradeDeVenda(produtos, busca);
  const vazia = buscaSemResultado(produtos, busca);

  return (
    <Screen titulo="Nova venda" subtitulo="Toque nos itens para montar a venda">
      <Box flexDirection="row" gap="s9">
        <Box flex={1}>
          <Campo
            valor={busca}
            aoMudar={setBusca}
            placeholder="Buscar produto"
            altura={48}
            raio={15}
            accessibilityLabel="Buscar produto"
            returnKeyType="search"
            prefixo={<Icone nome="busca" tamanho={17} cor="textMuted" />}
          />
        </Box>
        <Toque
          accessibilityLabel="Ler código de barras"
          // Fora de escopo: exige expo-camera e permissão declarada. O botão
          // permanece no desenho e diz o que faria.
          onPress={() => mostrarToast(TOASTS.cameraIndisponivel)}
          width={48}
          height={48}
          borderRadius="r15"
          borderWidth={1}
          borderColor="line"
          backgroundColor="surface"
          alignItems="center"
          justifyContent="center"
        >
          <Icone nome="escanear" tamanho={20} cor="primary" />
        </Toque>
      </Box>

      <Text variant="gridLabel" color="textMuted" marginTop="s2">
        {busca.trim() ? 'Resultados da busca' : 'Mais vendidos'}
      </Text>

      <Box flexDirection="row" flexWrap="wrap" gap="s10">
        {grade.map((produto) => (
          <CartaoDeVenda
            key={produto.id}
            produto={produto}
            aoTocar={() =>
              adicionar({
                id: produto.id,
                nome: produto.nome,
                precoCentavos: produto.precoCentavos,
              })
            }
          />
        ))}
      </Box>

      {vazia ? (
        <EstadoVazio
          titulo="Nada encontrado"
          texto="Tente outro nome ou cadastre esse produto agora mesmo."
          rotuloAcao="Cadastrar produto"
          aoTocarAcao={() => abrirSheet({ tipo: 'produto' })}
        />
      ) : null}
    </Screen>
  );
}

function CartaoDeVenda({ produto, aoTocar }: { produto: Produto; aoTocar: () => void }) {
  return (
    <Toque
      accessibilityLabel={`Adicionar ${produto.nome}, ${formatarBRL(produto.precoCentavos)}`}
      onPress={aoTocar}
      // Dois por linha com 10 de gap: 48% aproxima sem precisar medir a tela.
      // `flexBasis` em vez de largura fixa mantém o desenho em tela pequena.
      flexBasis="48%"
      flexGrow={1}
      minHeight={104}
      borderRadius="r18"
      borderWidth={1}
      borderColor="line"
      backgroundColor="surface"
      padding="s13"
      justifyContent="space-between"
      gap="s8"
    >
      <Text variant="titleXs" lineHeight={18}>
        {produto.nome}
      </Text>
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s6">
        <Text variant="moneyMd" color="primary">
          {formatarBRL(produto.precoCentavos)}
        </Text>
        <Box
          width={28}
          height={28}
          borderRadius="r10"
          backgroundColor="primarySoft"
          alignItems="center"
          justifyContent="center"
        >
          <Text variant="gridPlus" color="primary">
            +
          </Text>
        </Box>
      </Box>
    </Toque>
  );
}
