import Link from 'next/link'
import ProductShowcase from './ProductShowcase'
import HeroAnimation from './HeroAnimation'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white text-xs font-bold tracking-tight">
              S
            </div>
            <span className="text-sm font-semibold text-zinc-900 tracking-tight">scholarly</span>
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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
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
                <p className="text-xs font-semibold tracking-widest uppercase text-red-600 mb-6">
                  Built for Canvas LMS · LTI 1.3 Advantage
                </p>
                <h1 className="heading-serif text-5xl sm:text-6xl text-zinc-950 leading-[1.1] mb-6">
                  Assignments built for<br />
                  the{' '}
                  <span className="serif-accent text-red-600">AI era.</span>
                </h1>
                <p className="text-base text-slate-500 mb-8 leading-7 max-w-md">
                  Scholarly helps instructors create oral assessments, guided reading
                  assignments, and smarter discussions that reveal what students
                  actually understand.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
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

        {/* Problem section — red */}
        <section className="bg-red-700 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-red-300 mb-6">
                  The problem with assignments today
                </p>
                <h2 className="heading-serif text-4xl sm:text-5xl text-white leading-[1.1] mb-6">
                  The problem isn&apos;t that<br />
                  students use AI.<br />
                  <span className="serif-accent">It&apos;s that assignments</span><br />
                  <span className="serif-accent">still don&apos;t.</span>
                </h2>
                <p className="text-base text-red-100 leading-relaxed mb-6 max-w-md">
                  Students can now generate essays, discussion posts, reading responses,
                  and reflections in seconds. Instructors need a better way to know what
                  students actually understand.
                </p>
                <blockquote className="border-l-2 border-red-400 pl-5">
                  <p className="text-base text-white leading-relaxed italic max-w-md">
                    Most assignments still measure final submissions instead of the
                    thinking behind them.
                  </p>
                </blockquote>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-red-300 mb-5">
                  AI can complete all of these today
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    'Essays and research papers',
                    'Discussion board posts',
                    'Reading responses and reflections',
                    'Short-answer questions',
                    'Lab reports and case studies',
                    'Take-home exams',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-red-800/50 border border-red-600/40 px-4 py-3">
                      <span className="text-red-400 font-bold text-sm shrink-0">✗</span>
                      <span className="text-red-100 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-red-600 mb-4">How it works</p>
            <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-14">
              Set up in minutes.<br />Grades before the next class.
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                {
                  emoji: '🔗',
                  n: '01',
                  title: 'Install once in Canvas',
                  body: 'Scholarly installs as a Canvas developer key via LTI 1.3. One setup by your Canvas admin unlocks the full platform — no per-course configuration.',
                  link: null,
                },
                {
                  emoji: '📝',
                  n: '02',
                  title: 'Create an assignment',
                  body: 'Write a prompt, define a rubric with up to six criteria, set a recording time limit, and optionally attach course materials for context. All from within Canvas.',
                  link: null,
                },
                {
                  emoji: '✅',
                  n: '03',
                  title: 'AI grades and syncs',
                  body: 'Students record their response in the browser — no downloads, no logins. AI scores each criterion and syncs the grade back to the Canvas gradebook automatically.',
                  link: null,
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

        {/* Assignment types */}
        <section id="assignment-types" className="bg-slate-50 border-t border-slate-100 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-red-600 mb-4">Assignment types</p>
            <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-4 max-w-2xl">
              One live today. A growing <span className="serif-accent text-red-600">library.</span>
            </h2>
            <p className="text-base text-slate-500 mb-12 max-w-xl leading-relaxed">
              Oral Assessment is available now. Every additional type runs on the same Canvas
              integration — no new setup when a new type ships.
            </p>
            <ProductShowcase />
          </div>
        </section>

        {/* CTA — dark */}
        <section className="bg-zinc-950 border-t border-white/10 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-red-500 mb-6">
              Get started today
            </p>
            <h2 className="heading-serif text-5xl sm:text-6xl text-white leading-[1.1] mb-6">
              See it inside <span className="serif-accent text-red-500">Canvas.</span>
            </h2>
            <p className="text-zinc-400 mb-8 text-base leading-relaxed max-w-md mx-auto">
              Try the full Oral Assessment experience in our demo environment — create an
              assignment, play the student role, and watch the AI grade sync to a live
              Canvas gradebook.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center mb-6">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
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
                <div className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white text-[10px] font-bold">S</div>
                <span className="text-sm font-semibold text-white">scholarly</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                AI-native assignments for the Canvas era.
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
                <li><span className="text-sm text-zinc-400">Oral Assessment <span className="text-red-600 text-xs font-semibold">Live</span></span></li>
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
            <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Scholarly. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
