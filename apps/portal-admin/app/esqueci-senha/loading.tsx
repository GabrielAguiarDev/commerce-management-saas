import { AuthSkeleton } from "@/components/AuthShell";

/** A moldura de acesso com o miolo em cinza, no lugar de uma tela branca. */
export default function Loading() {
  return <AuthSkeleton screen="forgot" />;
}
