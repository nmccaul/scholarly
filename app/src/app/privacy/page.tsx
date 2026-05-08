import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Scholarly',
}

const LAST_UPDATED = 'May 7, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
            Scholarly
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-16">
        <p className="text-xs text-slate-400 mb-2">Last updated: {LAST_UPDATED}</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-10">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none space-y-10 text-sm leading-relaxed text-slate-600">

          <Section title="Overview">
            <p>
              Scholarly (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides AI-powered oral assessment tools that integrate
              with Canvas LMS via the LTI 1.3 standard. This policy describes what data we collect,
              how we use it, and how we protect it.
            </p>
          </Section>

          <Section title="Data We Collect">
            <p>When students and instructors use Scholarly through Canvas, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Identity data</strong> — name, email address, and LTI user identifier provided by your institution's Canvas instance.</li>
              <li><strong>Audio recordings</strong> — voice recordings made during oral assessments. Audio is transcribed by OpenAI Whisper and then <strong>deleted immediately</strong> after transcription is complete.</li>
              <li><strong>Transcripts</strong> — the text transcript of each oral response, stored for grading and instructor review.</li>
              <li><strong>AI-generated grades and rationale</strong> — the score and written feedback produced by AI grading.</li>
              <li><strong>Assignment configuration</strong> — prompts, rubrics, and settings created by instructors.</li>
              <li><strong>Course materials</strong> — readings or context documents uploaded by instructors for AI grading context.</li>
            </ul>
          </Section>

          <Section title="How We Use Your Data">
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, operate, and improve the Scholarly service.</li>
              <li>To generate AI-graded scores using your institution-defined rubrics.</li>
              <li>To return grades to the Canvas gradebook via LTI Advantage Grade Services.</li>
              <li>To display submission history and grading rationale to instructors and students.</li>
            </ul>
            <p className="mt-3">
              We do not sell your data. We do not use student data to train AI models.
            </p>
          </Section>

          <Section title="Third-Party Services">
            <p>We rely on the following sub-processors to deliver the service:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>OpenAI</strong> — audio transcription (Whisper) and AI grading (GPT-4o). Data is processed under OpenAI's API terms; student data is not used for model training under our agreement.</li>
              <li><strong>Supabase</strong> — database and storage infrastructure, hosted on AWS.</li>
              <li><strong>Vercel</strong> — application hosting and serverless compute.</li>
              <li><strong>Upstash</strong> — ephemeral session state (Redis), no student data stored.</li>
            </ul>
          </Section>

          <Section title="Data Retention">
            <p>
              Audio recordings are deleted immediately after transcription. Transcripts, grades,
              and assignment data are retained for the duration of your institution's active
              subscription. Upon contract termination, data is deleted within 30 days unless
              a longer retention period is required by applicable law.
            </p>
          </Section>

          <Section title="Security">
            <p>
              All data is transmitted over TLS. Database access is restricted to server-side
              service roles via row-level security. Session tokens are signed JWTs stored in
              httpOnly cookies. We do not expose student data to client-side code.
            </p>
          </Section>

          <Section title="FERPA">
            <p>
              Scholarly acts as a School Official under FERPA, accessing education records solely
              to provide contracted services to your institution. We do not re-disclose education
              records to third parties except as required to provide the service (see Third-Party
              Services above).
            </p>
          </Section>

          <Section title="Your Rights">
            <p>
              Students and instructors may request access to, correction of, or deletion of their
              personal data by contacting us at the address below. Institutions may also submit
              data deletion requests on behalf of their users.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              For privacy inquiries, data deletion requests, or HECVAT documentation:
            </p>
            <p className="mt-2">
              <a href="mailto:nathanmccauley10@gmail.com" className="text-blue-600 hover:underline">
                nathanmccauley10@gmail.com
              </a>
            </p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600 transition-colors">← Back to Scholarly</Link>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
        </div>
      </footer>

    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  )
}
