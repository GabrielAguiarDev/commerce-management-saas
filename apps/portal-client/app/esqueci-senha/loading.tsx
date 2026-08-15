import { AuthSkeleton } from "@/components/AuthShell";

/**
 * O título e o subtítulo são os MESMOS do `EsqueciSenhaView` — repetidos aqui
 * de propósito. Eles são texto fixo da tela, não dado do servidor: escritos na
 * fronteira, o cabeçalho já entra pronto e o que troca é só o formulário
 * abaixo dele. Ver `AuthSkeleton` para o motivo de esta fronteira existir.
 */
export default function Loading() {
  return (
    <AuthSkeleton
      title="Esqueceu a senha?"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para você criar uma nova."
      fields={1}
    />
  );
}
