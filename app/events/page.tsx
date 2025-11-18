"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";

import type { EventRecord } from "@/types/events";

type FormState = {
  event_name: string;
  artist_name: string;
  start_time_utc: string;
  end_time_utc: string;
};

type StatusMessage = {
  type: "success" | "error" | "info";
  text: string;
};

const initialFormState: FormState = {
  event_name: "",
  artist_name: "",
  start_time_utc: "",
  end_time_utc: "",
};

const fieldClasses =
  "w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-[var(--foreground)] shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400";

const formatDate = (isoString: string) =>
  new Date(isoString).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const toLocalDatetimeValue = (isoString: string) => {
  const date = new Date(isoString);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const toIsoString = (value: string, label: string) => {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date.toISOString();
};

const ManageEventsPage = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to load events.");
      }
      setEvents(payload.events ?? []);
      if ((payload.events ?? []).length === 0) {
        setStatus({
          type: "info",
          text: "No events have been scheduled yet.",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load events. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const startEditing = (event: EventRecord) => {
    setEditingId(event.event_id);
    setFormValues({
      event_name: event.event_name,
      artist_name: event.artist_name,
      start_time_utc: toLocalDatetimeValue(event.start_time_utc),
      end_time_utc: toLocalDatetimeValue(event.end_time_utc),
    });
    setStatus({
      type: "info",
      text: `Editing "${event.event_name}"`,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormValues(initialFormState);
  };

  const handleFormChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const payload = {
        event_name: formValues.event_name.trim(),
        artist_name: formValues.artist_name.trim(),
        start_time_utc: toIsoString(
          formValues.start_time_utc,
          "Start time",
        ),
        end_time_utc: toIsoString(formValues.end_time_utc, "End time"),
      };

      if (!payload.event_name || !payload.artist_name) {
        throw new Error("Event and artist names cannot be empty.");
      }

      const response = await fetch(`/api/events/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to update event.");
      }

      setStatus({
        type: "success",
        text: `Updated "${data.event.event_name}".`,
      });
      await fetchEvents();
      cancelEditing();
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update the event.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    const target = events.find((event) => event.event_id === eventId);
    if (
      !target ||
      !window.confirm(`Delete "${target.event_name}" permanently?`)
    ) {
      return;
    }

    setStatus(null);

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete event.");
      }
      setStatus({
        type: "success",
        text: `Deleted "${target.event_name}".`,
      });
      await fetchEvents();
      if (editingId === eventId) {
        cancelEditing();
      }
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete the event.",
      });
    }
  };

  const deleteAllEvents = async () => {
    if (
      !events.length ||
      !window.confirm("Delete ALL events? This cannot be undone.")
    ) {
      return;
    }
    setStatus(null);
    try {
      const response = await fetch("/api/events", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete events.");
      }
      setStatus({
        type: "success",
        text: "All events were deleted.",
      });
      await fetchEvents();
      cancelEditing();
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete events.",
      });
    }
  };

  const deleteExpiredEvents = async () => {
    if (
      !events.some(
        (event) => new Date(event.end_time_utc).getTime() <= Date.now(),
      )
    ) {
      setStatus({
        type: "info",
        text: "No expired events detected.",
      });
      return;
    }

    if (
      !window.confirm(
        "Delete all events that ended in the past? This cannot be undone.",
      )
    ) {
      return;
    }

    setStatus(null);
    try {
      const response = await fetch("/api/events/expired", {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error ?? "Unable to delete expired events.",
        );
      }
      if (payload.deleted === 0) {
        setStatus({
          type: "info",
          text: "No expired events needed removal.",
        });
      } else {
        setStatus({
          type: "success",
          text: `Deleted ${payload.deleted} expired event${payload.deleted > 1 ? "s" : ""}.`,
        });
      }
      await fetchEvents();
      cancelEditing();
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete expired events.",
      });
    }
  };

  const expiredEventIds = useMemo(() => {
    const now = Date.now();
    return new Set(
      events
        .filter(
          (event) => new Date(event.end_time_utc).getTime() <= now,
        )
        .map((event) => event.event_id),
    );
  }, [events]);

  return (
    <main className="mx-auto flex min-h-[90vh] max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-2xl shadow-slate-200 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Current Events
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Review, edit, and prune scheduled music events.
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Use the actions below to review JSON-backed events, play tracks,
              edit metadata, or remove outdated entries.
            </p>
          </div>
          <Link
            href="/upload-event"
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500"
          >
            Create a new event
          </Link>
        </div>

        {status ? (
          <p
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
              status.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : status.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            {status.text}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={fetchEvents}
            disabled={isLoading}
          >
            Refresh list
          </button>
          <button
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={deleteExpiredEvents}
            disabled={isLoading}
          >
            Delete expired
          </button>
          <button
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={deleteAllEvents}
            disabled={isLoading || events.length === 0}
          >
            Delete all events
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Event queue
            </h2>
            <span className="text-sm text-slate-500">
              {isLoading
                ? "Loading..."
                : `${events.length} event${events.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {isLoading ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading events...
            </p>
          ) : events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No events saved yet. Head over to the upload form and create one.
            </p>
          ) : (
            <div className="space-y-4">
              {events.map((eventRecord) => (
                <article
                  key={eventRecord.event_id}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    expiredEventIds.has(eventRecord.event_id)
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {eventRecord.event_name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {eventRecord.artist_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(eventRecord.start_time_utc)} &rarr;{" "}
                        {formatDate(eventRecord.end_time_utc)}
                      </p>
                      {expiredEventIds.has(eventRecord.event_id) ? (
                        <span className="mt-2 inline-flex items-center rounded-full bg-amber-200/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                          Expired
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => startEditing(eventRecord)}
                        disabled={isLoading}
                      >
                        {editingId === eventRecord.event_id
                          ? "Editing"
                          : "Edit"}
                      </button>
                      <button
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => deleteEvent(eventRecord.event_id)}
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {eventRecord.tracks.map((track) => (
                      <div
                        key={track.track_id}
                        className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {track.track_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {track.track_url}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {formatDuration(track.track_duration_seconds)}
                          </span>
                        </div>
                        <audio
                          controls
                          preload="none"
                          src={track.track_url}
                          className="mt-2 w-full"
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingId ? "Edit event" : "Select an event to edit"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose an event from the list to update its metadata. Dates are in
            your local timezone and are persisted as UTC.
          </p>

          {editingId ? (
            <form className="mt-6 space-y-4" onSubmit={handleUpdateEvent}>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Event name
                </label>
                <input
                  className={fieldClasses}
                  type="text"
                  name="event_name"
                  value={formValues.event_name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Artist / DJ name
                </label>
                <input
                  className={fieldClasses}
                  type="text"
                  name="artist_name"
                  value={formValues.artist_name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Start time (local)
                </label>
                <input
                  className={fieldClasses}
                  type="datetime-local"
                  name="start_time_utc"
                  value={formValues.start_time_utc}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  End time (local)
                </label>
                <input
                  className={fieldClasses}
                  type="datetime-local"
                  name="end_time_utc"
                  value={formValues.end_time_utc}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  onClick={cancelEditing}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Select an event from the left-hand column to populate the editing
              form.
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ManageEventsPage;
