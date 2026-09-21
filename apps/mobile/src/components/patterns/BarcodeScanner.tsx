import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Keyboard, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '../ui/Box';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';
import { Touchable } from '../ui/Touchable';
import { useTranslation } from '@i18n';

/**
 * O LEITOR DE CÓDIGO DE BARRAS.
 *
 * Tela cheia por cima da venda, e não um pedaço da tela: quem está lendo um
 * código aponta o celular para o produto e não olha mais para a interface —
 * uma janelinha pequena só torna a mira mais difícil.
 *
 * ┌─ O TRAVAMENTO DEPOIS DA PRIMEIRA LEITURA ──────────────────────────────┐
 * │ `onBarcodeScanned` dispara A CADA QUADRO em que o código aparece — são  │
 * │ dezenas por segundo, todas com o mesmo número. Sem a trava, um único    │
 * │ produto entraria trinta vezes no carrinho enquanto a pessoa afasta o    │
 * │ celular.                                                               │
 * │                                                                        │
 * │ É `ref` e não estado: precisa valer JÁ, no mesmo quadro, e um `setState`│
 * │ só vale no render seguinte — tempo mais que suficiente para o segundo   │
 * │ disparo passar.                                                        │
 * └────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Os formatos que interessam a um comércio brasileiro.
 *
 * A lista é curta de propósito: cada formato a mais é trabalho por quadro, e
 * ler QR code numa tela de venda só produziria leitura errada — o adesivo de
 * pagamento colado no balcão entraria como se fosse produto.
 */
const FORMATOS = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'] as const;

export function BarcodeScanner({
  visible,
  onClose,
  onRead,
}: {
  visible: boolean;
  onClose: () => void;
  onRead: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const travado = useRef(false);

  // A trava é solta ao ABRIR, não ao fechar: fechar por gesto ou por botão
  // seguem caminhos diferentes, e um deles esqueceria de soltar — deixando a
  // câmera aberta e cega na vez seguinte.
  //
  // O teclado fecha junto: o scanner costuma abrir pelo botão ao lado da
  // busca, com ela ainda em foco, e o teclado do iOS ficaria por cima da
  // câmera em tela cheia.
  useEffect(() => {
    if (!visible) return;
    travado.current = false;
    Keyboard.dismiss();
  }, [visible]);

  // Pergunta a permissão quando a tela abre, e só então: pedir câmera no boot
  // do app assusta e é negado com mais frequência do que pedir no momento em
  // que a pessoa acabou de tocar em "ler código".
  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Box flex={1} backgroundColor="bg">
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...FORMATOS] }}
            onBarcodeScanned={({ data }) => {
              if (travado.current || !data) return;
              travado.current = true;
              onRead(data);
            }}
          />
        ) : (
          <Box flex={1} alignItems="center" justifyContent="center" padding="s24" gap="s12">
            <Icon name="scan" size={40} color="textMuted" />
            <Text variant="titleSm" textAlign="center">
              {t.scanner.needCamera}
            </Text>
            <Text variant="captionSm" color="textMuted" textAlign="center">
              {permission?.canAskAgain === false
                ? t.scanner.denied
                : t.scanner.askHint}
            </Text>
            <Button title={t.scanner.typeCode} onPress={onClose} />
          </Box>
        )}

        {/* Fica FORA do `if`: sem ele, uma permissão negada deixaria a pessoa
            presa numa tela preta sem saída. */}
        <Touchable
          accessibilityLabel={t.scanner.close}
          onPress={onClose}
          position="absolute"
          top={insets.top + 12}
          right={16}
          width={44}
          height={44}
          borderRadius="r15"
          backgroundColor="surface"
          alignItems="center"
          justifyContent="center"
        >
          <Icon name="close" size={20} color="textPrimary" />
        </Touchable>
      </Box>
    </Modal>
  );
}
