import { notFound } from "next/navigation";
import { resolvePublicClient } from "@/lib/public-ticket";
import PublicTicketForm from "./PublicTicketForm";

type PageParams = {
  slug: string;
};

type PageSearchParams = {
  token?: string;
};

export default async function PublicTicketPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);

  if (!token || typeof token !== "string") {
    notFound();
  }

  const client = await resolvePublicClient(slug, token);
  if (!client) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <PublicTicketForm slug={slug} clientName={client.name} token={token} />
    </main>
  );
}
