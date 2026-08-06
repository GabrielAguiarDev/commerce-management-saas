import { router } from 'expo-router';

import { Botao, Box, Icone, Screen, Text, Toque } from '@components';
import type { NomeIcone } from '@components';
import { ROTAS, itensDoMais } from '@domain/navigation/rotas';
import { contarNaoLidos, useChamados } from '@domain/support';
import { useCapacidades } from '@domain/tenant';
import { CONFIRMACOES } from '@i18n';
import { useCarrinhoStore } from '@store/carrinhoStore';
import { useSessaoStore } from '@store/sessaoStore';
import { useUIStore } from '@store/uiStore';

/**
 * "Mais": a grade do que o plano inclui.
 *
 * A grade inteira sai de `itensDoMais(capacidades)` — função pura e testada.
 * A tela não sabe o nome de nenhum módulo; só desenha o que a regra devolveu.
 */
export default function TelaMais() {
  const { capacidades } = useCapacidades();
  const { data: chamados = [] } = useChamados();
  const sair = useSessaoStore((s) => s.sair);
  const cancelarCarrinho = useCarrinhoStore((s) => s.cancelar);
  const pedirConfirmacao = useUIStore((s) => s.pedirConfirmacao);

  const itens = itensDoMais(capacidades, contarNaoLidos(chamados));

  function pedirSaida() {
    pedirConfirmacao({
      titulo: CONFIRMACOES.sair.titulo,
      texto: CONFIRMACOES.sair.texto,
      rotuloBotao: CONFIRMACOES.sair.botao,
      destrutivo: true,
      aoConfirmar: () => {
        // Esvaziar o carrinho junto: uma venda em montagem não pode sobreviver
        // à troca de usuário no mesmo aparelho.
        cancelarCarrinho();
        void sair().then(() => router.replace(ROTAS.login as never));
      },
    });
  }

  return (
    <Screen titulo="Mais" subtitulo="Tudo o que seu plano inclui" mostrarVoltar={false}>
      <Box flexDirection="row" flexWrap="wrap" gap="s12">
        {itens.map((item) => (
          <Toque
            key={item.chave}
            accessibilityLabel={`${item.nome}. ${item.descricao}${item.badge ? `. ${item.badge} não lida` : ''}`}
            onPress={() => router.push(item.rota as never)}
            flexBasis="47%"
            flexGrow={1}
            minHeight={118}
            borderRadius="r20"
            borderWidth={1}
            borderColor="line"
            backgroundColor="surface"
            padding="s15"
            justifyContent="space-between"
          >
            <Box
              width={40}
              height={40}
              borderRadius="r13"
              backgroundColor="primarySoft"
              alignItems="center"
              justifyContent="center"
            >
              <Icone nome={item.icone as NomeIcone} tamanho={21} cor="primary" />
            </Box>

            <Box>
              <Text variant="titleSm">{item.nome}</Text>
              <Text variant="hint" color="textMuted" marginTop="s3">
                {item.descricao}
              </Text>
            </Box>

            {item.badge ? (
              <Box
                position="absolute"
                top={13}
                right={13}
                minWidth={20}
                height={20}
                paddingHorizontal="s6"
                borderRadius="full"
                backgroundColor="danger"
                alignItems="center"
                justifyContent="center"
              >
                <Text variant="badge" color="white">
                  {item.badge}
                </Text>
              </Box>
            ) : null}
          </Toque>
        ))}
      </Box>

      <Box marginTop="s6">
        <Botao
          titulo="Sair da conta"
          aoTocar={pedirSaida}
          variante="contorno"
          corDoTexto="danger"
          altura={50}
          raio={16}
          variantTexto="buttonSm"
        />
      </Box>

      <Text variant="hint" color="textMuted" textAlign="center" paddingTop="s4">
        Aguiar One · versão 1.0
      </Text>
    </Screen>
  );
}
