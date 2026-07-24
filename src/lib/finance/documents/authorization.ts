import { getSession } from "@/lib/auth";
import type { FinancePermission } from "@/lib/finance/permissions";
import { hasFinancePermission } from "@/lib/finance/permissions";
import { prisma } from "@/lib/prisma";
import {
  DocumentAccessError,
  DocumentAuthenticationError,
} from "./errors";

export async function requireFinanceDocumentUser(permission: FinancePermission) {
  const session = await getSession();
  if (!session.userId) throw new DocumentAuthenticationError();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) throw new DocumentAuthenticationError();
  if (!hasFinancePermission(user.role, permission)) {
    throw new DocumentAccessError();
  }
  return user;
}
