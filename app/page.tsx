import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[90vh] max-w-5xl items-center justify-center px-6 py-12 text-slate-100">
      <div className="w-full rounded-[32px] border border-slate-800/70 bg-[var(--panel)] p-10 shadow-[0_0_90px_rgba(124,58,237,0.22)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
          Scheduled Music Console
        </p>
        <h1 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
          Plan DJ events, upload full mixes, and keep metadata synchronized.
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          Use the upload panel to push MP3 tracks to Cloudflare R2, preview
          extracted metadata, and store the finished event in{" "}
          <code className="rounded bg-slate-900/70 px-2 py-1 text-indigo-200">
            data/events.json
          </code>
          . Everything lives inside your own Cloudflare R2 bucket.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href="/upload-event"
            className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-4 text-center text-lg font-semibold text-white shadow-[0_10px_40px_rgba(99,102,241,0.35)] transition hover:scale-[1.01]"
          >
            Open the Upload Event form
          </Link>
          <Link
            href="/events"
            className="rounded-2xl border border-slate-700/70 bg-slate-900/60 px-6 py-4 text-center text-lg font-semibold text-slate-100 transition hover:border-indigo-500/70 hover:text-white"
          >
            Manage current events
          </Link>
        </div>
      </div>
    </main>
  );
}
