"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pen-inventory-backend-250574343787.africa-south1.run.app";

type Organization = {
  id: string;
  name: string;
  code: string;
  base_currency: string;
  default_language: string;
  is_active: boolean;
};

type Setting = {
  setting_key: string;
  setting_value: unknown;
  description: string | null;
  is_system: boolean;
};

export default function SettingsPage() {
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/";
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load settings.");
        }

        const data = await response.json();

        setOrganization(data.organization || null);
        setSettings(data.settings || []);

        const reorderSetting = (data.settings || []).find(
          (setting: Setting) =>
            setting.setting_key === "default_reorder_level"
        );

        if (reorderSetting) {
          setReorderLevel(String(reorderSetting.setting_value));
        }
      } catch (error) {
        console.error(error);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load settings."
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function saveReorderLevel() {
    const value = Number(reorderLevel);

    if (!Number.isInteger(value) || value < 0) {
      setMessage("Default reorder level must be a whole number of 0 or more.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setMessage("Authentication required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/settings/default_reorder_level`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            setting_value: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to save setting.");
      }

      setSettings((current) =>
        current.map((setting) =>
          setting.setting_key === "default_reorder_level"
            ? data.setting
            : setting
        )
      );

      setReorderLevel(String(data.setting.setting_value));
      setMessage("Default reorder level saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save setting."
      );
    } finally {
      setSaving(false);
    }
  }

  function formatValue(value: unknown) {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value === null || value === undefined) {
      return "—";
    }

    return String(value);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-700">
        Loading settings...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-950">
            Settings
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Organization and system configuration
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {message}
          </div>
        )}

        {organization && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Organization
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Name
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.name}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Code
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.code}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Base Currency
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.base_currency}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Default Language
                </div>
                <div className="mt-1 font-medium text-slate-950">
                  {organization.default_language.toUpperCase()}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-950">
              System Settings
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Current configuration values for this organization
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {settings.map((setting) => (
              <div
                key={setting.setting_key}
                className="grid gap-3 px-6 py-5 md:grid-cols-[1.4fr_1fr_auto]"
              >
                <div>
                  <div className="font-medium text-slate-950">
                    {setting.setting_key
                      .split("_")
                      .map(
                        (part) =>
                          part.charAt(0).toUpperCase() +
                          part.slice(1)
                      )
                      .join(" ")}
                  </div>

                  {setting.description && (
                    <div className="mt-1 text-sm text-slate-500">
                      {setting.description}
                    </div>
                  )}
                </div>

                <div className="font-medium text-slate-700">
                  {setting.setting_key === "default_reorder_level" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={reorderLevel}
                        onChange={(event) =>
                          setReorderLevel(event.target.value)
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-500"
                      />

                      <button
                        type="button"
                        onClick={saveReorderLevel}
                        disabled={saving}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  ) : (
                    formatValue(setting.setting_value)
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      setting.is_system
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {setting.is_system ? "System" : "Editable"}
                  </span>
                </div>
              </div>
            ))}

            {!settings.length && (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                No settings found.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
