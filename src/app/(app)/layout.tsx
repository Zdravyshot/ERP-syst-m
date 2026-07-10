import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { logout } from "@/app/(auth)/login/_actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar userName={user.name} logoutAction={logout} />
      <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
