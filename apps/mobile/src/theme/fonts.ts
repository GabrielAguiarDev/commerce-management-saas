/**
 * Manrope é a tipografia do produto (400/500/600/700/800).
 *
 * Em React Native `fontWeight` não seleciona o arquivo certo de uma família
 * carregada em runtime — cada peso é uma FAMÍLIA distinta. Por isso os
 * `textVariants` declaram `fontFamily`, nunca `fontWeight`, e este arquivo é a
 * tradução única entre "peso do design" e "nome da família carregada".
 */
export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * O design especifica `letter-spacing` em `em`; o React Native quer px.
 * Só é usado nos títulos grandes, onde o valor negativo é perceptível.
 */
export const emToPx = (em: number, fontSize: number) => em * fontSize;
