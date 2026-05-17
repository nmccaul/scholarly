@AGENTS.md

# Scholarly

An LTI 1.3 Advantage-compliant tool that integrates into Canvas LMS to deliver AI-powered assignment types. A single Canvas integration exposes a platform where teachers select from a library of AI-native assignments, configure them, and receive automatic grade passback.

## Research Foundation & Product Philosophy

Scholarly's product decisions are grounded in three research findings that should inform every feature decision:

**1. Structure determines AI's impact — Dell'Acqua et al., 2023 (Harvard Business School)**
A controlled experiment with 758 BCG consultants found that structured AI use improved work quality by 40%, while unstructured AI use produced results 19% *worse* than no AI at all. The same tool, used differently, produced opposite outcomes. This is the core premise of the product: the question is not whether students use AI, but whether they use it with intentionality and structure.

**2. AI confidence erodes critical thinking — Lee et al., 2025 (Microsoft)**
Higher confidence in AI correlated with *less* critical thinking. The people who believed they were best at using AI often had the most deteriorated analytical skills — and had no awareness it was happening. This is why Scholarly's assignment types keep student thinking at the center; AI assists, assesses, or challenges, but never replaces the cognitive act.

**3. Near-universal adoption without instruction — Programs.com, 2025**
92% of college students now use AI for academic work. Almost no one has been taught how to use it well. The gap between adoption and understanding is the environment Scholarly is built for.

**The philosophical position:** It is teachers' responsibility to create the structured environment in which AI use leads to learning rather than its erosion.

**Process visibility — the teacher intelligence layer:** Traditional LMS tools show teachers what a student produced, not how they got there. Apturi generates a record of student reasoning — spoken responses, follow-up exchanges, reading checkpoints — giving teachers insight into thinking, not just results. The goal is not just a gradebook but a window into how a class thinks: who genuinely understands, who is performing, and where instruction needs to go next.

**The dual flywheel:** Apturi's assignments are designed to do two things at once. For students, they create the conditions for deeper thinking — explaining, defending, and engaging with material in real time develops the critical thinking that passive submission never requires. For teachers, those same moments generate the process visibility that makes better instruction possible. The same assignment that amplifies student learning gives teachers the intelligence to amplify it further.

**The AI Mode Framework**
Scholarly's assignment library is organized around four modes that describe AI's role in any assignment. Every assignment type has an `AssignmentMode` (see `src/types/domain.ts`) used internally to categorize and reason about it. The displayed UI badge (`roleLabel`) is still the more granular pedagogy label, but the underlying mode is what we use for design decisions and future grouping.

| Mode | Student action | AI role | Learning science basis | Best use |
|---|---|---|---|---|
| **No AI** (`'none'`) | Student works independently | None | Assessment validity, independent retrieval | Exams, quizzes, baseline checks |
| **Tutor Mode** (`'tutor'`) | Student answers first, AI gives guidance | Coach or tutor | Retrieval practice, feedback, formative assessment | Concept review, practice, reading checks |
| **Teach Mode** (`'teach'`) | Student teaches the AI | Confused student | Protégé Effect, generative learning, elaboration | Deep understanding, explanation, discussion prep |
| **Collaborator Mode** (`'collaborator'`) | Student develops and improves ideas | Thought partner | Metacognition, elaboration, transfer | Essays, projects, case analysis |

**How current assignment types map to modes:**

| Assignment | UI badge | Mode |
|---|---|---|
| Oral Assessment | No AI | `none` |
| Adaptive Reading Quiz | AI as Tutor | `tutor` |
| Process Narration | AI as Mentor | `tutor` |
| Concept Explanation Challenge | AI as Student | `teach` |
| Checkpoint Reading | AI as Coach | `collaborator` |
| AI Debate Partner | AI as Teammate | `collaborator` |
| Socratic Seminar | AI as Simulator | `collaborator` |
| Research Validity Audit | AI as Tool | `collaborator` |

**Design implications:**
- Assignments sharing a mode share an interaction shape, so they can share infrastructure: e.g., all Tutor Mode assignments use the same checkpoint/follow-up engine and the same Channel × Standard sub-config (voice/text · engagement/actions).
- New assignment types must declare their mode in the type picker registry (`src/app/builder/TypePickerClient.tsx`).
- The displayed `roleLabel` is a more granular pedagogy taxonomy for teachers; the `mode` is the operational classification.

---

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
