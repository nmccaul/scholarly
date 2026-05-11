import Link from 'next/link'
import ProductShowcase from './ProductShowcase'
import HeroAnimation from './HeroAnimation'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#18202A]">

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#24313F] text-white text-xs font-bold tracking-tight">
              A
            </div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">apturi</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">How it works</a>
            <a href="#assignment-types" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Assignment types</a>
            <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy</Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://calendly.com/nathanmccauley10/30min"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Book a walkthrough
            </a>
            <Link
              href="/demo"
              className="rounded-lg bg-[#2563A6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
            >
              Get Demo Access
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section className="bg-white border-b border-slate-100">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#2563A6] mb-6">
                  Built for Canvas LMS · LTI 1.3 Advantage
                </p>
                <h1 className="heading-serif text-5xl sm:text-6xl text-zinc-950 leading-[1.1] mb-3">
                  AI Amplified
                  <br />
                  <span className="serif-accent text-[#2563A6]">Learning.</span>
                </h1>
                <p className="text-sm font-semibold tracking-widest uppercase text-slate-400 mb-6">apturi</p>
                <p className="text-base text-slate-500 mb-8 leading-7 max-w-md">
                  Apturi helps instructors create oral assessments, guided reading
                  assignments, and smarter discussions that reveal what students
                  actually understand — built for Canvas via LTI 1.3.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563A6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
                  >
                    Try the demo <span aria-hidden>→</span>
                  </Link>
                  <a
                    href="https://calendly.com/nathanmccauley10/30min"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Book a walkthrough
                  </a>
                </div>
              </div>
              <div className="hidden md:block">
                <HeroAnimation />
              </div>
            </div>
          </div>
        </section>

        {/* Problem section — dark navy */}
        <section className="bg-[#24313F] py-20">
          <div className="mx-auto max-w-6xl px-6">

            {/* BCG study */}
            <div className="grid md:grid-cols-2 gap-16 items-start mb-16">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-[#7DB7D9] mb-6">
                  The problem with AI in education
                </p>
                <h2 className="heading-serif text-4xl sm:text-5xl text-white leading-[1.1] mb-6">
                  The same tool.<br />
                  <span className="serif-accent">Opposite outcomes.</span>
                </h2>
                <p className="text-base text-slate-300 leading-relaxed mb-4">
                  In 2023, Harvard Business School researchers studied 758 BCG consultants,
                  all using the same AI tool. Consultants who used AI with structure and
                  intentionality improved their work quality by 40%. Those who used it however
                  felt natural performed 19% worse than consultants who used no AI at all.
                </p>
                <p className="text-base text-slate-400 leading-relaxed">
                  The same dynamic plays out in classrooms every day.
                </p>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <p className="text-5xl font-bold text-white mb-2">+40%</p>
                    <p className="text-sm text-slate-300 leading-relaxed">Work quality improvement with structured AI use</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-6">
                    <p className="text-5xl font-bold text-white mb-2">−19%</p>
                    <p className="text-sm text-slate-300 leading-relaxed">Performance drop with unstructured AI use vs. no AI at all</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Dell&apos;Acqua et al., 2023. Harvard Business School / Boston Consulting Group.</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 pt-12 grid md:grid-cols-2 gap-12 items-start">
              <div className="rounded-xl bg-white/5 border border-white/10 p-6 flex items-start gap-6">
                <p className="text-6xl font-bold text-white shrink-0 leading-none">92%</p>
                <div>
                  <p className="text-sm text-slate-200 leading-relaxed mb-1">of college students now use AI for academic work.</p>
                  <p className="text-sm text-slate-400 leading-relaxed">Almost none have been taught how to use it well.</p>
                  <p className="mt-3 text-xs text-slate-500">Programs.com, 2025.</p>
                </div>
              </div>

              <blockquote className="border-l-2 border-[#7DB7D9] pl-6">
                <p className="text-base text-white leading-relaxed italic mb-4">
                  &ldquo;Higher confidence in AI correlated with less critical thinking.
                  The people who believed they were best at using AI often had the most
                  deteriorated analytical skills — and had no idea it was happening.&rdquo;
                </p>
                <cite className="text-xs text-slate-500 not-italic">Lee et al., 2025. Microsoft Research.</cite>
              </blockquote>
            </div>

          </div>
        </section>

        {/* What the Research Says */}
        <section className="bg-white border-t border-slate-100 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#2563A6] mb-4">What the research says</p>
            <div className="grid md:grid-cols-2 gap-12 items-end mb-14">
              <div>
                <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1]">
                  Not all AI use<br />
                  is <span className="serif-accent text-[#2563A6]">equal.</span>
                </h2>
              </div>
              <div>
                <p className="text-base text-slate-500 leading-relaxed">
                  Apturi&apos;s assignment library is organized around a peer-reviewed framework
                  from Wharton researchers Ethan and Lilach Mollick — categorizing the distinct
                  roles AI can play in learning, from no involvement at all to deep collaboration.
                  Every assignment type we build maps to one of these eight roles.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'No AI',
                  definition: 'Students demonstrate knowledge entirely on their own, without AI assistance.',
                },
                {
                  label: 'AI as Tutor',
                  definition: 'AI provides direct, personalized instruction — adapting to what each student knows.',
                },
                {
                  label: 'AI as Coach',
                  definition: 'AI prompts metacognition, helping students reflect on their process and improve.',
                },
                {
                  label: 'AI as Mentor',
                  definition: 'AI provides ongoing formative feedback, guiding students toward improvement over time.',
                },
                {
                  label: 'AI as Teammate',
                  definition: 'AI collaborates as a partner, contributing to a shared task and offering alternate viewpoints.',
                },
                {
                  label: 'AI as Student',
                  definition: 'The student teaches the AI — reinforcing their own understanding through explanation.',
                },
                {
                  label: 'AI as Simulator',
                  definition: 'AI creates realistic scenarios and role-plays for deliberate skill development.',
                },
                {
                  label: 'AI as Tool',
                  definition: 'AI handles specific subtasks efficiently, while the core thinking stays with the student.',
                },
              ].map(({ label, definition }) => (
                <div key={label} className="rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-[#2563A6]">{label}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{definition}</p>
                </div>
              ))}
            </div>

            <p className="mt-8 text-xs text-slate-400">
              Framework: Mollick, E. &amp; Mollick, L. (2023).{' '}
              <span className="italic">Assigning AI: Seven Approaches for Students, with Prompts.</span>{' '}
              SSRN Working Paper.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#2563A6] mb-4">How it works</p>
            <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-14">
              Set up in minutes.<br />Grades before the next class.
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  emoji: '🔗',
                  n: '01',
                  title: 'Install once in Canvas',
                  body: 'Apturi installs as a Canvas developer key via LTI 1.3. One setup by your Canvas admin unlocks the full platform — no per-course configuration.',
                },
                {
                  emoji: '📝',
                  n: '02',
                  title: 'Create an assignment',
                  body: 'Choose an AI role, write a prompt, define a rubric, set a recording time limit, and optionally attach course materials. All from within Canvas.',
                },
                {
                  emoji: '✅',
                  n: '03',
                  title: 'AI grades and syncs',
                  body: 'Students complete the assignment in the browser — no downloads, no logins. AI scores each criterion and syncs the grade back to the Canvas gradebook automatically.',
                },
              ].map(({ emoji, n, title, body }) => (
                <div key={n} className="rounded-2xl border border-slate-200 p-7 flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-sm font-semibold text-slate-300">{n}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 text-base mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Teacher benefits */}
        <section className="bg-[#FAF9F6] border-t border-slate-100 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#2563A6] mb-4">For teachers</p>
            <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-6 max-w-2xl">
              Two sides of the<br />
              <span className="serif-accent text-[#2563A6]">same assignment.</span>
            </h2>
            <p className="text-base text-slate-500 mb-14 max-w-xl leading-relaxed">
              Every Apturi assignment is designed to do two things simultaneously — amplify learning for students while giving teachers deeper insight than any gradebook can.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-14">
              <div className="rounded-2xl bg-white border border-slate-200 p-8">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#2563A6] mb-4">For students</p>
                <h3 className="text-lg font-semibold text-zinc-900 mb-3">Amplified learning and critical thinking</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  Explaining, defending, and engaging with material in real time develops the critical thinking that passive submission never requires. Students who must articulate their reasoning — out loud, under follow-up questions, in their own words — learn at a deeper level.
                </p>
                <ul className="space-y-3">
                  {[
                    'Retrieval practice through spoken response',
                    'Metacognition prompted by AI follow-up questions',
                    'Structured AI use that builds thinking, not replaces it',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="text-[#2563A6] font-bold shrink-0 mt-0.5">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-[#24313F] p-8">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#7DB7D9] mb-4">For teachers</p>
                <h3 className="text-lg font-semibold text-white mb-3">Eyes into how your class thinks</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  The same moments that build student thinking generate a record of it. Teachers see where students got confident, where they hesitated, and what they couldn&apos;t explain under pressure — not just who answered correctly.
                </p>
                <ul className="space-y-3">
                  {[
                    'Identify misconceptions before they compound',
                    'See who genuinely understands vs. who is performing',
                    'Surface what the class needs next — without guessing',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="text-[#7DB7D9] font-bold shrink-0 mt-0.5">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <blockquote className="border-l-4 border-[#2563A6] pl-6 max-w-2xl">
              <p className="text-xl font-medium text-zinc-800 leading-relaxed italic">
                &ldquo;The same assignment that amplifies student learning gives teachers the intelligence to amplify it further.&rdquo;
              </p>
            </blockquote>
          </div>
        </section>

        {/* Assignment types */}
        <section id="assignment-types" className="bg-slate-50 border-t border-slate-100 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#2563A6] mb-4">Assignment types</p>
            <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-4 max-w-2xl">
              One live today. A growing <span className="serif-accent text-[#2563A6]">library.</span>
            </h2>
            <p className="text-base text-slate-500 mb-12 max-w-xl leading-relaxed">
              Oral Assessment is available now. Every additional type runs on the same Canvas
              integration — no new setup when a new type ships.
            </p>
            <ProductShowcase />
          </div>
        </section>

        {/* CTA — dark */}
        <section className="bg-[#18202A] border-t border-white/10 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#7DB7D9] mb-6">
              Get started today
            </p>
            <h2 className="heading-serif text-5xl sm:text-6xl text-white leading-[1.1] mb-6">
              See it inside <span className="serif-accent text-[#7DB7D9]">Canvas.</span>
            </h2>
            <p className="text-zinc-400 mb-8 text-base leading-relaxed max-w-md mx-auto">
              Try the full Oral Assessment experience in our demo environment — create an
              assignment, play the student role, and watch the AI grade sync to a live
              Canvas gradebook.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center mb-6">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563A6] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E518B] transition-colors"
              >
                Try the demo <span aria-hidden>→</span>
              </Link>
              <a
                href="https://calendly.com/nathanmccauley10/30min"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors"
              >
                Book a live walkthrough
              </a>
            </div>
            <p className="text-xs text-zinc-600">FERPA compliant · Audio deleted after transcription · No student data used to train AI</p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[#24313F] text-white text-[10px] font-bold">A</div>
                <span className="text-sm font-semibold text-white">apturi</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                AI Amplified Learning.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 mb-4">Product</p>
              <ul className="space-y-2.5">
                <li><Link href="/demo" className="text-sm text-zinc-400 hover:text-white transition-colors">Get Demo Access</Link></li>
                <li><a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">How it works</a></li>
                <li><a href="https://calendly.com/nathanmccauley10/30min" target="_blank" rel="noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">Book a walkthrough</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 mb-4">Assignment Types</p>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-zinc-400">Oral Assessment <span className="text-[#2563A6] text-xs font-semibold">Live</span></span></li>
                <li><span className="text-sm text-zinc-500">Smart Matching Discussion</span></li>
                <li><span className="text-sm text-zinc-500">Interactive Reading</span></li>
                <li><span className="text-sm text-zinc-600 text-xs">+ 7 more in development</span></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 mb-4">Company</p>
              <ul className="space-y-2.5">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Contact', href: 'mailto:nathanmccauley10@gmail.com' },
                ].map(({ label, href }) => (
                  <li key={label}><a href={href} className="text-sm text-zinc-400 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Apturi. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
