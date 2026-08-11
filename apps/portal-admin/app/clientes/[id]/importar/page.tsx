import { ImportarProdutosView } from "@/components/views/ImportarProdutosView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // O id é o UUID do tenant que vai RECEBER os produtos — segue adiante como
  // veio, e é conferido contra `tenants` dentro da Server Action.
  return <ImportarProdutosView customerId={id} />;
}
