"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Prehľad", icon: "📊" },
  { href: "/vyroba", label: "Výroba", icon: "🏭" },
  { href: "/sklad", label: "Sklad", icon: "📦" },
  { href: "/objednavky", label: "Objednávky", icon: "🛒" },
  { href: "/plan", label: "Plnenie plánu", icon: "🎯" },
  { href: "/financie", label: "Financie", icon: "💶" },
  { href: "/klienti", label: "Klienti", icon: "👥" },
  { href: "/konkurencia", label: "Konkurencia", icon: "🔍" },
];

export function Sidebar({ userName, logoutAction }: { userName: string; logoutAction: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-emerald-950 text-emerald-50">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-2xl">🥤</span>
        <div>
          <div className="text-sm font-bold leading-tight">Zdravý shot</div>
          <div className="text-xs text-emerald-400">ERP systém</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-emerald-800 font-semibold text-white"
                  : "text-emerald-200 hover:bg-emerald-900 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-emerald-900 px-5 py-4">
        <div className="mb-2 text-xs text-emerald-300">{userName}</div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs text-emerald-400 underline-offset-2 hover:text-white hover:underline"
          >
            Odhlásiť sa
          </button>
        </form>
      </div>
    </aside>
  );
}
