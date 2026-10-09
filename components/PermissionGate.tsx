"use client";

import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

export default function PermissionGate({
  permission,
  children,
}: {
  permission?: string;
  children: ReactNode;
}) {
  const [allowed, setAllowed] = useState(!permission);

  useEffect(() => {
    if (!permission) {
      setAllowed(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllowed(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_URL}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          setAllowed(false);
          return;
        }

        const data = await response.json();
        setAllowed(
          Array.isArray(data.permissions) &&
            data.permissions.includes(permission)
        );
      } catch {
        setAllowed(false);
      }
    });

    return () => unsubscribe();
  }, [permission]);

  if (!allowed) return null;

  return <>{children}</>;
}
