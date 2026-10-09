export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <img
          src="/icons/pen-192.png"
          alt="PEN"
          className="mx-auto h-24 w-24 rounded-3xl shadow"
        />
        <h1 className="mt-6 text-2xl font-black text-slate-950">
          Sem ligação à Internet
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          O PEN precisa de ligação para carregar dados
          atualizados do inventário.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-xl bg-slate-950 px-6 py-3 font-bold text-white"
        >
          Voltar a tentar
        </a>
      </div>
    </main>
  );
}
