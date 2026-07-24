import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { hasFinancePermission } from "@/lib/finance/permissions";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!hasFinancePermission(user.role, "VIEW")) notFound();
  return children;
}
