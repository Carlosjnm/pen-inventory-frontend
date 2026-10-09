"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export default function InstallPEN() {
  const [promptEvent, setPromptEvent] =
    useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] =
    useState(false);
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      Boolean(
        (
          navigator as Navigator & {
            standalone?: boolean;
          }
        ).standalone
      );

    setInstalled(standalone);
    setIsIOS(
      /iPad|iPhone|iPod/.test(
        navigator.userAgent
      )
    );

    function capturePrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(
        event as InstallPromptEvent
      );
    }

    function markInstalled() {
      setInstalled(true);
      setPromptEvent(null);
      setOpen(false);
    }

    window.addEventListener(
      "beforeinstallprompt",
      capturePrompt
    );
    window.addEventListener(
      "appinstalled",
      markInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        capturePrompt
      );
      window.removeEventListener(
        "appinstalled",
        markInstalled
      );
    };
  }, []);

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice =
        await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }

      setPromptEvent(null);
      return;
    }

    setOpen(true);
  }

  if (installed) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-emerald-800"
      >
        <img
          src="/icons/pen-192.png"
          alt=""
          className="h-6 w-6 rounded-lg"
        />
        Instalar PEN
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex items-start gap-4">
              <img
                src="/icons/pen-192.png"
                alt="PEN"
                className="h-16 w-16 rounded-2xl shadow"
              />
              <div>
                <h2 className="text-xl font-black">
                  Instalar PEN
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Utilize o sistema como uma aplicação
                  no seu dispositivo.
                </p>
              </div>
            </div>

            {isIOS ? (
              <ol className="mt-6 space-y-3 text-sm leading-6">
                <li>
                  <strong>1.</strong> Abra o PEN no Safari.
                </li>
                <li>
                  <strong>2.</strong> Toque em Partilhar{" "}
                  <span className="text-xl">□↑</span>.
                </li>
                <li>
                  <strong>3.</strong> Escolha{" "}
                  <strong>
                    Adicionar ao ecrã principal
                  </strong>.
                </li>
                <li>
                  <strong>4.</strong> Toque em{" "}
                  <strong>Adicionar</strong>.
                </li>
              </ol>
            ) : (
              <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                Abra o menu do navegador e escolha{" "}
                <strong>Instalar aplicação</strong> ou{" "}
                <strong>
                  Adicionar ao ecrã principal
                </strong>.
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
