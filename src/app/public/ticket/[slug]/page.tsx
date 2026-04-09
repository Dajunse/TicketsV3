import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicTicketForm from "./PublicTicketForm";

export default async function PublicTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const client = await prisma.client.findUnique({
    where: {
      publicTicketSlug: slug,
    },
    select: {
      name: true,
      publicTicketTokenHash: true,
    },
  });

  if (!client) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <PublicTicketForm
        params={params}
        clientName={client.name}
        token={client.publicTicketTokenHash}
      />
    </main>
  );
}
