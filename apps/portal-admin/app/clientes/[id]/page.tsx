import { DetalheView } from "@/components/views/DetalheView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalheView clienteId={Number(id)} />;
}
