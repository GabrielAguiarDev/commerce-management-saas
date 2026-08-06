import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Botao } from '@components/ui/Botao';
import { Box } from '@components/ui/Box';
import { Campo } from '@components/ui/Campo';
import { Seletor } from '@components/ui/Seletor';
import { Text } from '@components/ui/Text';
import { CATEGORIAS_CHAMADO, useAbrirChamado } from '@domain/support';
import { SuporteError, type CategoriaChamado } from '@domain/support/supportTypes';
import { ERROS_SUPORTE, TOASTS } from '@i18n';
import { useUIStore } from '@store/uiStore';

/** "Abrir chamado": assunto, categoria, descrição e anexo. */
export function SheetChamado() {
  const fecharSheet = useUIStore((s) => s.fecharSheet);
  const mostrarToast = useUIStore((s) => s.mostrarToast);
  const { mutate: abrir, isPending } = useAbrirChamado();

  const [assunto, setAssunto] = useState('');
  const [categoria, setCategoria] = useState<CategoriaChamado>('duvida');
  const [descricao, setDescricao] = useState('');

  function enviar() {
    abrir(
      { assunto, categoria, descricao },
      {
        onSuccess: () => {
          fecharSheet();
          mostrarToast(TOASTS.chamadoAberto);
        },
        onError: (erro) => {
          const codigo = erro instanceof SuporteError ? erro.codigo : 'rede';
          mostrarToast(ERROS_SUPORTE[codigo], { tom: 'erro' });
        },
      },
    );
  }

  return (
    <BottomSheet titulo="Abrir chamado" aoFechar={fecharSheet}>
      <Box gap="s13">
        <Campo
          rotulo="Assunto"
          valor={assunto}
          aoMudar={setAssunto}
          placeholder="Do que você precisa?"
          autoFocus
        />

        <Box>
          <Text variant="fieldLabel" color="textMuted" marginBottom="s6">
            Categoria
          </Text>
          <Seletor
            valor={categoria}
            opcoes={CATEGORIAS_CHAMADO.map((c) => ({ valor: c.chave, rotulo: c.rotulo }))}
            aoSelecionar={(v) => setCategoria(v as CategoriaChamado)}
            rotuloAcessivel="Categoria do chamado"
            altura={50}
          />
        </Box>

        <Campo
          rotulo="Descrição"
          valor={descricao}
          aoMudar={setDescricao}
          placeholder="Conte com suas palavras o que aconteceu"
          multilinha
        />

        <Botao
          titulo="Anexar foto"
          // Fora de escopo nesta fase: o seletor de imagem exige
          // expo-image-picker e permissão declarada no app.config. O botão
          // existe para não sumir do desenho, e diz o que faria.
          aoTocar={() => mostrarToast(TOASTS.anexoIndisponivel)}
          variante="tracejado"
          altura={48}
          raio={14}
          variantTexto="buttonXs"
        />

        <Botao
          titulo="Enviar chamado"
          aoTocar={enviar}
          altura={54}
          variantTexto="buttonMd"
          carregando={isPending}
        />
      </Box>
    </BottomSheet>
  );
}
