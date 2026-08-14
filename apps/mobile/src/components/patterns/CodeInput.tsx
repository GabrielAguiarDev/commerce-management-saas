import { useRef } from 'react';
import { TextInput } from 'react-native';

import { Box } from '@components/ui/Box';
import { Text } from '@components/ui/Text';

interface CodeInputProps {
  /** Os dígitos já digitados. Mais curto que `length` — nunca preenchido com espaço. */
  value: string;
  onChangeText: (code: string) => void;
  length: number;
  /** Lido pelo leitor de tela no lugar dos dígitos soltos. */
  accessibilityLabel: string;
  autoFocus?: boolean;
}

/**
 * As caixas do código de verificação.
 *
 * O desenho são `length` caixas, mas o campo é UM SÓ: um `TextInput` invisível
 * esticado por cima delas. As caixas só desenham o que ele guarda.
 *
 * É esse desenho que dá de graça as três coisas que um campo por caixa custa
 * caro para ter: o **preenchimento automático do código do iOS**
 * (`textContentType="oneTimeCode"`, que preenche os quatro de uma vez), colar
 * um código copiado do e-mail, e apagar sem a dança de foco entre campos — a
 * origem clássica dos bugs dessas telas (apagar no campo vazio não volta um
 * campo, colar quatro dígitos entra um só).
 *
 * A caixa ATIVA é a próxima a ser preenchida, e ela acende sozinha a partir do
 * tamanho do valor: sem cursor visível, é o único sinal de onde o próximo
 * dígito vai cair.
 */
export function CodeInput({
  value,
  onChangeText,
  length,
  accessibilityLabel,
  autoFocus = false,
}: CodeInputProps) {
  const input = useRef<TextInput>(null);

  const digitos = [...value].slice(0, length);
  const ativo = digitos.length;

  return (
    <Box>
      <Box flexDirection="row" gap="s12" justifyContent="center">
        {Array.from({ length }, (_, i) => (
          <Box
            key={i}
            width={58}
            height={58}
            // O mesmo raio dos campos das telas de entrada: as caixas do código
            // são um campo, e um raio maior aqui as faria parecer botões.
            borderRadius="r12"
            borderWidth={1}
            // `authBrand`, e não `primary`: a tela do código não segue o tema
            // (ver `AuthScreen`), então a caixa ativa não pode acender numa cor
            // que muda com a preferência do usuário.
            borderColor={i === ativo ? 'authBrand' : 'authBorder'}
            backgroundColor="authSurface"
            alignItems="center"
            justifyContent="center"
            // As caixas somem do leitor de tela: quem se anuncia é o campo de
            // verdade, embaixo. Quatro "3, vazio, vazio, vazio" seguidos não
            // dizem o que está acontecendo.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text variant="codeDigit" color="authInk">
              {digitos[i] ?? ''}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Invisível e por cima de tudo: é ele que recebe o toque (em qualquer
          caixa), abre o teclado do sistema e guarda o valor. `opacity: 0` e não
          `display: none` — um campo escondido de verdade não recebe foco. */}
      <TextInput
        ref={input}
        value={value}
        // Só dígito entra, custe o que vier: teclado de outro idioma, colagem
        // de "1 2 3 4" com espaço, ou um código de e-mail colado com pontuação.
        onChangeText={(texto) => onChangeText(texto.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        // iOS: oferece o código do e-mail/SMS na barra do teclado e preenche as
        // quatro caixas de uma vez.
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden
        accessibilityLabel={accessibilityLabel}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
        }}
      />
    </Box>
  );
}
