## Scheduled Music Console

Next.js console for scheduling music blocks that client apps can treat like in‑game or in‑venue radio stations—no dedicated streaming server required. Upload MP3s once, collect their metadata, and publish a single JSON schedule your client can poll.

### Current Capabilities
- Create Event: uploads cover + tracks directly to Cloudflare R2 using presigned URLs, reads audio metadata client-side (duration, bitrate, size), auto-computes end time as start + total track length, stores times in UTC with `+00:00`, and shows a quick list of planned events in Sri Lanka time.
- Manage Events: list with inline players, edit tracklist/cover, delete single/all/expired events, and hide timing/expired badges for the special `default/default` event.
- Track insights: per-track duration, bitrate, size plus total playtime summaries.
- Single source of truth: events JSON is written to Cloudflare R2 (`json/events.json`) and cached locally; create/edit/delete keeps both in sync.
- Default guardrail: only one `default/default` event is allowed; API blocks additional defaults.
- Toasted UX: success/error info is delivered via modern toasts.

### Environment
Copy `.env.example` to `.env.local` (or `.env`) and set:

| Variable | Description |
| --- | --- |
| `R2_ACCESS_KEY` | Cloudflare R2 access key ID |
| `R2_SECRET_KEY` | Cloudflare R2 secret |
| `R2_BUCKET` | Bucket name |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | Public base URL, e.g. `https://pub-xxxxx.r2.dev` |
| `R2_JSON_KEY` | Key for the shared schedule file, e.g. `json/events.json` |

### Important Behaviors
- Times are entered in Sri Lanka time but stored in UTC as `YYYY-MM-DDTHH:mm:ss+00:00`.
- End time fields are not editable; they derive from track duration sums.
- Event windows cannot overlap (default event ignored for overlap checks).
- Only one default event is allowed.

### API Routes (summary)
- `POST /api/upload-track-url` → presigned PUT URL + public object URL for MP3 uploads.
- `POST /api/upload-cover` → uploads cover via server route.
- `POST /api/create-event` / `PUT /api/events/[eventId]` / `DELETE /api/events/[eventId]` → CRUD with overlap + default checks and R2 JSON writes.
- `GET /api/events` → list; `DELETE /api/events/expired` → clean expired.
- Legacy `POST /api/upload-track` exists but the UI uses the presign flow.

### Local Development
```bash
npm install
npm run dev
# http://localhost:3000/upload-event
```

### CORS and Upload Notes
- The browser PUTs directly to R2 using the presigned URL. Ensure your R2 bucket CORS allows `PUT, GET, HEAD, OPTIONS` from your deployed origin (for example `https://mixmaster-vr.vercel.app`) with `Access-Control-Allow-Origin` and `Access-Control-Allow-Headers: *`.
- Direct-to-R2 uploads avoid Vercel body size limits that would otherwise cause 413 errors.
