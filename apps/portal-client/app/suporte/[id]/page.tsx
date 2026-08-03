import { ChamadoView } from "@/components/views/ChamadoView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChamadoView id={id} />;
}
