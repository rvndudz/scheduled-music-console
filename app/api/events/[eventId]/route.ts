import { NextResponse } from "next/server";

import type { EventRecord } from "@/types/events";
import {
  ensureIsoDate,
  ensureTracks,
  persistEvents,
  readEventsFile,
  ValidationError,
} from "@/lib/events";
import { deleteObjectsForUrls } from "@/lib/r2Client";

export const runtime = "nodejs";

type RouteParams = {
  params: { eventId: string };
};

const findEventIndex = (events: EventRecord[], eventId: string) =>
  events.findIndex((event) => event.event_id === eventId);

export async function PUT(request: Request, { params }: RouteParams) {
  const { eventId } = params;

  try {
    const events = await readEventsFile();
    const index = findEventIndex(events, eventId);

    if (index === -1) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new ValidationError("Invalid JSON payload.");
    }

    if (Object.keys(payload).length === 0) {
      throw new ValidationError("No fields provided to update.");
    }

    const currentEvent = events[index];
    const updatedEvent: EventRecord = { ...currentEvent };

    if ("event_name" in payload) {
      const eventName = payload.event_name;
      if (typeof eventName !== "string" || !eventName.trim()) {
        throw new ValidationError("event_name is required.");
      }
      updatedEvent.event_name = eventName.trim();
    }

    if ("artist_name" in payload) {
      const artistName = payload.artist_name;
      if (typeof artistName !== "string" || !artistName.trim()) {
        throw new ValidationError("artist_name is required.");
      }
      updatedEvent.artist_name = artistName.trim();
    }

    if ("start_time_utc" in payload) {
      updatedEvent.start_time_utc = ensureIsoDate(
        payload.start_time_utc,
        "start_time_utc",
      );
    }

    if ("end_time_utc" in payload) {
      updatedEvent.end_time_utc = ensureIsoDate(
        payload.end_time_utc,
        "end_time_utc",
      );
    }

    if ("tracks" in payload) {
      updatedEvent.tracks = ensureTracks(payload.tracks);
    }

    if (
      new Date(updatedEvent.end_time_utc).getTime() <=
      new Date(updatedEvent.start_time_utc).getTime()
    ) {
      throw new ValidationError("end_time_utc must be after start_time_utc.");
    }

    events[index] = updatedEvent;
    await persistEvents(events);

    return NextResponse.json({ event: updatedEvent }, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(`Failed to update event ${params.eventId}:`, error);
    return NextResponse.json(
      { error: "Unexpected error while updating the event." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { eventId } = params;

  try {
    const events = await readEventsFile();
    const index = findEventIndex(events, eventId);

    if (index === -1) {
      return NextResponse.json(
        { error: "Event not found." },
        { status: 404 },
      );
    }

    const deletedEvent = events[index];
    const nextEvents = [
      ...events.slice(0, index),
      ...events.slice(index + 1, events.length),
    ];

    try {
      await deleteObjectsForUrls(
        deletedEvent.tracks.map((track) => track.track_url),
      );
    } catch (error) {
      console.error(`Failed to delete track files for event ${eventId}:`, error);
      return NextResponse.json(
        { error: "Unable to delete event assets from storage." },
        { status: 502 },
      );
    }

    await persistEvents(nextEvents);

    return NextResponse.json(
      { deleted: deletedEvent.event_id, remaining: nextEvents.length },
      { status: 200 },
    );
  } catch (error) {
    console.error(`Failed to delete event ${eventId}:`, error);
    return NextResponse.json(
      { error: "Unexpected error while deleting the event." },
      { status: 500 },
    );
  }
}
