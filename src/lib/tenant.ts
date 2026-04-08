import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getTenantContext(selectedClientId?: string) {
  const user = await requireUser();
  const isAdmin = user.role === Role.ADMIN;

  if (isAdmin) {
    const chosenId = selectedClientId;
    const client =
      (chosenId
        ? await prisma.client.findUnique({ where: { id: chosenId } })
        : await prisma.client.findFirst({ orderBy: { createdAt: "asc" } })) ?? null;

    return {
      user,
      role: user.role,
      clientId: client?.id ?? null,
      client,
      isAdmin,
      accessibleClientIds: null as string[] | null,
    };
  }

  const memberships = user.memberships;
  const fallbackClientId = memberships[0]?.clientId ?? null;
  const validRequestedId = memberships.some((m) => m.clientId === selectedClientId);
  const clientId = validRequestedId ? selectedClientId! : fallbackClientId;

  const client = clientId
    ? await prisma.client.findUnique({
        where: { id: clientId },
      })
    : null;

  return {
    user,
    role: user.role,
    clientId,
    client,
    isAdmin,
    accessibleClientIds: memberships.map((m) => m.clientId),
  };
}
