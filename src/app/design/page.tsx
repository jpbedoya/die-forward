import type { Metadata } from 'next';
import Link from 'next/link';
// Source of truth: mobile/lib/theme.js. Imported directly so this page never
// drifts from the live mobile palette (webpack resolves the path even though
// tsconfig excludes the mobile/ tree).
import { palette } from '../../../mobile/lib/theme.js';

export const metadata: Metadata = {
  title: 'Design System — Die Forward',
  description:
    'Tokens, contrast tiers, and usage rules for the Die Forward mobile palette.',
};

// ── WCAG contrast (server-rendered, no client JS needed) ────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const long = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(long.slice(0, 2), 16),
    parseInt(long.slice(2, 4), 16),
    parseInt(long.slice(4, 6), 16),
  ];
}
function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
function rating(ratio: number): { tag: string; color: string } {
  if (ratio >= 7) return { tag: 'AAA', color: palette.victory.DEFAULT };
  if (ratio >= 4.5) return { tag: 'AA', color: palette.victory.light };
  if (ratio >= 3) return { tag: 'AA Lg', color: palette.amber.DEFAULT };
  return { tag: 'FAIL', color: palette.blood.DEFAULT };
}

// ── Building blocks ─────────────────────────────────────────────────────────
function Swatch({
  token,
  hex,
  note,
  textColor,
}: {
  token: string;
  hex: string;
  note?: string;
  textColor?: string;
}) {
  const ratio = contrast(textColor ?? hex, palette.crypt.bg);
  const r = rating(ratio);
  return (
    <div
      className="flex border"
      style={{ borderColor: palette.crypt.border, background: palette.crypt.surface }}
    >
      <div
        className="w-24 shrink-0 border-r"
        style={{ background: hex, borderColor: palette.crypt.border }}
        aria-hidden
      />
      <div className="flex-1 p-3 font-mono">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="text-sm font-semibold"
            style={{ color: textColor ?? palette.bone.DEFAULT }}
          >
            {token}
          </span>
          <span className="flex items-baseline gap-2 text-xs whitespace-nowrap">
            <span style={{ color: palette.bone.dark }}>{ratio.toFixed(1)}:1</span>
            <span style={{ color: r.color, letterSpacing: 1 }}>{r.tag}</span>
          </span>
        </div>
        <div className="mt-1 text-xs" style={{ color: palette.bone.muted }}>
          {hex}
        </div>
        {note && (
          <div className="mt-1.5 text-xs leading-snug" style={{ color: palette.bone.dark }}>
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

function TierPreview({
  token,
  hex,
  sample,
  hint,
}: {
  token: string;
  hex: string;
  sample: string;
  hint: string;
}) {
  return (
    <div
      className="border-l-2 pl-3 py-1 font-mono"
      style={{ borderColor: palette.amber.DEFAULT }}
    >
      <div className="text-base" style={{ color: hex }}>
        {sample}
      </div>
      <div
        className="mt-1 text-[10px] tracking-widest"
        style={{ color: palette.bone.dark }}
      >
        {token} · {hint}
      </div>
    </div>
  );
}

function DoDont({ good, bad, why }: { good: string; bad: string; why: string }) {
  return (
    <div className="mb-4 font-mono text-sm">
      <div className="flex items-start gap-2">
        <span style={{ color: palette.victory.DEFAULT }}>✓</span>
        <code
          className="flex-1 text-xs sm:text-sm"
          style={{ color: palette.bone.muted, background: 'transparent' }}
        >
          {good}
        </code>
      </div>
      <div className="mt-1 flex items-start gap-2">
        <span style={{ color: palette.blood.DEFAULT }}>✗</span>
        <code
          className="flex-1 text-xs sm:text-sm"
          style={{ color: palette.bone.muted, background: 'transparent' }}
        >
          {bad}
        </code>
      </div>
      <div className="ml-5 mt-1 text-xs italic" style={{ color: palette.bone.dark }}>
        — {why}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2
      className="mt-12 mb-4 font-mono text-xs tracking-[0.2em]"
      style={{ color: palette.amber.DEFAULT }}
    >
      ◈ {children}
    </h2>
  );
}

// ── Composite examples ─────────────────────────────────────────────────────
function CardExample() {
  return (
    <div
      className="border border-l-[3px] p-3 font-mono"
      style={{
        borderColor: palette.crypt.border,
        borderLeftColor: palette.amber.DEFAULT,
        background: palette.crypt.surface,
      }}
    >
      <div
        className="text-[10px] tracking-widest mb-2"
        style={{ color: palette.amber.DEFAULT }}
      >
        [ EXAMPLE ]
      </div>
      <div
        className="text-sm font-bold mb-1"
        style={{ color: palette.bone.muted }}
      >
        ROOM TITLE
      </div>
      <div className="text-xs" style={{ color: palette.bone.dark }}>
        Body copy describing what&apos;s in this room. Sits comfortably above the AA floor.
      </div>
    </div>
  );
}

function ButtonExamples() {
  return (
    <div className="flex flex-wrap gap-2 font-mono">
      <span
        className="px-4 py-2 text-xs font-bold tracking-[0.2em]"
        style={{ background: palette.amber.DEFAULT, color: palette.crypt.bg }}
      >
        PRIMARY
      </span>
      <span
        className="px-4 py-2 text-xs tracking-[0.2em] border"
        style={{ borderColor: palette.amber.DEFAULT, color: palette.amber.DEFAULT }}
      >
        GHOST
      </span>
      <span
        className="px-4 py-2 text-xs font-bold tracking-[0.2em]"
        style={{ background: palette.blood.DEFAULT, color: palette.crypt.bg }}
      >
        DANGER
      </span>
    </div>
  );
}

function StatusBadges() {
  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span
      className="inline-flex items-center px-2 py-1 text-[10px] tracking-widest border font-mono"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2">
      <Badge label="🔥 BURN 3" color={palette.amber.DEFAULT} />
      <Badge label="❄️ CHILL 2" color={palette.ethereal.light} />
      <Badge label="☣️ INFECTION 4" color={palette.victory.DEFAULT} />
      <Badge label="👁️ CLARITY 1" color={palette.ethereal.DEFAULT} />
      <Badge label="† DEAD" color={palette.blood.DEFAULT} />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DesignPage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: palette.crypt.bg, color: palette.bone.DEFAULT }}
    >
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="mb-12">
          <div
            className="font-mono text-[10px] tracking-[0.3em] mb-3"
            style={{ color: palette.bone.dark }}
          >
            <Link href="/" style={{ color: palette.bone.muted }} className="hover:underline">
              ← DIE FORWARD
            </Link>
          </div>
          <h1
            className="font-mono text-2xl sm:text-3xl tracking-[0.15em] mb-3"
            style={{ color: palette.amber.DEFAULT }}
          >
            ◈ DESIGN SYSTEM
          </h1>
          <p className="font-mono text-sm leading-relaxed" style={{ color: palette.bone.muted }}>
            The mobile app&apos;s palette and the rules around it. Tokens live in{' '}
            <code style={{ color: palette.amber.DEFAULT }}>mobile/lib/theme.js</code> — the single
            source of truth for both the Tailwind config (className styling) and the React
            Native inline-style escape hatch. Don&apos;t hand-pick hex strings in components;
            import the token.
          </p>
          <p
            className="mt-3 font-mono text-xs leading-relaxed"
            style={{ color: palette.bone.dark }}
          >
            Contrast ratings are computed against <code>crypt.bg</code> ({palette.crypt.bg}) using
            the WCAG 2.1 formula. AA = 4.5:1 normal text, AAA = 7:1, AA Lg = 3:1 large text only.
          </p>
        </div>

        {/* Surfaces */}
        <SectionTitle>SURFACES</SectionTitle>
        <div className="grid gap-2">
          <Swatch
            token="crypt.bg"
            hex={palette.crypt.bg}
            note="App background. The colour everything else is measured against."
          />
          <Swatch
            token="crypt.surface"
            hex={palette.crypt.surface}
            note="Raised surfaces — cards, modals, sheets."
          />
          <Swatch
            token="crypt.border"
            hex={palette.crypt.border}
            note="Default border for surfaces."
          />
          <Swatch
            token="crypt.border-light"
            hex={palette.crypt['border-light']}
            note="Slightly raised border — locked / disabled states."
          />
        </div>

        {/* Text */}
        <SectionTitle>TEXT HIERARCHY</SectionTitle>
        <p className="font-mono text-sm mb-6" style={{ color: palette.bone.muted }}>
          Four readability tiers. Use the className (<code>text-bone</code>,{' '}
          <code>text-bone-muted</code>, …) or the palette import. Pick by purpose, not
          by aesthetic — the page below shows what each tier looks like at body text size.
        </p>

        <div className="space-y-4 mb-6">
          <TierPreview
            token="palette.bone / text-bone"
            hex={palette.bone.DEFAULT}
            sample="The water rises around you."
            hint="Headlines, primary narrative, top-of-card titles."
          />
          <TierPreview
            token="palette.bone.muted / text-bone-muted"
            hex={palette.bone.muted}
            sample="Choose your action carefully."
            hint="Body copy. Default for paragraphs and instructions."
          />
          <TierPreview
            token="palette.bone.dark / text-bone-dark"
            hex={palette.bone.dark}
            sample="// connected via phantom · 0.42 SOL"
            hint="Secondary info — footnotes, status lines, dev-comment style labels."
          />
          <TierPreview
            token="palette.bone.faint / text-bone-faint"
            hex={palette.bone.faint}
            sample="// COMING SOON"
            hint="DECORATIVE ONLY. Fails AA — never use for information the player needs to read."
          />
        </div>

        <div className="grid gap-2">
          <Swatch
            token="bone"
            hex={palette.bone.DEFAULT}
            textColor={palette.bone.DEFAULT}
            note="Primary text."
          />
          <Swatch
            token="bone.muted"
            hex={palette.bone.muted}
            textColor={palette.bone.muted}
            note="Body text."
          />
          <Swatch
            token="bone.dark"
            hex={palette.bone.dark}
            textColor={palette.bone.dark}
            note="Secondary body. Brightened in 2026-05 from #78716c to comfortably clear AA."
          />
          <Swatch
            token="bone.faint"
            hex={palette.bone.faint}
            textColor={palette.bone.faint}
            note="Sub-AA. Decorative labels only — // COMING SOON style."
          />
        </div>

        {/* Accents */}
        <SectionTitle>ACCENTS</SectionTitle>
        <div className="grid gap-2">
          <Swatch
            token="amber (CTA / active)"
            hex={palette.amber.DEFAULT}
            note="Primary call-to-action, active selection, highlights that need to pop."
          />
          <Swatch
            token="amber.light"
            hex={palette.amber.light}
            note="Hover / pressed state for amber."
          />
          <Swatch
            token="amber.dark"
            hex={palette.amber.dark}
            note="Pressed amber surface."
          />
          <Swatch
            token="ethereal (mystical / void)"
            hex={palette.ethereal.DEFAULT}
            note="Void Beyond zone, FLUX mechanic, dream-logic UI."
          />
          <Swatch
            token="ethereal.light"
            hex={palette.ethereal.light}
            note="Highlighted ethereal — CHILL stacks, etc."
          />
        </div>

        {/* Status */}
        <SectionTitle>STATUS &amp; FEEDBACK</SectionTitle>
        <div className="grid gap-2">
          <Swatch
            token="blood (damage / errors)"
            hex={palette.blood.DEFAULT}
            note="Damage numbers, death CTAs, validation errors."
          />
          <Swatch
            token="blood.light"
            hex={palette.blood.light}
            note="HP bar (filled), low-health text."
          />
          <Swatch
            token="blood.dark"
            hex={palette.blood.dark}
            note="HP bar (empty), depleted indicators."
          />
          <Swatch
            token="victory (success / healing)"
            hex={palette.victory.DEFAULT}
            note="Successful actions, heals, INFECTION accent."
          />
          <Swatch
            token="victory.light"
            hex={palette.victory.light}
            note="Subtle success — small positive deltas."
          />
        </div>

        {/* Do / Don't */}
        <SectionTitle>DO / DON&apos;T</SectionTitle>
        <DoDont
          good={`className="text-bone-muted" for body, text-bone-dark for asides.`}
          bad={`style={{ color: '#a8a29e' }}  // same value, but bypasses the system`}
          why="Inline hex drifts from the theme over time. Tokens migrate atomically."
        />
        <DoDont
          good={`import { palette } from '../lib/theme';  // use palette.bone.dark`}
          bad={`color: '#666'  (or any one-off greyscale)`}
          why="Every greyscale hex below ~#8e8780 fails AA on the app background."
        />
        <DoDont
          good="bone.faint marks // COMING SOON style labels — visibly intentional."
          bad="Sub-AA hex for text the player needs to read."
          why="The 'faint' tier is documented as decorative; reviewers know it's intentional."
        />
        <DoDont
          good="Add new accents to lib/theme.js with a contrast note in the comment."
          bad="Sprinkle one-off hex colours through components."
          why="This page enumerates the theme. New colours appear here when they're added there."
        />

        {/* Composite */}
        <SectionTitle>COMPOSITE EXAMPLES</SectionTitle>
        <p className="font-mono text-sm mb-6" style={{ color: palette.bone.muted }}>
          How the tokens compose into real UI patterns. Every value below comes from the
          palette — there are no inline hex literals on this side of the page.
        </p>

        <div
          className="font-mono text-[10px] tracking-widest mb-2"
          style={{ color: palette.bone.dark }}
        >
          // CARD
        </div>
        <div className="mb-6 max-w-md">
          <CardExample />
        </div>

        <div
          className="font-mono text-[10px] tracking-widest mb-2"
          style={{ color: palette.bone.dark }}
        >
          // BUTTONS
        </div>
        <div className="mb-6">
          <ButtonExamples />
        </div>

        <div
          className="font-mono text-[10px] tracking-widest mb-2"
          style={{ color: palette.bone.dark }}
        >
          // STATUS BADGES (zone mechanic accents)
        </div>
        <div className="mb-6">
          <StatusBadges />
        </div>

        {/* Footer */}
        <div
          className="mt-16 pt-6 border-t font-mono text-xs leading-relaxed"
          style={{ borderColor: palette.crypt.border, color: palette.bone.dark }}
        >
          <div>Source of truth: <code style={{ color: palette.bone.muted }}>mobile/lib/theme.js</code></div>
          <div>Tailwind: <code style={{ color: palette.bone.muted }}>mobile/tailwind.config.js</code> (imports from theme.js)</div>
          <div>This page: <code style={{ color: palette.bone.muted }}>src/app/design/page.tsx</code></div>
        </div>
      </div>
    </main>
  );
}
