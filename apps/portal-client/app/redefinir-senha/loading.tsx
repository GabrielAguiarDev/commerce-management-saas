import { AuthSkeleton } from "@/components/AuthShell";

/**
 * O subtítulo é o da versão SEM e-mail conhecido: quem o conhece é a página,
 * que só o lê da sessão do outro lado da espera. Escrever aqui o texto genérico
 * é o que mantém as duas linhas na mesma altura quando a tela real entra.
 */
export default function Loading() {
  return (
    <AuthSkeleton title="Criar nova senha" subtitle="Escolha a nova senha da sua conta." />
  );
}
