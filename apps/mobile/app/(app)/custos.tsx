import { useState } from 'react';

import { Botao, Box, Cartao, Chips, Pilula, Screen, Text } from '@components';
import type { OpcaoDeChip } from '@components';
import { filtrarCustos, useCustos, useResumoDoMes } from '@domain/costs';
import type { FiltroCusto } from '@domain/costs';
import { useUIStore } from '@store/uiStore';
import { formatarBRL } from '@utils/dinheiro';

const FILTROS: OpcaoDeChip<FiltroCusto>[] = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'fixos', rotulo: 'Fixos' },
  { chave: 'variaveis', rotulo: 'Variáveis' },
];

/**
 * Custos — "O que sai do seu bolso".
 *
 * O card do topo mostra entrou / saiu / sobrou. "Sobrou" é derivado no adapter
 * (entrou − saiu) justamente para não existirem duas contas para o mesmo
 * número.
 */
export default function TelaCustos() {
  const { data: resumo } = useResumoDoMes();
  const { data: custos = [] } = useCustos();
  const abrirSheet = useUIStore((s) => s.abrirSheet);

  const [filtro, setFiltro] = useState<FiltroCusto>('todos');
  const lista = filtrarCustos(custos, filtro);

  return (
    <Screen titulo="Custos" subtitulo="O que sai do seu bolso">
      <Cartao borderRadius="r22" padding="s18">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom="s14"
        >
          <Text variant="titleXs">{resumo?.mes ?? '—'}</Text>
          <Text variant="captionSm" color="textMuted">
            {resumo?.periodo ?? '—'}
          </Text>
        </Box>

        <Box flexDirection="row" gap="s12">
          <ColunaDoMes rotulo="Entrou" valor={resumo?.entrouCentavos ?? 0} />
          <ColunaDoMes rotulo="Saiu" valor={resumo?.saiuCentavos ?? 0} cor="danger" />
          <ColunaDoMes rotulo="Sobrou" valor={resumo?.sobrouCentavos ?? 0} cor="success" />
        </Box>
      </Cartao>

      <Chips opcoes={FILTROS} selecionada={filtro} aoSelecionar={setFiltro} forma="caixa" expandir />

      {lista.map((custo) => (
        <Box
          key={custo.id}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s14"
          flexDirection="row"
          alignItems="center"
          gap="s12"
        >
          <Box flex={1} minWidth={0}>
            <Text variant="titleXs">{custo.nome}</Text>
            <Box flexDirection="row" gap="s6" marginTop="s6" flexWrap="wrap">
              <Pilula texto={custo.rotuloTipo} variante="tag" />
              {custo.veioDoEstoque ? (
                <Pilula
                  texto="veio do estoque"
                  corDeFundo="primarySoft"
                  corDoTexto="primary"
                  variante="tag"
                />
              ) : null}
            </Box>
          </Box>
          <Box alignItems="flex-end">
            <Text variant="moneyBase">{formatarBRL(custo.valorCentavos)}</Text>
            <Text variant="hint" color="textMuted" marginTop="s3">
              {custo.quando}
            </Text>
          </Box>
        </Box>
      ))}

      <Botao
        titulo="+ Registrar custo"
        aoTocar={() => abrirSheet({ tipo: 'custo' })}
        variante="tracejado"
        altura={52}
        raio={18}
        variantTexto="buttonSm"
      />
    </Screen>
  );
}

function ColunaDoMes({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: number;
  cor?: 'danger' | 'success';
}) {
  return (
    <Box flex={1}>
      <Text variant="hint" color="textMuted">
        {rotulo}
      </Text>
      <Text variant="moneyLg" color={cor ?? 'textPrimary'} marginTop="s4">
        {formatarBRL(valor)}
      </Text>
    </Box>
  );
}
