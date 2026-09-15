"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Location = {
  id: string;
  location_code: string;
  name: string;
  location_type?: string;
};

type CurrentUser = {
  can_access_all_locations: boolean;
  locations: Location[];
};

export default function StoreContextBadge() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        setCurrentUser(data);
      } catch (error) {
        console.error("Store context:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!currentUser) return null;

  let title = "";
  let subtitle = "";

  if (currentUser.can_access_all_locations) {
    title = "Todas as lojas";
    subtitle = "Acesso global";
  } else if (currentUser.locations?.length === 1) {
    title = currentUser.locations[0].name;
    subtitle = currentUser.locations[0].location_code;
  } else if (currentUser.locations?.length > 1) {
    title = `${currentUser.locations.length} lojas autorizadas`;
    subtitle = currentUser.locations
      .map((location) => location.location_code)
      .join(" · ");
  } else {
    title = "Sem loja atribuída";
    subtitle = "Contacte o administrador";
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      title="Loja atualmente autorizada para este utilizador"
    >
      <span className="text-base">📍</span>

      <div className="leading-tight">
        <div className="text-sm font-semibold text-slate-900">
          {title}
        </div>

        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
