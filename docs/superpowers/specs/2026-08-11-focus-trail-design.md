# Focus Trail Design

## Goal

Give signed-in Synapse users a cross-device record of the calendar days on
which they enter Focus Room. The existing Focus Trail button opens the
experience; existing Focus Room placement, navigation, and visual language do
not change.

## Entry rule

Pressing **Enter Focus Room** creates a trail entry immediately. Viewing setup,
changing scene or sound settings, and finishing a session do not create an
additional entry. Multiple entries on one local calendar day count as one
active day.

## Data model and synchronisation

Reuse the authenticated `focus_sessions` API and `focus_sessions` table. Add
`focus_trail_date date` and `focus_timezone text` columns through the existing
Supabase schema migration. Supabase is the source of truth for these values.
At room entry, create an `active` session with a stable session ID, UTC
`startedAt`, the user's IANA timezone, and their local `YYYY-MM-DD` trail date.
At session end, update that same Supabase row to `completed` with the final
focus duration.

Focus Trail derives data from sessions rather than adding a table:

- active days: unique saved trail dates across all sessions;
- current streak: consecutive local trail dates ending today or yesterday;
- thirty-day trail: the last 30 local dates and whether each has an entry;
- today: entry count and completed focus minutes;
- recent sessions: newest synced session records, including an active session.

Persist the entry locally before network synchronisation. Pending writes retry
without preventing Focus Room entry. If the API cannot be reached, the current
device still shows local trail data and labels the result as awaiting sync.
Anonymous users may focus normally but receive the existing sign-in prompt for
cross-device history.

## UI

The existing Focus Trail button continues to open the existing drawer/sheet.
Replace its authenticated placeholder with, in order:

1. all-time active-day count and current streak;
2. a compact 30-day, 5-by-6 trail grid;
3. today’s entry count and completed focus minutes;
4. recent sessions, including an active state when applicable.

The page hierarchy, control locations, and panel footprint remain unchanged.
Light mode uses transparent white liquid glass; dark mode retains blue glass.
Blue indicates an active/selected trail day. One-time cell entry animation is
disabled under `prefers-reduced-motion`.

## Error handling

Trail reads use the remote Supabase-backed session API first, falling back to
local session data only while a write is pending. Failed writes remain locally
queued and are retried on the next Focus Room load or authenticated read.
Duplicate retries must preserve one Supabase session record through the stable
session ID.

## Verification

Automated checks cover immediate entry persistence, one active day per local
date, timezone dates, Supabase-backed trail reads, streak calculation, pending
synchronisation fallback, session completion updates, and the existing Focus
Trail control rendering the populated panel. Browser verification covers the
panel in both themes and reduced-motion fallback.
