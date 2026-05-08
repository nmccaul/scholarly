import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Scholarly',
}

const LAST_UPDATED = 'May 7, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white text-xs font-bold tracking-tight">S</div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">scholarly</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-16">
        <p className="text-xs text-slate-400 mb-2">Last updated: {LAST_UPDATED}</p>
        <h1 className="text-3xl font-bold text-slate-900 mb-10">Terms of Service</h1>

        <div className="space-y-10 text-sm leading-relaxed text-slate-600">

          <Section title="Acceptance of Terms">
            <p>
              By accessing or using Scholarly (&quot;the Service&quot;), you agree to be bound by these
              Terms of Service. If you are using the Service on behalf of an institution, you
              represent that you have authority to bind that institution to these terms.
            </p>
          </Section>

          <Section title="Description of Service">
            <p>
              Scholarly provides AI-powered oral assessment tools that integrate with Canvas LMS
              via LTI 1.3. The Service enables instructors to create oral assignments, collect
              student audio responses, and receive AI-generated grades synced to the Canvas gradebook.
            </p>
          </Section>

          <Section title="Permitted Use">
            <p>You may use the Service only for lawful educational purposes. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the Service to collect data for purposes other than education delivery.</li>
              <li>Attempt to reverse-engineer, scrape, or circumvent any security measures.</li>
              <li>Submit content that is unlawful, harmful, or infringes third-party rights.</li>
              <li>Share access credentials or session tokens with unauthorized parties.</li>
            </ul>
          </Section>

          <Section title="Instructor Responsibilities">
            <p>
              Instructors are responsible for ensuring that their use of the Service complies
              with their institution&apos;s policies, applicable privacy laws (including FERPA), and
              any applicable student consent requirements. Instructors must not configure
              assignments in ways that discriminate against students with documented disabilities.
            </p>
          </Section>

          <Section title="AI Grading Disclaimer">
            <p>
              AI-generated grades are produced by large language models and are not infallible.
              Instructors are responsible for reviewing AI grades and have final authority over
              any grade submitted to the gradebook. Scholarly is not liable for grading errors
              resulting from AI output.
            </p>
          </Section>

          <Section title="Intellectual Property">
            <p>
              You retain ownership of all content you upload to the Service, including assignment
              prompts, rubrics, course materials, and student submissions. You grant Scholarly a
              limited license to process that content solely for the purpose of providing the Service.
            </p>
          </Section>

          <Section title="Availability and Modifications">
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted service.
              We reserve the right to modify, suspend, or discontinue any part of the Service
              with reasonable notice. We may update these Terms from time to time; continued use
              of the Service constitutes acceptance of revised Terms.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              To the fullest extent permitted by law, Scholarly shall not be liable for any
              indirect, incidental, special, or consequential damages arising from use of or
              inability to use the Service, including but not limited to loss of data or
              inaccurate grades.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>
              These Terms are governed by the laws of the State of Utah, without regard to
              conflict of law principles.
            </p>
          </Section>

          <Section title="Contact">
            <p>Questions about these Terms:</p>
            <p className="mt-2">
              <a href="mailto:nathanmccauley10@gmail.com" className="text-red-600 hover:underline">
                nathanmccauley10@gmail.com
              </a>
            </p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6 text-xs text-slate-400">
          <Link href="/" className="hover:text-slate-600 transition-colors">← Back to Scholarly</Link>
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
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
