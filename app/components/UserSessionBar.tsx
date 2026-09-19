"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type CurrentUser = {
  full_name: string;
  email: string;
  can_access_all_locations: boolean;
  roles: { code: string; name: string }[];
  locations: { id: string; name: string; location_code: string }[];
};

export default function UserSessionBar() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch(`${API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.ok) {
          setCurrentUser(await response.json());
        }
      } catch (error) {
        console.error("Erro ao carregar utilizador:", error);
      }
    });
  }, []);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/";
  }

  if (!currentUser) return null;

  const initials = currentUser.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  const roleNames =
    currentUser.roles.map((role) => role.name).join(", ") || "Utilizador";

  const locationNames = currentUser.can_access_all_locations
    ? "Todas as localizações"
    : currentUser.locations.map((location) => location.name).join(", ") ||
      "Sem localização atribuída";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "14px",
        minHeight: "58px",
        padding: "8px 24px",
        background: "#ffffff",
        borderBottom: "1px solid #dbe2ea",
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        aria-label="Perfil do utilizador"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "#10213d",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "13px",
        }}
      >
        {initials}
      </div>

      <div style={{ lineHeight: 1.25 }}>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>
          {currentUser.full_name}
        </div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          {roleNames} · {locationNames}
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          marginLeft: "8px",
          padding: "9px 14px",
          border: "1px solid #dc2626",
          borderRadius: "8px",
          background: "#ffffff",
          color: "#dc2626",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Terminar sessão
      </button>
    </div>
  );
}
