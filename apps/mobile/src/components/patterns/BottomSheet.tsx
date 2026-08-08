import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { useAppTheme } from '@hooks/useAppTheme';

import { AO_SHEET } from './animations';
import { InsideSheetProvider, useSheetVisibility } from './sheetContext';

/** 82% da tela, como no protótipo (`max-height:82%`). */
const ALTURA_MAXIMA = Dimensions.get('window').height * 0.82;

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * O bottom sheet do app, sobre `@gorhom/bottom-sheet`.
 *
 * A API é a mesma de antes (`title`, `onClose`, `children`) — os cinco sheets
 * do produto continuam sendo só conteúdo. O que mudou é quem cuida do gesto,
 * do backdrop e do teclado: era código nosso, agora é a lib.
 *
 * Duas escolhas que não são óbvias:
 *
 *  • O cabeçalho (alcinha + título + ✕) é o `handleComponent`, não parte do
 *    conteúdo. É o que mantém o título FIXO quando a lista rola — no carrinho
 *    com muitos itens isso importa — e ainda deixa a área inteira arrastável,
 *    porque é exatamente onde a lib prende o gesto do handle.
 *
 *  • `enableDynamicSizing` no lugar de `snapPoints` fixos: o sheet tem a
 *    altura do próprio conteúdo, que era o comportamento do componente antigo.
 *    `maxDynamicContentSize` recoloca o teto de 82% do protótipo, e a partir
 *    dele o `BottomSheetScrollView` rola.
 *
 * Fechar tem sempre o mesmo caminho, venha de onde vier — do ✕, do backdrop,
 * do arrasto para baixo ou de um `closeSheet()` do conteúdo depois de salvar:
 * a lib anima a saída e SÓ ENTÃO o `onDismiss` limpa a store (`onClose`) e
 * libera o `SheetHost` para desmontar (`onClosed`). Ver `sheetContext`.
 */
export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { open, onClosed } = useSheetVisibility();
  const sheetRef = useRef<BottomSheetModal>(null);

  // O `SheetHost` monta este componente quando a store abre um sheet; o modal
  // da lib, porém, só aparece depois de `present()`. O mesmo efeito cobre a
  // volta: quando a store fecha o sheet, `open` cai e a saída é animada.
  useEffect(() => {
    if (open) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [open]);

  const dismiss = useCallback(() => sheetRef.current?.dismiss(), []);

  // O ✕, o backdrop e o arrasto dispensam o sheet direto na lib, sem passar
  // pela store — então é aqui, no fim da animação, que a store é zerada.
  // `closeSheet` é idempotente, o que torna seguro o caminho inverso (a store
  // fechou primeiro e a animação só confirma).
  const handleDismiss = useCallback(() => {
    onClose();
    onClosed();
  }, [onClose, onClosed]);

  // O `aoSheet` do design, agora como config de animação da lib: 260ms na
  // curva cubic-bezier(.2,.8,.25,1).
  const animacao = useBottomSheetTimingConfigs({
    duration: AO_SHEET.duration,
    easing: AO_SHEET.easing,
  });

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        accessibilityLabel="Fechar"
        // A opacidade já vive no token (`rgba(...,0.5)`), então aqui ela é 1 —
        // senão o scrim sairia pela metade do que o design pede.
        opacity={1}
        style={{ backgroundColor: theme.colors.scrimSheet }}
      />
    ),
    [theme.colors.scrimSheet],
  );

  const renderHandle = useCallback(
    () => (
      <Box paddingTop="s10" paddingHorizontal="s18" paddingBottom="s14">
        <Box
          width={44}
          height={5}
          borderRadius="full"
          backgroundColor="line"
          alignSelf="center"
          marginBottom="s14"
        />

        <Box flexDirection="row" alignItems="center" gap="s10">
          <Box flex={1}>
            <Text variant="sheetTitle" accessibilityRole="header">
              {title}
            </Text>
          </Box>
          <Touchable
            accessibilityLabel="Fechar"
            onPress={dismiss}
            width={34}
            height={34}
            borderRadius="r11"
            borderWidth={1}
            borderColor="line"
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="rowLabel" color="textMuted">
              ✕
            </Text>
          </Touchable>
        </Box>
      </Box>
    ),
    [title, dismiss],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={handleDismiss}
      enablePanDownToClose
      enableDynamicSizing
      maxDynamicContentSize={ALTURA_MAXIMA}
      topInset={insets.top}
      animationConfigs={animacao}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadii.r28,
        borderTopRightRadius: theme.borderRadii.r28,
      }}
      // Há campo de texto em quatro dos cinco sheets: `interactive` faz o sheet
      // subir junto com o teclado, e `restore` o traz de volta ao fechar.
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <InsideSheetProvider value>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.s18,
            paddingBottom: theme.spacing.s26 + insets.bottom,
          }}
        >
          {children}
        </BottomSheetScrollView>
      </InsideSheetProvider>
    </BottomSheetModal>
  );
}
