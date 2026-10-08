import { redirect } from "next/navigation";
import { POS_ROUTE } from "@/lib/rotas";

export default function Page() {
  redirect(POS_ROUTE);
}
