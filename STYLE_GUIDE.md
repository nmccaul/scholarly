# Scholarly — UI/UX Style Guide

**Source of truth:** Derived from the landing page (`app/src/app/page.tsx`, `globals.css`, `layout.tsx`, `HeroAnimation.tsx`, `ProductShowcase.tsx`).
Use this as the reference when building all additional pages of the web app.

---

## Fonts

Loaded via `next/font/google` in `layout.tsx` and exposed as CSS variables.

| Role | Font | Weight | Style | CSS Variable |
|---|---|---|---|---|
| Body / UI | Inter | 400, 500, 600, 700 | normal | `--font-inter` |
| Display / headings | Playfair Display | 700 | normal + italic | `--font-playfair` |

### Utility Classes (`globals.css`)

```css
.heading-serif   /* Playfair Display 700 — all major headings */
.serif-accent    /* Playfair Display italic — key phrase emphasis inside headings */
```

**Usage pattern:** Large headings use `.heading-serif` for the full heading, with one or two words wrapped in `.serif-accent` to create an italic accent phrase.

```tsx
<h1 className="heading-serif text-5xl text-zinc-950">
  Assignments built for the{' '}
  <span className="serif-accent text-red-600">AI era.</span>
</h1>
```

---

## Color Palette

### Brand

| Token | Hex | Usage |
|---|---|---|
| `red-600` | `#dc2626` | Primary CTA buttons, logo mark, eyebrow labels, active states, accents on white |
| `red-700` | `#b91c1c` | CTA hover state, problem section background |
| `red-500` | `#ef4444` | Accents on dark backgrounds, recording dot, status indicators |

### Backgrounds — Section Layers

The page uses a deliberate section-by-section contrast stack:

| Section | Class | Hex | Usage |
|---|---|---|---|
| Page shell | `bg-zinc-950` | `#09090b` | Outermost page wrapper |
| Hero / How it works | `bg-white` | `#ffffff` | Primary content sections |
| Assignment types | `bg-slate-50` | `#f8fafc` | Secondary content sections |
| Problem | `bg-red-700` | `#b91c1c` | High-contrast brand statement section |
| CTA | `bg-zinc-950` | `#09090b` | Dark closing section |
| Footer | `bg-black` | `#000000` | Footer |
| Nav | `bg-white/95` | — | Sticky nav with backdrop blur |

### Text

| Token | Usage |
|---|---|
| `zinc-950` | Primary headings on white |
| `zinc-900` | Card titles, strong body text |
| `white` | All text on dark/colored backgrounds |
| `slate-500` | Standard body copy, nav links (default state) |
| `slate-400` | Secondary/muted text, card descriptions on dark |
| `slate-300` | Step numbers, decorative elements |
| `zinc-400` | Footer links (default) |
| `zinc-500` / `zinc-600` | Footer secondary text, copyright |
| `red-100` | Body copy on `red-700` backgrounds |
| `red-300` | Eyebrow labels on `red-700` backgrounds |
| `red-400` | Accent text and icons on `red-700` backgrounds |
| `red-600` | Eyebrow labels and accents on white backgrounds |
| `red-500` | Accents on `zinc-950` / dark backgrounds |

### Semantic / Status

| Token | Usage |
|---|---|
| `emerald-500` | Success icon color |
| `emerald-700` | Success text |
| `emerald-50` | Success badge background |
| `emerald-100` | Success badge border |
| `red-500/20` | Live badge background (transparent) |

### Borders

| Token | Usage |
|---|---|
| `slate-200` | Standard card borders on white backgrounds |
| `slate-100` | Subtle dividers, secondary card borders |
| `white/10` | Borders on `zinc-950` / dark backgrounds |
| `white/20` | Outline button borders on dark backgrounds |
| `red-100` | Priority card borders |
| `red-600/40` | List item borders on `red-700` backgrounds |

---

## Typography Scale

### Eyebrow / Section Label

```tsx
<p className="text-xs font-semibold tracking-widest uppercase text-red-600 mb-4">
  How it works
</p>
```
- Always uppercase, always precedes a section heading
- Color: `text-red-600` on white, `text-red-300` on `red-700`, `text-zinc-500` in footer

### H1 — Page Headline

```tsx
<h1 className="heading-serif text-5xl sm:text-6xl text-zinc-950 leading-[1.1] mb-6">
```

### H2 — Section Headline

```tsx
<h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-6">
/* On dark/colored backgrounds: */
<h2 className="heading-serif text-5xl sm:text-6xl text-white leading-[1.1] mb-6">
```

### H3 — Card / Feature Title

```tsx
/* Standard card */
<h3 className="font-semibold text-zinc-900 text-base mb-2">
/* Large featured card (dark) */
<h3 className="text-lg font-semibold text-white mb-2">
/* Small card (muted/coming soon) */
<h3 className="font-medium text-slate-400 text-sm leading-snug">
```

### Body Copy

```tsx
/* Primary body — section descriptions */
<p className="text-base text-slate-500 leading-7 max-w-md">
/* Standard body */
<p className="text-sm text-slate-500 leading-relaxed">
/* On red background */
<p className="text-base text-red-100 leading-relaxed">
/* On dark background */
<p className="text-zinc-400 text-base leading-relaxed">
```

### Micro / Caption

```tsx
<p className="text-xs text-slate-500">       /* captions, disclaimers */
<p className="text-[11px] text-slate-400">   /* card sub-labels */
<p className="text-[10px] text-slate-300">   /* discipline tags, footer labels */
```

### Blockquote

```tsx
<blockquote className="border-l-2 border-red-400 pl-5">
  <p className="text-base text-white leading-relaxed italic max-w-md">
```

---

## Layout & Spacing

### Container

Every section uses the same container pattern:

```tsx
<div className="mx-auto max-w-6xl px-6">
```

Exceptions:
- CTA section: `max-w-3xl` (narrower, centered)
- Body text max-widths: `max-w-md`, `max-w-xl` — applied to `<p>` tags to control line length

### Section Padding

| Context | Class |
|---|---|
| Standard sections | `py-20` |
| CTA / hero closing | `py-24` |
| Hero | `py-20 md:py-28` |
| Footer | `py-12` |

### Grid Layouts

```tsx
/* Hero — 2-col on md+ */
<div className="grid md:grid-cols-2 gap-12 items-center">

/* 3-step cards */
<div className="grid gap-5 sm:grid-cols-3">

/* Product/assignment cards */
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

/* Footer */
<div className="grid grid-cols-2 md:grid-cols-4 gap-8">
```

---

## Components

### Navigation

```tsx
<header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 gap-4">
```

- Sticky, `z-20`, white with 95% opacity + backdrop blur
- Height defined by `py-3` + content
- Three zones: Logo | Nav links (hidden on mobile) | CTA buttons

### Logo Mark

```tsx
/* Full size (nav) */
<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white text-xs font-bold tracking-tight">
  S
</div>
<span className="text-sm font-semibold text-zinc-900 tracking-tight">scholarly</span>

/* Small size (footer) */
<div className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white text-[10px] font-bold">
  S
</div>
<span className="text-sm font-semibold text-white">scholarly</span>
```

### Buttons

**Primary — default**
```tsx
<button className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
```

**Primary — small**
```tsx
<button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
```

**Secondary outline — on light background**
```tsx
<button className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
```

**Secondary outline — on dark background**
```tsx
<button className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors">
```

**Inverse — on dark card**
```tsx
<button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors">
```

**Ghost / nav link**
```tsx
<a className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
```

**Filter tab (active)**
```tsx
<button className="rounded-full bg-red-600 text-white px-4 py-1.5 text-xs font-semibold tracking-wide">
```

**Filter tab (inactive)**
```tsx
<button className="rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors">
```

### Badges & Status Pills

**Live / active — animated dot**
```tsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-400">
  <span className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
  Live now
</span>
```

**In development**
```tsx
<span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
  In development
</span>
```

**Type label pill (on card header)**
```tsx
<span className="inline-block rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
  Oral Assessment
</span>
```

**Success / synced**
```tsx
<div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
  <svg className="w-3 h-3 text-emerald-500 shrink-0" ...checkmark... />
  <span className="text-[10px] font-semibold text-emerald-700">Synced to Canvas</span>
</div>
```

### Cards

**Standard step card — on white**
```tsx
<div className="rounded-2xl border border-slate-200 p-7 flex flex-col gap-5">
```

**Featured / live — dark**
```tsx
<div className="relative rounded-2xl bg-slate-900 p-6 flex flex-col gap-4 overflow-hidden">
  {/* Red glow overlay */}
  <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-red-600 opacity-20 blur-2xl" />
```

**Priority card — warm gradient**
```tsx
<div className="rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/40 p-6 flex flex-col gap-3">
```

**Coming soon / muted**
```tsx
<div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col gap-2">
```

**Problem list item — on red background**
```tsx
<div className="flex items-center gap-3 rounded-xl bg-red-800/50 border border-red-600/40 px-4 py-3">
  <span className="text-red-400 font-bold text-sm shrink-0">✗</span>
  <span className="text-red-100 text-sm">{item}</span>
</div>
```

---

## Animations

Defined as `@keyframes` in `globals.css`. Applied via inline `style` on elements that need them (not Tailwind classes).

```css
/* Gentle vertical float — main hero cards */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}
/* Usage: animation: 'float 5.5s ease-in-out infinite' */

/* Subtle float — secondary / offset elements */
@keyframes float-offset {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
/* Usage: animation: 'float-offset 5.5s ease-in-out infinite 1.8s' */

/* Audio waveform bar */
@keyframes wave-bar {
  0%, 100% { transform: scaleY(0.3); }
  50%       { transform: scaleY(1); }
}
/* Usage: animation: 'wave-bar 0.8s ease-in-out infinite', stagger animationDelay per bar */

/* Recording/status dot pulse */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
/* Usage: animation: 'pulse-dot 1.2s ease-in-out infinite' */
```

---

## Section Patterns

Recurring full-width section structures used throughout the landing page. Reuse these patterns when building interior app pages.

### Pattern A — White section with eyebrow + heading

```tsx
<section className="bg-white py-20">
  <div className="mx-auto max-w-6xl px-6">
    <p className="text-xs font-semibold tracking-widest uppercase text-red-600 mb-4">
      Section label
    </p>
    <h2 className="heading-serif text-4xl sm:text-5xl text-zinc-950 leading-[1.1] mb-14">
      Heading text
    </h2>
    {/* content */}
  </div>
</section>
```

### Pattern B — Red section (problem / brand statement)

```tsx
<section className="bg-red-700 py-20">
  <div className="mx-auto max-w-6xl px-6">
    <p className="text-xs font-semibold tracking-widest uppercase text-red-300 mb-6">
      Section label
    </p>
    <h2 className="heading-serif text-4xl sm:text-5xl text-white leading-[1.1] mb-6">
      Heading text
    </h2>
    <p className="text-base text-red-100 leading-relaxed">
      Body copy
    </p>
  </div>
</section>
```

### Pattern C — Slate-50 section (secondary content)

```tsx
<section className="bg-slate-50 border-t border-slate-100 py-20">
  <div className="mx-auto max-w-6xl px-6">
```

### Pattern D — Dark CTA section

```tsx
<section className="bg-zinc-950 border-t border-white/10 py-24">
  <div className="mx-auto max-w-3xl px-6 text-center">
    <p className="text-xs font-semibold tracking-widest uppercase text-red-500 mb-6">
      Section label
    </p>
    <h2 className="heading-serif text-5xl sm:text-6xl text-white leading-[1.1] mb-6">
```

---

## Design Principles

These are the visual decisions baked into the landing page that should carry through the rest of the app.

1. **Contrast through section color** — pages feel dynamic by alternating white → red → slate → dark, not through decoration.
2. **One serif, used sparingly** — Playfair Display is reserved for headlines and accent phrases only. All UI chrome, labels, and body copy use Inter.
3. **Red is the only accent color** — no secondary accent colors exist in the palette. Green (emerald) appears only for success/sync states.
4. **Cards communicate status through weight, not color alone** — Live cards are dark with a glow, Priority cards are warm-gradient, Coming Soon cards are muted gray. The visual hierarchy is legible without reading the badge.
5. **Spacing communicates importance** — generous `py-20`/`py-24` on marketing sections; tighter `p-5`/`p-6` inside cards. Don't collapse section padding inside the app.
6. **Micro-text is intentional** — `text-[11px]` and `text-[10px]` appear deliberately for labels and metadata. Don't use them for anything a user needs to read carefully.
7. **All transitions are `transition-colors`** — no scale, translate, or opacity transitions on interactive elements. Hover states are color-only.
