"use client";

import { useState } from "react";
import Link from "next/link";
import TrackPreview from "../components/TrackPreview";
import { convertSriLankaInputToUtc } from "@/lib/timezone";

const initialFormState = {
  event_name: "",
  artist_name: "",
  start_time_utc: "",
  end_time_utc: "",
};

const fieldClasses =
  "w-full rounded-2xl border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 placeholder:text-slate-500";

export default function UploadEventPage() {
  const [formValues, setFormValues] = useState(initialFormState);
  const [tracks, setTracks] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormValues(initialFormState);
    setTracks([]);
    setStatus({
      type: "info",
      text: "Form cleared. Tracks have been removed from the queue.",
    });
  };

  const uploadTracks = async (event) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }

    setStatus(null);
    setIsUploading(true);

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload-track", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to upload track.");
        }

        setTracks((prev) => [...prev, payload]);
        setStatus({
          type: "success",
          text: `Added "${payload.track_name}" to the event.`,
        });
      } catch (error) {
        setStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Track upload failed unexpectedly.",
        });
      }
    }

    setIsUploading(false);
    event.target.value = "";
  };

  const removeTrack = (trackId) => {
    setTracks((prev) => prev.filter((track) => track.track_id !== trackId));
  };

  const submitEvent = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!tracks.length) {
      setStatus({ type: "error", text: "Please upload at least one track." });
      return;
    }

    let payload;
    try {
      payload = {
        event_name: formValues.event_name.trim(),
        artist_name: formValues.artist_name.trim(),
        start_time_utc: convertSriLankaInputToUtc(
          formValues.start_time_utc,
          "Start time",
        ),
        end_time_utc: convertSriLankaInputToUtc(
          formValues.end_time_utc,
          "End time",
        ),
        tracks,
      };
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Invalid event data.",
      });
      return;
    }

    if (!payload.event_name || !payload.artist_name) {
      setStatus({
        type: "error",
        text: "Event and artist names cannot be empty.",
      });
      return;
    }

    if (
      new Date(payload.end_time_utc).getTime() <=
      new Date(payload.start_time_utc).getTime()
    ) {
      setStatus({
        type: "error",
        text: "End time must be after the start time.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to create event.");
      }

      setStatus({
        type: "success",
        text: `Event "${data.event.event_name}" saved successfully.`,
      });
      setFormValues(initialFormState);
      setTracks([]);
    } catch (error) {
      setStatus({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500/60 hover:text-white"
        >
          ← Home
        </Link>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-500/60 hover:text-white"
        >
          View current events
        </Link>
      </div>
      <div className="rounded-[32px] border border-slate-800/70 bg-[var(--panel)] p-10 shadow-[0_0_80px_rgba(79,70,229,0.25)] backdrop-blur">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            Upload Event
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Create a DJ event and upload MP3 tracks
          </h1>
          <p className="mt-3 text-base text-slate-400">
            Each track is sent to <span className="font-mono text-indigo-200">/api/upload-track</span>{" "}
            for metadata extraction and Cloudflare R2 storage. When you submit
            the form the compiled event is appended to{" "}
            <span className="font-mono text-indigo-200">data/events.json</span>.
          </p>
        </header>

        {status ? (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
              status.type === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                : status.type === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-200"
            }`}
          >
            {status.text}
          </div>
        ) : null}

        <form className="space-y-8" onSubmit={submitEvent}>
          <section className="grid gap-4 md:grid-cols-2">
            <div>
            <label className="mb-1 block text-sm font-semibold text-slate-300">
              Event name
            </label>
              <input
                className={fieldClasses}
                type="text"
                placeholder="Sunrise Session"
                name="event_name"
                value={formValues.event_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
            <label className="mb-1 block text-sm font-semibold text-slate-300">
              Artist / DJ name
            </label>
              <input
                className={fieldClasses}
                type="text"
                placeholder="Codex DJ"
                name="artist_name"
                value={formValues.artist_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
            <label className="mb-1 block text-sm font-semibold text-slate-300">
              Start time (Sri Lanka time)
            </label>
              <input
                className={fieldClasses}
                type="datetime-local"
                name="start_time_utc"
                value={formValues.start_time_utc}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
            <label className="mb-1 block text-sm font-semibold text-slate-300">
              End time (Sri Lanka time)
            </label>
              <input
                className={fieldClasses}
                type="datetime-local"
                name="end_time_utc"
                value={formValues.end_time_utc}
                onChange={handleInputChange}
                required
              />
            </div>
          </section>

          <section>
            <label className="mb-1 block text-sm font-semibold text-slate-300">
              Upload MP3 tracks
            </label>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              multiple
              className="block w-full cursor-pointer rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/60 px-4 py-6 text-center text-base font-medium text-slate-200 transition hover:border-indigo-500/60 hover:text-white"
              onChange={uploadTracks}
              disabled={isUploading}
            />
            <p className="mt-2 text-sm text-slate-400">
              We will automatically extract metadata and duration with
              music-metadata.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {tracks.length ? "Track preview" : "No tracks uploaded yet"}
              </h2>
              {tracks.length ? (
                <span className="text-sm text-slate-400">
                  {tracks.length} track{tracks.length > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <div className="space-y-3">
              {tracks.map((track) => (
                <TrackPreview
                  key={track.track_id}
                  track={track}
                  onRemove={removeTrack}
                />
              ))}
              {!tracks.length ? (
                <p className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
                  Upload MP3 files to see extracted titles and durations before
                  saving your event.
                </p>
              ) : null}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-500 px-6 py-3 text-lg font-semibold text-white shadow-[0_10px_35px_rgba(99,102,241,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:bg-slate-500"
              disabled={isUploading || isSubmitting}
            >
              {isSubmitting ? "Saving event..." : "Save event"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-2xl border border-slate-700/70 px-6 py-3 text-lg font-semibold text-slate-100 transition hover:border-indigo-500/60 hover:text-white"
              disabled={isSubmitting}
            >
              Reset form
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
