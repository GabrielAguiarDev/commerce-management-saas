import { Suspense } from "react";
import { LoginView } from "@/components/views/LoginView";

export default function Page() {
  // `LoginView` lê a query string (`?erro=nao-admin`, posto pelo middleware),
  // e o App Router exige um limite de Suspense em volta de quem faz isso.
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
