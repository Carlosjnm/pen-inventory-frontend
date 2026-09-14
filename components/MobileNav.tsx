"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const navigation = [
  { label: "Painel", href: "/dashboard", icon: "⌂" },
  { label: "Produtos", href: "/products", icon: "▦" },
  { label: "Inventário", href: "/inventory", icon: "▣" },
  { label: "Compras", href: "/purchases", icon: "↓" },
  { label: "Vendas", href: "/sales", icon: "↑" },
  { label: "Fornecedores", href: "/suppliers", icon: "♢" },
  { label: "Clientes", href: "/customers", icon: "♙" },
  { label: "Relatórios", href: "/reports", icon: "▤" },
  { label: "Utilizadores", href: "/users", icon: "♧" },
  { label: "Definições", href: "/settings", icon: "⚙" },
];

export default function MobileNav({
  onLogout,
}: {
  onLogout?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  async function handleLogout() {
    setOpen(false);

    if (onLogout) {
      await onLogout();
      return;
    }

    await signOut(auth);
    window.location.href = "/";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm lg:hidden"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
          />

          <aside className="relative z-10 flex h-dvh w-64 max-w-[78vw] flex-col overflow-hidden bg-slate-950 text-white shadow-2xl">
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
              <div>
                <div className="text-xl font-bold tracking-tight">PEN</div>
                <div className="text-xs text-slate-400">Inventário</div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-xl text-slate-300 hover:bg-white/10"
                aria-label="Fechar menu"
              >
                ×
              </button>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5 text-sm">
              {navigation.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(`${item.href}/`));

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                      active
                        ? "bg-white text-slate-950"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="w-5 text-center text-base">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="shrink-0 border-t border-white/10 bg-slate-950 p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Terminar Sessão
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
