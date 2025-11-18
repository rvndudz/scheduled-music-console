import path from "node:path";
import { promises as fs } from "node:fs";

import type { EventRecord, TrackRecord } from "@/types/events";
import { normalizeUtcDateString } from "@/lib/timezone";

export const eventsFilePath = path.join(process.cwd(), "data", "events.json");

export class ValidationError extends Error {}

export const ensureIsoDate = (value: unknown, field: string): string => {
  try {
    return normalizeUtcDateString(value, field);
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
};

export const ensureTracks = (tracks: unknown): TrackRecord[] => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new ValidationError("At least one track is required.");
  }

  return tracks.map((track, index) => {
    if (typeof track !== "object" || track === null) {
      throw new ValidationError(`Track #${index + 1} is invalid.`);
    }

    const {
      track_id,
      track_name,
      track_url,
      track_duration_seconds,
    } = track as Record<string, unknown>;

    if (typeof track_id !== "string" || !track_id.trim()) {
      throw new ValidationError(`Track #${index + 1} is missing track_id.`);
    }

    if (typeof track_name !== "string" || !track_name.trim()) {
      throw new ValidationError(`Track #${index + 1} is missing track_name.`);
    }

    if (typeof track_url !== "string" || !track_url.trim()) {
      throw new ValidationError(`Track #${index + 1} is missing track_url.`);
    }

    const duration = Number(track_duration_seconds);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ValidationError(
        `Track #${index + 1} has an invalid track_duration_seconds.`,
      );
    }

    return {
      track_id,
      track_name,
      track_url,
      track_duration_seconds: Math.round(duration),
    };
  });
};

export const readEventsFile = async (): Promise<EventRecord[]> => {
  try {
    const raw = await fs.readFile(eventsFilePath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as EventRecord[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(eventsFilePath), { recursive: true });
      return [];
    }

    throw error;
  }
};

export const persistEvents = async (events: EventRecord[]) => {
  await fs.mkdir(path.dirname(eventsFilePath), { recursive: true });
  await fs.writeFile(
    eventsFilePath,
    `${JSON.stringify(events, null, 2)}\n`,
    "utf-8",
  );
};

export const isEventExpired = (
  event: EventRecord,
  referenceDate = new Date(),
) => new Date(event.end_time_utc).getTime() <= referenceDate.getTime();

export type { EventRecord, TrackRecord };
