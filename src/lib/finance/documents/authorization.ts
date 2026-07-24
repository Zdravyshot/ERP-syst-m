import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { financeRoleSchema } from "@/lib/zod-schemas";
import {
  DocumentAccessError,
  DocumentAuthenticationError,
} from "./errors";

export async function requireFinanceDocumentUser() {
  const session = await getSession();
  if (!session.userId) throw new DocumentAuthenticationError();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) throw new DocumentAuthenticationError();
  if (!financeRoleSchema.safeParse(user.role).success) {
    throw new DocumentAccessError();
  }
  return user;
}
