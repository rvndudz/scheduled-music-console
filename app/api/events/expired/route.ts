import { NextResponse } from "next/server";

import { isEventExpired, persistEvents, readEventsFile } from "@/lib/events";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    const events = await readEventsFile();
    const now = new Date();
    const activeEvents = events.filter((event) => !isEventExpired(event, now));
    const deleted = events.length - activeEvents.length;

    if (deleted === 0) {
      return NextResponse.json(
        { deleted: 0, remaining: events.length },
        { status: 200 },
      );
    }

    await persistEvents(activeEvents);
    return NextResponse.json(
      { deleted, remaining: activeEvents.length },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete expired events:", error);
    return NextResponse.json(
      { error: "Unable to delete expired events." },
      { status: 500 },
    );
  }
}
