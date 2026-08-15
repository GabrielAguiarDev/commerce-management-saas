import { AuthSkeleton } from "@/components/AuthShell";

/**
 * A entrada tem a fronteira por dois motivos.
 *
 * O primeiro é o de sempre: sem este arquivo, quem cobriria o caminho para o
 * `/login` seria o `app/loading.tsx`, com o desenho do painel — indicadores e
 * listas por cima de uma tela que é um cartão centralizado.
 *
 * O segundo é o "Voltar para a entrada" das telas de senha, que faz o caminho
 * inverso e sofria do mesmo branco que elas. Ver `AuthSkeleton`.
 *
 * O `LoginView` não usa o `AuthShell`, mas desenha a mesma moldura: banner de
 * 50%, cartão de 360px, título e subtítulo centrados. É por isso que a espera
 * dele pode sair daqui.
 */
export default function Loading() {
  return <AuthSkeleton title="Bem-vindo de volta!" subtitle="Entre na sua conta para continuar" />;
}
