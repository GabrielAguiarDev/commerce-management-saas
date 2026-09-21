import { en } from './en';
import type { Messages } from './en';
import { DEFAULT_LANGUAGE, type Language } from './languages';
import { ptBR } from './pt-BR';

/**
 * O IDIOMA ATIVO, para código que não é componente: adapters que montam
 * rótulos ("há 2 h", "vs. período anterior"), os helpers puros da navegação,
 * ações de store.
 *
 * Este módulo não importa store nenhuma, de propósito. O domínio o importa, e
 * os testes de lógica rodam sem módulos nativos — puxar a store de
 * preferências junto (AsyncStorage, SecureStore) quebrava a suíte inteira. O
 * caminho é o inverso: `preferencesStore` avisa aqui quando o idioma muda.
 *
 * Ler daqui não redesenha nada. Quem mantém a tela em dia depois da troca é
 * `useTranslation` nos componentes e a invalidação do cache em `AppProviders`
 * (que faz cada adapter rodar de novo no idioma novo).
 */
const CATALOGS: Record<Language, Messages> = { 'pt-BR': ptBR, en };

let active: Language = DEFAULT_LANGUAGE;

export function setActiveLanguage(language: Language): void {
  active = language;
}

/** O idioma ativo — também é a tag BCP 47 para `toLocaleDateString`. */
export function currentLocale(): Language {
  return active;
}

export function currentMessages(): Messages {
  return CATALOGS[active];
}
