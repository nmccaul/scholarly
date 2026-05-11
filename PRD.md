# Scholarly — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-05-05  
**Status:** Draft

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [User Personas](#3-user-personas)
4. [System Architecture](#4-system-architecture)
5. [LTI Integration Spec](#5-lti-integration-spec)
6. [Assignment Type Registry](#6-assignment-type-registry)
7. [Future Assignment Type Roadmap](#7-future-assignment-type-roadmap)
8. [Feature Spec: Oral Assessment](#8-feature-spec-oral-assessment)
9. [Database Schema](#9-database-schema)
10. [API Design](#10-api-design)
11. [Engineering Principles](#11-engineering-principles)
12. [BYU Pilot Deployment](#12-byu-pilot-deployment)
13. [Near-Term Engineering Priorities](#13-near-term-engineering-priorities)
14. [Out of Scope (v1)](#14-out-of-scope-v1)

---

## 1. Product Overview

### Problem

**The problem is not that students use AI. It is that they use it without structure — and that is making them worse.**

In 2023, researchers at Harvard Business School ran a controlled experiment with 758 management consultants at Boston Consulting Group. Every consultant had access to the same AI tool. Two groups emerged: one used AI with structure and intentionality, following specific protocols for when and how to engage it. The other used AI however felt natural, with no particular system.

The structured group improved their work quality by 40%. The unstructured group performed 19% *worse* than consultants who did not use AI at all. Not "no improvement" — worse. The same tool, used differently, produced opposite outcomes. *(Dell'Acqua et al., 2023)*

A 2025 Microsoft study reinforced this concern. Researchers found that higher confidence in AI correlated with *less* critical thinking. The people who believed they were best at using AI were often the ones whose analytical skills had deteriorated the most — and they had no awareness it was happening. *(Lee et al., 2025)*

Meanwhile, 92% of college students now report using AI for academic work. Almost nobody has been taught how to use it well. *(Programs.com, 2025)*

That gap — between near-universal adoption and near-zero instruction — is the problem Scholarly addresses. And it is teachers' responsibility to create the structured environment in which AI use leads to learning rather than its erosion.

The secondary problem: most assignments still measure final output rather than the thinking behind it. Students can generate polished essays, discussion posts, and reading responses in seconds. Instructors need formats that reveal what students actually understand — not what they submitted.

### Solution

**A structured assignment layer for the AI era.**

Scholarly helps instructors create assignments where the structure itself determines how AI is used — and where that structure is grounded in learning science. Instead of banning AI or ignoring it, Scholarly gives teachers a framework for intentional AI integration and a library of assignment types built around it.

Every assignment type maps to one of eight pedagogically distinct AI roles — from No AI (pure independent assessment) to AI as Teammate, Tutor, Simulator, and more — based on Mollick & Mollick's peer-reviewed framework. Teachers choose the role, Scholarly builds the format around it.

Students speak, question, discuss, and reflect rather than just submitting final products. Instructors get evidence of reasoning, not just output.

### Teacher Intelligence

Traditional LMS tools give teachers a grade and a submission. They show what a student produced, but nothing about how they got there. In an AI-enabled world, that gap is critical — a polished essay or correct answer is no longer reliable evidence of understanding.

Apturi is built around **process visibility**. Every assignment generates a record of student reasoning — spoken responses, real-time follow-up exchanges, reading checkpoint answers — not just a final product. Teachers see where students got confident, where they hesitated, what they couldn't explain under pressure.

This gives instructors a new kind of intelligence: not just "who passed and who failed," but "who actually understands this and who is performing." That insight surfaces the misconceptions worth addressing in class, identifies students who need more scaffolding, and makes teachers meaningfully better at their jobs. The teacher dashboard is not a gradebook — it is a window into how a class thinks.

Apturi's assignments are designed to do two things at once. For students, they create the conditions for deeper thinking — explaining, defending, and engaging with material in real time develops the critical thinking that passive submission never requires. For teachers, those same moments generate the process visibility that makes better instruction possible: not just who answered correctly, but who reasoned well, who struggled with what, and where the class needs to go next.

The same assignment that amplifies student learning gives teachers the intelligence to amplify it further.

### Platform

Scholarly is an LTI 1.3 Advantage-compliant tool that integrates into Canvas LMS to deliver AI-powered assignment types that don't exist in traditional LMSes. A single Canvas integration exposes a platform where teachers can select from a growing library of AI-native assignment formats, configure them, and receive automatic grade passback.

**Platform philosophy: AI-native assignments should measure how students think, not just what they submit.** Traditional LMS assignments — file uploads, quizzes, discussion posts — capture a product. Scholarly captures a process: the reasoning, the spoken defense, the conversation, the moment of reading. That distinction is what makes these formats both more pedagogically valuable and harder to game with AI tools.

The first shipped assignment type is the **Oral Assessment**: a structured spoken response experience where a student reads a prompt, records a video response, and is questioned by an AI to probe depth of understanding. The response is transcribed, auto-graded against a rubric, and the grade is returned to Canvas.

All other assignment types described in this document are **registered but unbuilt** — they appear to teachers as "coming soon" to validate demand and collect requests.

---

## 2. Goals & Non-Goals

### Goals

- Ship a working Oral Assessment end-to-end: teacher configures → student submits → grade appears in Canvas gradebook
- Build a single Canvas LTI integration that serves all present and future assignment types
- Establish a clean, extensible architecture so new assignment types require zero LTI changes
- Provide a teacher dashboard for reviewing submissions and overriding AI grades
- Collect teacher interest data on future assignment types

### Non-Goals (v1)

- Building any assignment type other than Oral Assessment
- Supporting LMSes other than Canvas
- Mobile native apps (browser only)
- Plagiarism detection
- Group/collaborative assignments
- Peer review workflows
- Custom LLM model selection by teacher
- SSO outside of LTI context

---

## 3. User Personas

### Teacher
Creates and manages assignments. Accesses Scholarly via Canvas Deep Linking when building an assignment. Reviews student submissions in the Scholarly dashboard. Can override AI grades. Primary decision-maker for tool adoption.

**Needs:** Simple configuration, trust in AI grading, ability to audit and override, clear student progress visibility.

### Student
Completes assignments. Accesses Scholarly via Canvas assignment link. Has no Scholarly account — identity comes entirely from LTI launch.

**Needs:** Clear instructions, reliable recording experience, fast feedback, no friction around login.

### Canvas Admin (Institutional)
Installs and manages the developer key. Deploys the tool to accounts or courses. Not a daily user.

**Needs:** Simple one-time setup, privacy level controls, confidence in data handling.

---

## 4. System Architecture

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 (App Router) | SSR for LTI launches, RSC for dashboard, Vercel deployment |
| Backend | Next.js API Routes + Server Actions | Co-located with frontend, edge-compatible |
| Primary Database | Supabase (PostgreSQL) | Relational structure matches LTI data model, RLS for multi-tenancy |
| File Storage | Supabase Storage | Video recordings, co-located with DB |
| Ephemeral Store | Upstash Redis | Nonce/state storage with native TTL — not Postgres |
| AI Transcription | OpenAI Whisper API | Accurate, supports multiple languages |
| AI Conversation & Grading | OpenAI GPT-4o | Follow-up questions and rubric-based grading |
| Deployment | Vercel | Preview URLs for LTI dev/test, edge network |

### High-Level Component Map

```
Canvas LMS
    │
    │  LTI 1.3 (OIDC + JWT)
    ▼
┌─────────────────────────────────────────┐
│  Scholarly (Next.js on Vercel)          │
│                                         │
│  /api/lti/*        LTI endpoints        │
│  /app/builder/*    Assignment builder   │
│  /app/assess/*     Student experience   │
│  /app/dashboard/*  Teacher dashboard    │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Supabase   │   │  Upstash Redis  │  │
│  │  Postgres   │   │  nonce / state  │  │
│  │  Storage    │   └─────────────────┘  │
│  └─────────────┘                        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  OpenAI (Whisper + GPT-4o)      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Multi-Tenancy Model

Every row of application data is scoped to an `lti_registration`. A registration maps to one Canvas instance (one `client_id` / `iss` pair). Row Level Security in Supabase enforces that a request can only read data belonging to its registration. This is the foundational isolation boundary — no application-level logic should be trusted to enforce it alone.

---

## 5. LTI Integration Spec

### Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/lti/login` | POST | OIDC third-party initiation (Step 1 handler) |
| `/api/lti/launch` | POST | OIDC redirect URI — receives `id_token` + `state` |
| `/api/lti/jwks` | GET | Serves tool's RSA public key set |
| `/api/lti/deep-link` | POST | Entry point for Deep Linking launches |

### Launch Flow Summary

1. Canvas POSTs to `/api/lti/login` with `iss`, `login_hint`, `client_id`, `deployment_id`, `target_link_uri`
2. Server validates `iss` + `client_id` against `lti_registrations` table
3. Server generates cryptographically random `state` (128-bit) and `nonce` (128-bit)
4. State and nonce stored in Upstash Redis with 10-minute TTL
5. Server redirects browser to Canvas OIDC auth endpoint with required params
6. Canvas returns signed JWT to `/api/lti/launch` via form POST
7. Server verifies JWT: signature (RS256 via Canvas JWKS), `iss`, `aud`, `exp`, `nonce`, `deployment_id`
8. Nonce marked consumed in Redis (reject if already seen)
9. User upserted in `users` table (keyed on `sub` + `registration_id`)
10. Course upserted in `courses` table (keyed on `context_id` + `registration_id`)
11. Route based on `message_type`:
    - `LtiResourceLinkRequest` → student/teacher resource view
    - `LtiDeepLinkingRequest` → assignment builder

### Deep Linking Flow

1. Teacher clicks "Scholarly" in Canvas assignment builder
2. Canvas sends `LtiDeepLinkingRequest` to `/api/lti/deep-link`
3. Teacher is shown the assignment type picker in Scholarly
4. Teacher selects type, configures assignment, submits
5. Server creates `assignment` record, constructs `LtiDeepLinkingResponse` JWT
6. Auto-submitted form POST returns JWT to Canvas `deep_link_return_url`
7. Canvas creates the assignment with a resource link back to Scholarly

### Canvas Configuration (Developer Key JSON)

```json
{
  "title": "Scholarly",
  "description": "AI-powered assignment types for the modern classroom",
  "oidc_initiation_url": "https://<domain>/api/lti/login",
  "target_link_uri": "https://<domain>/api/lti/launch",
  "public_jwk_url": "https://<domain>/api/lti/jwks",
  "scopes": [
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
  ],
  "extensions": [
    {
      "platform": "canvas.instructure.com",
      "privacy_level": "public",
      "settings": {
        "placements": [
          {
            "placement": "assignment_selection",
            "message_type": "LtiDeepLinkingRequest",
            "target_link_uri": "https://<domain>/api/lti/deep-link"
          }
        ]
      }
    }
  ]
}
```

### JWT Validation Requirements

Every inbound JWT from Canvas must pass all checks before any application logic runs:

- [ ] Signature valid against Canvas's JWKS (fetched and cached, not hardcoded)
- [ ] `iss` matches registered issuer for the `client_id`
- [ ] `aud` contains our `client_id`
- [ ] `exp` is in the future
- [ ] `iat` is within 5 minutes of now
- [ ] `nonce` exists in Redis and has not been consumed
- [ ] `deployment_id` matches a known registration
- [ ] `target_link_uri` matches a known Scholarly endpoint

Failure of any check returns HTTP 401 and logs the violation. No partial processing.

### Grade Passback (AGS)

- Access token obtained via JWT Client Credentials grant scoped to minimum required scope per operation
- Tokens cached until `expires_in - 60` seconds
- Score submission uses `application/vnd.ims.lis.v1.score+json`
- `lineitem` URL stored on the `assignments` record at creation time (from Deep Link response)
- All sync attempts logged in `grade_sync_log` with Canvas response body

---

## 6. Assignment Type Registry

The following types are shown in the assignment builder. Only **Oral Assessment** is buildable in v1. All others display a "Request this assignment type" CTA that records teacher interest.

| # | Type | Status | Description |
|---|------|--------|-------------|
| 1 | **Oral Assessment** | ✅ **Built (V1)** | Student speaks a response; AI transcribes, asks follow-up questions, and grades against a rubric |
| 2 | **Smart Matching Discussion** | 🎯 **Priority** | AI reads all posts in a cohort and assigns each student specific peers to respond to based on complementary viewpoints and knowledge gaps |
| 3 | **Interactive Reading** | 🎯 **Priority** | AI drops in-context questions as the student reads, gating progress; ends with a spoken summary the student cannot fake |
| 4 | Concept Explanation Challenge | 🔒 Coming Soon | "Explain this to a 5-year-old" — tests depth of understanding via simplification |
| 5 | Socratic Seminar Simulation | 🔒 Coming Soon | AI plays devil's advocate; student defends a position through multi-turn dialogue |
| 6 | AI Debate Partner | 🔒 Coming Soon | Student debates a topic against an AI opponent with structured rebuttals |
| 7 | Research Validity Audit | 🔒 Coming Soon | Student evaluates a mixed set of credible and flawed AI-generated sources |
| 8 | Process Narration | 🔒 Coming Soon | Student narrates their problem-solving process in real time while solving |
| 9 | Peer Review Simulation | 🔒 Coming Soon | AI generates a realistic but flawed submission for the student to critique |
| 10 | Adaptive Reading Quiz | 🔒 Coming Soon | AI generates a branching question tree from a teacher-uploaded text; adapts to student answers |

Teacher interest votes are stored in `assignment_type_requests` and surfaced in an internal dashboard.

---

## 7. Future Assignment Type Roadmap

### Platform Architecture for Multiple Types

Scholarly is built as a platform, not a single-purpose tool. Every assignment type shares the same LTI infrastructure — OIDC login, JWT validation, Deep Linking, AGS grade passback, NRPS roster — and differs only in its configuration schema and student experience. Adding a new type requires:

1. A new `assignment_type` enum value in the database
2. A new `*_config` table for type-specific teacher settings
3. A new `*_submission` table for type-specific student data
4. A new teacher configuration UI (shown in the assignment builder after type selection)
5. A new student experience route under `/app/assess/[assignmentId]`
6. A new AI prompt and grading module

No changes to LTI endpoints, session handling, grade passback, or multi-tenancy are required. A new assignment type is a self-contained feature addition, not a platform change.

### What Makes a Good Scholarly Assignment Type

Every assignment type must be grounded in the platform's core philosophy: **measure how students think, not just what they submit.** A Scholarly assignment captures process — reasoning, spoken defense, real-time reading engagement, live conversation — not just a deliverable that can be produced without understanding.

Operationally, each type must satisfy all of the following:

- **AI-native** — the format is meaningfully better with AI and would not exist without it
- **Not replicable in Canvas** — teachers cannot approximate it with a quiz, discussion, or file submission
- **Rubric-gradable** — the student output can be evaluated against instructor-defined criteria
- **Grade-passback eligible** — produces a numeric score that belongs in the Canvas gradebook
- **AI-resistant** — the format is difficult to game with a language model because it requires a student to be present, respond in context, or interact with other real students

### Build Priority

New types are prioritized by three factors:
1. **Strategic moat** — types that create network effects, a data flywheel, or competitive differentiation that is hard to replicate
2. **Teacher interest votes** — recorded when a teacher clicks "Request this assignment type" on a coming-soon card
3. **Pipeline reuse** — types that reuse existing infrastructure (recording, transcription, grading) ship faster

---

### Priority Pipeline

These two types are the primary focus after Oral Assessment. They expand Scholarly from an assessment tool into a platform that engineers and guarantees the learning experience itself.

---

#### Type 2 — Smart Matching Discussion 🎯 Priority

**The problem with existing discussion boards:** Students post their response, then reply to whoever they want — usually the first two posts or their friends. The quality of the conversation is left entirely to chance. AI-graded discussion tools (like Packback) score individual post quality but leave the *conversation* unorchestrated.

**What Smart Matching does:** The AI reads every student's initial post across the entire cohort before assigning responses. It matches students based on:
- **Complementary viewpoints** — pairing students whose arguments directly address or contradict each other
- **Knowledge gaps** — routing a student who misunderstood a concept toward one who explained it clearly
- **Unexplored angles** — identifying which threads in the discussion haven't been challenged yet
- **Engagement balance** — ensuring no student is a dead end and every post gets a meaningful response

Each student receives 2–3 specific peers to respond to, along with a brief AI-written prompt explaining why the match was made ("Student A made an argument about X that directly challenges your claim about Y").

**Submission format — teacher's choice:**

The teacher configures whether the discussion is text-based or video-based at assignment creation. This setting applies to both initial posts and responses.

| Mode | How it works | Best for |
|---|---|---|
| **Text** | Students type their post; AI reads and matches on text content | Asynchronous courses, large cohorts, accessibility-first contexts |
| **Video** | Students record a spoken video response using the Scholarly recorder; AI transcribes it for matching and grading; peers watch the video before responding | Courses where presence and vocal reasoning matter — seminars, professional programs, communications |

In video mode, students see their assigned peers' faces and hear their reasoning before recording their own response. The AI matches on the transcript of each video, so the matching logic is identical. Responses are also video — the full exchange becomes a visible, human conversation rather than a text thread.

Video mode reuses the recording, transcription, and storage pipeline built for Oral Assessment. No new infrastructure is needed for the video path.

**Core mechanic:**
1. Teacher sets discussion prompt, submission format (text or video), rubric, and deadline for initial posts
2. Students submit their initial post (text or recorded video) by Phase 1 deadline
3. AI transcribes any video posts, then reads all posts across the cohort and generates match assignments
4. Students receive their matches — they can watch/read their assigned peers' posts directly in Scholarly before responding
5. Students submit their response (text or video) by Phase 2 deadline
6. AI grades the full exchange — initial post quality, response quality, and depth of engagement with the assigned match

**Why this is a moat:** This is the first Scholarly type with a genuine **network effect within a course** — the larger the cohort, the better the matching quality. It also creates a data flywheel: over time, Scholarly learns which pairings produce the best conversations, improving the matching model. No competitor currently does this. Packback grades posts; Scholarly engineers the conversation.

**AI-resistance:** A student can paste a ChatGPT post. They cannot have ChatGPT respond specifically and convincingly to the actual argument made in a specific peer's video, with an AI grader checking for genuine engagement with that peer's reasoning. Video mode strengthens this further — the student's face, voice, and unrehearsed delivery are part of the submission.

**Target disciplines:** Any course with discussion-based learning. Strong fit for humanities, social sciences, business case discussions, ethics. Video mode is especially valuable in communications, nursing, education, and professional programs where how students articulate ideas is part of the learning outcome.

**New infrastructure needed:** Cohort-level post ingestion before match assignment; two-phase submission timeline; match assignment UI for students; peer video playback within the Scholarly interface. Text path requires no new recording infrastructure; video path reuses the Oral Assessment pipeline.

---

#### Type 3 — Interactive Reading 🎯 Priority

**The problem with existing reading tools:** Perusall and similar annotation platforms use post-hoc annotation as a proxy for reading. In the AI era, this is trivially defeated — a student can paste any passage into ChatGPT and receive a thoughtful-sounding annotation in seconds. Perusall's response has been AI detection, which is a losing arms race.

**What Interactive Reading does:** The AI is present *while* the student reads, not waiting at the end. Reading becomes a synchronous experience with checkpoints that can only be passed by actually being there.

**Core mechanic:**
1. Teacher uploads a reading (PDF, URL, or pasted text) and configures checkpoint density and a final spoken summary
2. AI parses the text and identifies load-bearing moments — key claims, logical leaps, evidence introductions, moments of complexity
3. Student opens the reading in Scholarly's reader; text is displayed but scroll is gated
4. At each checkpoint, the AI surfaces a question specific to the passage just above — not answerable by prior knowledge or summary. Student must respond before proceeding
5. Responses are logged and evaluated for accuracy and depth
6. After completing the reading, the student records a 60–90 second spoken summary without the text visible. Same Scholarly transcription and grading pipeline applies
7. Final grade is a composite of checkpoint accuracy and summary quality; passed back to Canvas

**Why this is a moat:** The spoken summary is the critical lock. A language model can annotate any text. It cannot produce an unrehearsed spoken summary in a student's voice, at the moment of completion, graded against the actual argument structure of the specific reading assigned. This is the strongest AI-resistance story of any Scholarly assignment type — and the most compelling pitch to faculty desperate for genuine reading accountability.

**Target disciplines:** Any reading-intensive course. Especially strong for law (case briefs), medicine (clinical literature), humanities (primary sources), and any course where reading completion is prerequisite to class discussion.

**New infrastructure needed:** In-browser document reader with scroll gating; real-time checkpoint injection layer; checkpoint response storage; composite grading across checkpoints and spoken summary.

---

### Backlog

The following types are retained as future candidates. They will be evaluated against teacher interest data and strategic priority when the Priority Pipeline types are complete. All reuse the oral recording and transcription pipeline and require minimal new infrastructure.

| # | Type | Core Mechanic | Target Disciplines |
|---|------|---------------|--------------------|
| 4 | **Concept Explanation Challenge** | Student simplifies a complex concept for a non-expert; AI checks accuracy-under-simplification with follow-up questions | STEM, medicine, nursing, teacher education |
| 5 | **Socratic Seminar Simulation** | Multi-turn voice dialogue with AI as Socratic questioner; student defends a position under sustained challenge | Philosophy, law, history, liberal arts |
| 6 | **AI Debate Partner** | Student argues a position against an AI opponent that rebuts with evidence and logic | Communications, pre-law, political science, business |
| 7 | **Research Validity Audit** | AI provides a mixed set of credible and flawed sources; student evaluates each and justifies their reasoning | Research methods, journalism, information literacy |
| 8 | **Process Narration** | Student narrates their reasoning while solving a problem in real time; AI grades thinking, not just the answer | STEM, medicine, engineering, accounting |
| 9 | **Peer Review Simulation** | AI generates a realistic but deliberately flawed submission; student critiques it as if reviewing a peer's work | Writing-intensive disciplines, research methods |
| 10 | **Adaptive Reading Quiz** | Teacher uploads a text; AI generates a branching question tree that adapts based on student answers | Law, business, medicine, any reading-heavy course |

---

### Interest Tracking

Teacher interest in coming-soon types is captured in `assignment_type_requests`. The internal dashboard surfaces vote counts by type, surfacing which types to build next. Teachers can also leave a note explaining their specific use case — qualitative signal that informs how each type should be configured.

---

## 8. Feature Spec: Oral Assessment

### Overview

A teacher-configured spoken response assignment. The student reads a prompt, records a video/audio response, and optionally answers AI-generated follow-up questions. The full transcript is auto-graded against a rubric and the score is sent to Canvas.

### Teacher Configuration (Assignment Builder)

Accessed via Canvas Deep Link. Fields:

| Field | Type | Required | Validation | Default |
|-------|------|----------|-----------|---------|
| `title` | text | Yes | 1–200 chars | — |
| `prompt` | textarea | Yes | 10–2000 chars | — |
| `preparation_time_seconds` | number | Yes | 0–300 | 60 |
| `max_response_time_seconds` | number | Yes | 30–600 | 180 |
| `follow_up_question_count` | number | Yes | 0–5 | 2 |
| `camera_required` | boolean | Yes | — | true |
| `ai_grading_enabled` | boolean | Yes | — | true |
| `rubric` | array | Yes | 1–6 criteria | — |

**Rubric Criterion Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `label` | text | Yes | 1–100 chars |
| `description` | text | Yes | 1–500 chars |
| `max_points` | number | Yes | 1–100 |

Total rubric points must equal `points_possible` passed from Canvas in the Deep Link request.

### Student Experience Flow

```
1. Student clicks assignment in Canvas
        │
        ▼
2. LTI Resource Link Launch → /app/assess/[assignmentId]
        │
        ▼
3. PREPARATION SCREEN
   - Shows prompt
   - Countdown timer (preparation_time_seconds)
   - Camera/mic permission request
   - "Start Recording" button (enabled after permissions granted)
        │
        ▼
4. RECORDING SCREEN
   - Live camera preview
   - Recording timer (counts up, warns at 80% of max)
   - Transcript appears live (streamed from Whisper)
   - "Done" button (enabled after 10 seconds)
        │
        ▼
5. FOLLOW-UP SCREEN (if follow_up_question_count > 0)
   - AI-generated follow-up question displayed
   - Student records answer
   - Repeat for each follow-up
        │
        ▼
6. REVIEW SCREEN
   - Full transcript displayed (editable for corrections)
   - "Submit" button
        │
        ▼
7. PROCESSING SCREEN
   - AI grading in progress
   - Estimated wait time shown
        │
        ▼
8. RESULT SCREEN
   - Score displayed (if ai_grading_enabled)
   - Per-criterion breakdown
   - Transcript shown
   - Grade sent to Canvas gradebook
```

### Recording Technical Spec

- **API:** Browser `MediaRecorder` API with `getUserMedia`
- **Format:** `video/webm;codecs=vp8,opus` (primary), `video/mp4` (Safari fallback)
- **Upload:** Chunked upload to Supabase Storage during recording (every 5 seconds) — prevents data loss on connection drop
- **Storage path:** `recordings/{registration_id}/{assignment_id}/{submission_id}/response.webm`
- **Follow-up paths:** `recordings/.../followup_{n}.webm`
- **Max file size:** 500MB per submission (enforced client and server side)
- **Retention:** 90 days from submission date (configurable per institution in future)

### Transcription Spec

- Audio extracted from video and sent to OpenAI Whisper API (`whisper-1`)
- Transcription language: auto-detected
- Live transcription during recording: chunked audio posted to `/api/submissions/[id]/transcribe-chunk` every 5 seconds using streaming response
- Final transcription triggered on submission as a clean pass over full audio
- Transcript stored in `oral_assessment_submissions.transcript` (plain text)

### AI Follow-Up Question Generation

Prompt sent to GPT-4o:

```
You are an academic assessor evaluating a student's oral response.

Assignment prompt: {prompt}
Student's response transcript: {transcript}
Rubric criteria: {rubric_json}

Generate a single follow-up question that probes a gap or tests deeper 
understanding based on what the student said. The question should be 
direct, conversational, and specific to their response. Return only 
the question text — no preamble.
```

Follow-up questions and answers stored as ordered array in `follow_up_exchanges`.

### AI Grading Spec

Triggered after all recordings are submitted. Prompt sent to GPT-4o:

```
You are an academic assessor grading a student's oral assessment.

Assignment prompt: {prompt}

Rubric:
{rubric_criteria_with_descriptions_and_max_points}

Student's full transcript (initial response + follow-up exchanges):
{full_transcript}

Grade the student's performance on each criterion. For each criterion, 
provide:
1. A score (0 to max_points for that criterion)
2. A 1–2 sentence rationale

Respond as valid JSON matching this schema:
{
  "criteria_scores": [
    {
      "label": string,
      "score": number,
      "rationale": string
    }
  ],
  "overall_feedback": string
}

Be consistent, fair, and calibrated to the rubric. Do not infer 
information the student did not provide.
```

- Response parsed and validated against schema
- `ai_grade` = sum of `criteria_scores[].score`
- `ai_grade_rationale` = full JSON response stored in `oral_assessment_submissions`
- `final_grade` defaults to `ai_grade` until teacher overrides

### Grade Passback

1. On submission grading completion, call Canvas AGS score endpoint
2. Payload:
```json
{
  "userId": "<canvas sub>",
  "scoreGiven": <final_grade>,
  "scoreMaximum": <points_possible>,
  "activityProgress": "Completed",
  "gradingProgress": "FullyGraded",
  "timestamp": "<ISO 8601>"
}
```
3. Log result in `grade_sync_log`
4. If Canvas returns error, retry up to 3 times with exponential backoff
5. Surface sync failure in teacher dashboard

### Teacher Dashboard — Submissions View

Route: `/app/dashboard/[courseId]/[assignmentId]`

| Column | Source |
|--------|--------|
| Student name | `users.name` |
| Submitted at | `submissions.submitted_at` |
| AI grade | `oral_assessment_submissions.ai_grade` |
| Final grade | `oral_assessment_submissions.final_grade` |
| Canvas sync status | `grade_sync_log` latest entry |
| Actions | View, Override grade |

**Submission Detail View:**
- Video playback (from Supabase Storage signed URL, 1-hour expiry)
- Full transcript with follow-up exchanges
- AI grade breakdown per rubric criterion with rationale
- Grade override input (number field, 0 to points_possible)
- Teacher feedback text field
- "Save & Sync to Canvas" button

Grade override triggers a new AGS score submission and logs it.

### Error States

| Scenario | Handling |
|----------|---------|
| Camera/mic permission denied | Blocking error screen with instructions |
| Recording upload fails mid-session | Retry with exponential backoff; local blob backup in IndexedDB |
| Transcription API error | Submission allowed; grading marked as pending manual review |
| AI grading API error | Grade marked "Pending — AI unavailable"; teacher notified in dashboard |
| Canvas grade sync failure | Shown in dashboard; manual re-sync button available |
| Student submits twice | Second submission rejected; first is canonical |

---

## 9. Database Schema

All tables in Supabase PostgreSQL. All primary keys are UUIDs (`gen_random_uuid()`). All timestamps are `timestamptz` stored in UTC.

### Enums

```sql
CREATE TYPE assignment_type AS ENUM (
  'oral_assessment'
  -- future types added here as they are built
);

CREATE TYPE assignment_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE submission_status AS ENUM (
  'in_progress',
  'submitted',
  'grading',
  'graded',
  'error'
);

CREATE TYPE grade_sync_status AS ENUM (
  'pending',
  'success',
  'failed'
);
```

### Tables

```sql
-- ─────────────────────────────────────────
-- LTI Infrastructure
-- ─────────────────────────────────────────

CREATE TABLE lti_registrations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           text NOT NULL UNIQUE,
  deployment_id       text NOT NULL,
  platform_iss        text NOT NULL,
  platform_name       text,
  oidc_auth_url       text NOT NULL,
  jwks_url            text NOT NULL,
  token_url           text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_iss, client_id)
);

-- Nonces stored in Upstash Redis (not Postgres) — TTL-native
-- Schema documented here for reference:
-- KEY:   nonce:{nonce_value}
-- VALUE: { state, registration_id, consumed: false }
-- TTL:   600 seconds

-- ─────────────────────────────────────────
-- Users & Courses
-- ─────────────────────────────────────────

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id     uuid NOT NULL REFERENCES lti_registrations(id),
  lti_sub             text NOT NULL,
  email               text,
  name                text,
  given_name          text,
  family_name         text,
  picture_url         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, lti_sub)
);

CREATE TABLE courses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id     uuid NOT NULL REFERENCES lti_registrations(id),
  lti_context_id      text NOT NULL,
  title               text,
  label               text,
  canvas_course_id    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, lti_context_id)
);

-- ─────────────────────────────────────────
-- Assignments
-- ─────────────────────────────────────────

CREATE TABLE assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           uuid NOT NULL REFERENCES courses(id),
  created_by          uuid NOT NULL REFERENCES users(id),
  resource_link_id    text,
  lti_lineitem_url    text,
  title               text NOT NULL,
  type                assignment_type NOT NULL,
  points_possible     numeric(6,2) NOT NULL,
  status              assignment_status NOT NULL DEFAULT 'published',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oral_assessment_configs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id               uuid NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  prompt                      text NOT NULL,
  preparation_time_seconds    int NOT NULL DEFAULT 60,
  max_response_time_seconds   int NOT NULL DEFAULT 180,
  follow_up_question_count    int NOT NULL DEFAULT 2,
  camera_required             boolean NOT NULL DEFAULT true,
  ai_grading_enabled          boolean NOT NULL DEFAULT true,
  rubric                      jsonb NOT NULL,
  -- rubric shape: [{ label, description, max_points }]
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- Submissions
-- ─────────────────────────────────────────

CREATE TABLE submissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       uuid NOT NULL REFERENCES assignments(id),
  student_id          uuid NOT NULL REFERENCES users(id),
  status              submission_status NOT NULL DEFAULT 'in_progress',
  started_at          timestamptz NOT NULL DEFAULT now(),
  submitted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE oral_assessment_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id         uuid NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  recording_url         text,
  transcript            text,
  follow_up_exchanges   jsonb,
  -- shape: [{ question, answer_transcript, answer_recording_url }]
  ai_grade              numeric(6,2),
  ai_grade_rationale    jsonb,
  -- shape: { criteria_scores: [{ label, score, rationale }], overall_feedback }
  final_grade           numeric(6,2),
  teacher_feedback      text,
  graded_by             uuid REFERENCES users(id),
  -- null = AI graded; uuid = teacher who overrode
  graded_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- Grade Sync
-- ─────────────────────────────────────────

CREATE TABLE grade_sync_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id       uuid NOT NULL REFERENCES submissions(id),
  score               numeric(6,2) NOT NULL,
  status              grade_sync_status NOT NULL DEFAULT 'pending',
  canvas_response     jsonb,
  attempt             int NOT NULL DEFAULT 1,
  synced_at           timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────
-- Product Feedback
-- ─────────────────────────────────────────

CREATE TABLE assignment_type_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id),
  assignment_type     text NOT NULL,
  -- free-text type name for coming-soon types
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
```

### Indexes

```sql
-- Critical query paths
CREATE INDEX idx_assignments_course_id       ON assignments(course_id);
CREATE INDEX idx_submissions_assignment_id   ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id      ON submissions(student_id);
CREATE INDEX idx_grade_sync_submission_id    ON grade_sync_log(submission_id);
CREATE INDEX idx_users_registration_sub      ON users(registration_id, lti_sub);
CREATE INDEX idx_courses_registration_ctx    ON courses(registration_id, lti_context_id);
```

### Row Level Security

All tables enable RLS. Policies enforce `registration_id` isolation. Server-side calls use a service role key — client-side calls are not used for sensitive operations.

```sql
-- Example RLS policy pattern (applied to all tables)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_registration_isolation"
  ON assignments
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE registration_id = current_setting('app.registration_id')::uuid
    )
  );
```

The `app.registration_id` setting is injected per-request by the server layer using a Supabase client configured with the authenticated registration context.

---

## 10. API Design

All routes under `/api/`. Server-side only — no direct client-to-Supabase calls.

### LTI Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/lti/login` | POST | None | OIDC initiation — validates iss/client_id, stores state/nonce in Redis, redirects to Canvas |
| `/api/lti/launch` | POST | LTI JWT | Validates id_token, upserts user/course, routes by message_type |
| `/api/lti/jwks` | GET | None | Returns tool's public RSA key set |
| `/api/lti/deep-link` | POST | LTI JWT | Entry for deep linking; redirects to assignment builder |

### Assignment Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/assignments` | POST | Teacher session | Create assignment + type-specific config |
| `/api/assignments/[id]` | GET | Session | Fetch assignment + config |
| `/api/assignments/[id]` | PATCH | Teacher session | Update config (pre-submission only) |

### Submission Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/submissions` | POST | Student session | Create submission record, return upload URL |
| `/api/submissions/[id]` | GET | Session | Get submission status and data |
| `/api/submissions/[id]/recording` | POST | Student session | Confirm recording upload complete |
| `/api/submissions/[id]/transcribe` | POST | Student session | Trigger/poll transcription |
| `/api/submissions/[id]/follow-up` | POST | Student session | Generate next follow-up question |
| `/api/submissions/[id]/submit` | POST | Student session | Finalize submission, trigger grading |
| `/api/submissions/[id]/grade` | PATCH | Teacher session | Override grade, re-sync to Canvas |

### Dashboard Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/courses/[id]/submissions` | GET | Teacher session | Paginated list of all submissions for a course |
| `/api/assignments/[id]/submissions` | GET | Teacher session | Submissions for a specific assignment |

### Session Model

LTI launches establish a short-lived server-side session (cookie, httpOnly, SameSite=None for iframe context). Session contains:

```typescript
{
  userId: string,           // Scholarly users.id
  registrationId: string,   // lti_registrations.id
  courseId: string,         // courses.id
  role: 'instructor' | 'learner',
  ltiSub: string,           // original Canvas sub
  expiresAt: number         // Unix timestamp
}
```

Sessions expire after 2 hours. Re-launch required after expiry.

---

## 11. Engineering Principles

These are non-negotiable constraints for all development on this codebase.

### Single Responsibility
Every module has one reason to change. LTI validation logic, AI prompting logic, grade sync logic, and recording upload logic are each in separate, independently testable modules.

### Dependency Inversion
Application code depends on interfaces, not concrete implementations. The AI provider (OpenAI), storage provider (Supabase), and LMS (Canvas AGS) are each accessed through an interface. Swapping providers requires only a new adapter, not changes to business logic.

### Fail Closed on Security
JWT validation failures, missing nonces, unrecognized `deployment_id` — all result in 401 and log entries. No partial processing, no fallback to weaker auth.

### No Raw Primitives for Domain Concepts
`RegistrationId`, `SubmissionId`, `AssignmentId`, `LtiSub` are value objects, not raw strings. This prevents misuse (e.g., accidentally passing a `submissionId` where a `userId` is expected).

### Explicit Over Implicit
No magic middleware that injects context silently. Every API route explicitly extracts and validates its session, registration, and permissions.

### Test-Driven for Business Logic
LTI validation, grade calculation, rubric scoring, follow-up question generation prompts — all have unit tests before implementation. Recording upload and AI calls use test doubles.

### Schema as Source of Truth
The Supabase schema is the authoritative definition of the data model. TypeScript types for database rows are generated from the schema, never written by hand.

---

## 12. BYU Pilot Deployment

### Goal
Get the tool installed on BYU's Canvas instance (byu.instructure.com / canvas.byu.edu), administered by BYU Office of Information Technology, so that BYU faculty can use it in real courses with real students.

### Prerequisites Before the IT Conversation
- [ ] Tool deployed to a production URL with a custom domain (not `.vercel.app`) — looks more credible to institutional IT
- [ ] Privacy policy page published on the tool's domain — even a one-pager covering what data is collected, where it's stored, and how to request deletion
- [ ] Demo video or live walkthrough showing the full student + teacher flow
- [ ] Student data inventory ready to share:
  - Names and emails stored in Supabase (US region) from LTI launch claims
  - Video recordings stored in Supabase Storage, scoped per course
  - Transcripts stored in Supabase PostgreSQL
  - OpenAI receives audio/text for transcription and grading (no persistent storage per OpenAI's API terms)
  - Grade data sent to Canvas via AGS; logged in Supabase

### Who to Contact at BYU
Do **not** start with the general IT helpdesk. Ask BYU faculty contacts to connect directly with the **LMS/EdTech team** within BYU OIT. A faculty member requesting the tool carries significantly more weight than a cold outreach from a developer.

Contact info for general IT: it.byu.edu / 801-422-4000 (use only as a fallback to find the right team).

### What BYU IT Will Need
- Developer Key configuration JSON (see Section 5 of this document)
- Privacy policy URL
- Data retention and deletion policy
- FERPA compliance stance (see below)
- Support contact for when things break

### FERPA Stance
Student recordings, transcripts, and grades constitute education records under FERPA. Before BYU IT approves the tool:
- Confirm Supabase data is stored in the US
- Provide a process for deleting a student's data on request
- Be prepared to sign a data processing agreement (DPA) if BYU requires one — common for tools handling student PII

### Steps After IT Approval
1. BYU IT creates the LTI 1.3 Developer Key using the JSON config from Section 5, substituting the production tool URL
2. BYU IT provides the `client_id` and `deployment_id`
3. Insert one row into the `lti_registrations` table in Supabase:

| column | value |
|---|---|
| `client_id` | from BYU IT after key creation |
| `deployment_id` | from BYU IT after tool installation |
| `platform_iss` | `https://canvas.instructure.com` |
| `oidc_auth_url` | `https://canvas.instructure.com/api/lti/authorize_redirect` |
| `jwks_url` | `https://canvas.instructure.com/api/lti/security/jwks` |
| `token_url` | `https://canvas.instructure.com/login/oauth2/token` |

4. Confirm the tool appears in the Canvas assignment builder for a test course
5. Run through the full student + teacher flow end-to-end before announcing to faculty

### Timeline Expectation
Institutional IT approval typically takes **2–8 weeks** depending on BYU's review process. Having a faculty champion advocating internally is the single biggest factor in compressing that timeline.

---

## 13. Near-Term Engineering Priorities

Work to complete before or alongside the BYU approval process. Ordered by impact.

### 1. Production deployment
- Deploy to Vercel and configure a custom domain
- Set all production environment variables (`NEXT_PUBLIC_APP_URL`, `SESSION_SECRET`, `LTI_PRIVATE_KEY_PEM`, etc.)
- Remove `LTI_DEV_MODE` from production environment
- Smoke-test the full LTI launch → assignment creation → student submission → grade passback flow on the production URL

### 2. Privacy policy page
Required by BYU before submission. Minimum content:
- What data is collected (names, emails, video recordings, transcripts, grades)
- Where it is stored (Supabase, US region)
- Which third parties process it (OpenAI for transcription/grading — zero retention on API)
- Retention period (define one — 90 days post-submission is a reasonable default)
- How to request deletion (support email)

### 3. Data retention enforcement
Currently recordings and transcripts are stored indefinitely. Before the BYU submission:
- Define retention period (e.g. 90 days after `submitted_at`)
- Build a scheduled job or Supabase cron to delete expired recordings from Storage and null out transcripts in the DB
- Document the policy in the privacy policy page

### 4. Student data deletion endpoint
BYU requires a process for deleting a student's data on request. Build an admin endpoint (instructor or internal) that:
- Deletes a student's recording from Supabase Storage
- Nulls out their transcript and grade rationale
- Retains only the grade (for gradebook integrity) or deletes fully if requested

### 5. Self-service registration (for scaling beyond BYU)
Currently adding a new institution requires manually inserting a row into `lti_registrations`. Before pursuing a second institution, build a self-service onboarding page where a Canvas admin can paste their Developer Key details and get registered automatically. This is the unlock for any multi-institution growth.

### 6. Re-approval triggers
Once BYU-approved, the following changes require notifying BYU IT before shipping:
- Adding new Canvas API scopes to the Developer Key
- Storing new categories of student data not in the original data inventory
- Moving data outside the US
- Replacing a third-party provider in a way that affects data handling

Everything else (new assignment types, UI changes, bug fixes, AI model upgrades) can be shipped freely without re-approval.

### 7. Deferred items from CLAUDE.md
The following are already documented in `CLAUDE.md` as deferred and should be addressed before any broad institutional rollout:
- Delete assignment → clean up Canvas lineitem (deferred #6)
- Edit assignment → update Canvas lineitem `scoreMaximum` (deferred #7)
- AGS access token caching (deferred #5)
- Safari / strict cookie environment support (deferred #3)

---

## 14. Out of Scope (v1)

- Any assignment type other than Oral Assessment
- Canvas-independent access (no direct URL access without LTI launch)
- Student re-submission (one attempt per assignment, period)
- Real-time teacher monitoring of in-progress submissions
- Email or push notifications
- Bulk grade operations
- Analytics / learning outcome reporting
- FERPA/COPPA compliance documentation (required before institutional sale — post-v1)
- IMS Global LTI Advantage certification (required for App Center listing — post-v1)
- Support for non-English rubrics
- Any Canvas API usage outside of AGS and NRPS
