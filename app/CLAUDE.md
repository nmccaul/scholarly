@AGENTS.md

# Scholarly

An LTI 1.3 Advantage-compliant tool that integrates into Canvas LMS to deliver AI-powered assignment types. A single Canvas integration exposes a platform where teachers select from a library of AI-native assignments, configure them, and receive automatic grade passback.

## Key Documents

- `../PRD.md` — Full product requirements, user flows, API design, and engineering principles
- `../LTI_1.3_INTEGRATION_GUIDE.md` — LTI 1.3 spec reference for Canvas integration

## What's Built

### LTI Infrastructure (`src/lib/lti/`, `src/app/api/lti/`)
- `GET /api/lti/jwks` — Serves tool's RSA public key set to Canvas
- `POST /api/lti/login` — OIDC third-party login initiation (Step 1)
- `GET /api/lti/login` — Same, for Canvas GET-based initiations
- `POST /api/lti/launch` — Receives Canvas's signed JWT, validates it, creates session, routes by message type
- Full JWT validation: signature (RS256), `iss`, `aud`, `exp`, `iat`, `nonce` (consumed via Redis), `state` (CSRF), `deployment_id`, `version`, `messageType`
- Dev bypass mode: set `LTI_DEV_MODE=true` to skip OIDC and use a mock instructor session

### Session (`src/lib/lti/session.ts`)
- Sessions are signed JWTs stored in httpOnly cookies
- `sameSite: none; Secure` in production (required for Canvas iframe), `sameSite: lax` in dev
- `requireSession()` and `requireInstructor()` guards for API routes

### Database (`supabase/migrations/`)
- Migration `001_initial_schema.sql` — All tables, enums, indexes, RLS, dev seed data
- Migration `002_schema_best_practices.sql` — FK indexes, RLS performance, FORCE RLS, updated_at triggers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) on Vercel |
| Database | Supabase (PostgreSQL) |
| Ephemeral store | Upstash Redis (nonce/state, 10-min TTL) |
| AI | OpenAI (Whisper for transcription, GPT-4o for follow-ups and grading) |
| Auth | LTI 1.3 OIDC — no separate auth system |

## Environment Variables

See `.env.local.example`. Required before running:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `OPENAI_API_KEY`
- `LTI_PRIVATE_KEY_PEM` — generate with `openssl genrsa -out private.pem 2048`, paste full PEM
- `LTI_KEY_ID` — key identifier served in JWKS (default: `scholarly-key-1`)
- `SESSION_SECRET` — any long random string
- `NEXT_PUBLIC_APP_URL` — full URL (e.g. `https://yourapp.vercel.app`)
- `LTI_DEV_MODE=true` — bypasses LTI OIDC in development

## Dev Seed Data

When `LTI_DEV_MODE=true`, the mock session uses these fixed IDs (already in Supabase):
- Registration: `00000000-0000-0000-0000-000000000001`
- Teacher user: `00000000-0000-0000-0000-000000000002`
- Course: `00000000-0000-0000-0000-000000000003`

## Engineering Rules

- All API routes explicitly validate session and role — no implicit middleware auth
- Service role key only used server-side; never exposed to client
- Nonces stored in Redis (not Postgres) with TTL — consumed on use, rejected if seen twice
- Domain IDs (`UserId`, `CourseId`, etc.) are branded types — never use raw strings for IDs
- `updated_at` is managed by DB trigger — do not set it in application code
- Unknown JWT claims are silently ignored (LTI forward-compatibility requirement)

---

## Deferred — Deal With Later

Items deferred from active development. Revisit before launch or when the relevant feature is built.

### 1. UUIDv7 Primary Keys
**What:** All tables currently use `gen_random_uuid()` (UUIDv4 — random). Random UUIDs cause B-tree index fragmentation at scale because inserts scatter across the index rather than appending to the end.

**Fix when:** Table sizes approach 100k+ rows, or before a production launch.

**How:**
```sql
-- Enable the extension (available in Supabase)
create extension if not exists pg_uuidv7;

-- Update defaults on all tables
alter table users alter column id set default uuid_generate_v7();
alter table courses alter column id set default uuid_generate_v7();
alter table assignments alter column id set default uuid_generate_v7();
-- ... repeat for all tables
```
Note: Dev seed data uses fixed UUIDs (`00000000-...`) which remain unaffected.

---

### 2. IMS Global LTI Advantage Certification
**What:** Required to be listed in the Canvas Edu App Center (discoverable by all institutions). Not required for manually-installed deployments.

**Fix when:** Ready for broad institutional distribution.

**How:** Run the tool through the 1EdTech conformance test suite at https://www.imsglobal.org/lti-advantage-conformance-test — expect 4–8 weeks of iteration.

---

### 3. Cookie-Free Launch (Safari / Strict Cookie Environments)
**What:** Safari and some institutional browsers block third-party cookies in iframes. The current session cookie approach will fail for those users. Canvas supports a postMessage-based `lti.put_data` / `lti.get_data` API as a fallback.

**Fix when:** Safari compatibility becomes a user complaint, or before broad rollout.

**How:** Detect `lti_storage_target` parameter in the login initiation request. If present, use postMessage storage instead of cookies for `state`. See Section 12 of `LTI_1.3_INTEGRATION_GUIDE.md`.

---

### 4. FERPA / COPPA Compliance Documentation
**What:** Required before selling to US educational institutions, particularly K-12. Covers student data handling, retention policies, and parental consent flows.

**Fix when:** Before any institutional sales or contracts.

---

### 5. Access Token Caching (AGS)
**What:** Each grade passback currently will request a new OAuth 2.0 access token from Canvas. Tokens are valid for 3600 seconds and should be cached and reused until near-expiry.

**Fix when:** Building the AGS grade passback feature.

**How:** Cache token + `expires_at` in Upstash Redis keyed by `registrationId + scope`. Reuse if `expires_at - now > 60s`.

---

### 6. Delete Assignment Does Not Remove Canvas Lineitem
**What:** `deleteAssignment` removes the assignment from our DB but leaves the Canvas gradebook column (lineitem) intact. If a student subsequently clicks the Canvas assignment link, the LTI launch succeeds but the tool returns "Assignment not found."

**Fix when:** Before real instructors use the tool in a live course.

**How:** Two options — (a) call `DELETE /lineitems/{id}` via AGS before deleting our record, or (b) soft-delete: add a `status = 'archived'` path so the LTI launch can show a graceful "this assignment has been removed" message instead of a 404 error. Option (b) is safer because it handles the race between a student clicking and the instructor deleting.

---

### 7. Edit Assignment Does Not Update Canvas Lineitem scoreMaximum
**What:** `updateAssignment` updates `points_possible` in our DB, but the Canvas gradebook column stores its own `scoreMaximum` on the lineitem resource. After a rubric edit that changes the point total, Canvas will display the old total while our DB uses the new one.

**Fix when:** Before real instructors use the tool in a live course.

**How:** After updating the DB, call `PATCH /lineitems/{id}` with `{ "scoreMaximum": newPointsPossible }` using the AGS access token. Only needed when `pointsPossible` actually changes. Requires `ltiLineitemUrl` to be set (assignments created before AGS was wired won't have it).
