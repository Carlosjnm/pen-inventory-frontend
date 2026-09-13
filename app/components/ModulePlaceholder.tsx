"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Props = {
  title: string;
  description: string;
  active: string;
};

const nav = [
  ["Dashboard", "⌂", "/dashboard"],
  ["Products", "▦", "/products"],
  ["Inventory", "▣", "/inventory"],
  ["Purchases", "↓", "/purchases"],
  ["Sales", "↑", "/sales"],
  ["Suppliers", "♢", "/suppliers"],
  ["Customers", "♙", "/customers"],
  ["Reports", "▤", "/reports"],
  ["Users", "♧", "/users"],
  ["Settings", "⚙", "/settings"],
];

export default function ModulePlaceholder({
  title,
  description,
  active,
}: Props) {
  async function logout() {
    await signOut(auth);
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 text-white lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <div>
            <div className="text-xl font-bold">PEN</div>
            <div className="text-xs text-slate-400">Inventory</div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5 text-sm">
          {nav.map(([label, icon, href]) => (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                active === label
                  ? "bg-white/10 font-semibold text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="w-5 text-center">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="w-full rounded-xl px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex h-20 items-center px-4 md:px-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                {title} module
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                This module is ready for implementation.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
