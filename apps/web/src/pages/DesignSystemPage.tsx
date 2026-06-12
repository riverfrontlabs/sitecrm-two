import {
  Badge,
  Button,
  Card,
  Input,
  THEMES,
  useTheme,
  type BadgeTone,
  type ButtonSize,
  type ButtonVariant,
} from '@sitetwo/design-system';
import type { ReactNode } from 'react';

/**
 * Live design-system preview ("/design").
 *
 * Renders every design token, component variant, and theme so changes to
 * the design system can be reviewed visually in one place. Use the theme
 * switcher in the header (or the theme cards below) to see how the same
 * components restyle under each theme — nothing on this page is
 * theme-specific.
 */
export function DesignSystemPage() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Design system</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Every visual decision is a CSS design token; components only use semantic tokens, so
          everything below restyles instantly when the theme changes. Source:{' '}
          <code className="font-mono text-xs">packages/design-system</code>.
        </p>
      </section>

      <ThemesSection />
      <ColorsSection />
      <Section title="Buttons" hint="4 variants × 3 sizes, plus the disabled state.">
        <div className="flex flex-col gap-3">
          {(['primary', 'secondary', 'ghost', 'danger'] as ButtonVariant[]).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <SpecimenLabel>{variant}</SpecimenLabel>
              {(['sm', 'md', 'lg'] as ButtonSize[]).map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size === 'md' ? 'Button' : size}
                </Button>
              ))}
              <Button variant={variant} disabled>
                disabled
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Badges" hint="Status tones built from the semantic status tokens.">
        <div className="flex flex-wrap gap-3">
          {(['neutral', 'primary', 'success', 'warning', 'danger'] as BadgeTone[]).map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Section>

      <Section
        title="Inputs"
        hint="Hint and error text is wired to the field via aria-describedby."
      >
        <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
          <Input label="Default" placeholder="Type here…" />
          <Input label="With hint" hint="Shown below the field." />
          <Input label="With error" defaultValue="oops" error="This value is not valid." />
        </div>
      </Section>

      <Section title="Cards" hint="Surface containers with optional header and footer.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            title="Card with everything"
            description="Title, description, body, and footer."
            footer={<Button size="sm">Action</Button>}
          >
            <p>Body content sits on the surface token and inherits ink colors.</p>
          </Card>
          <Card>
            <p>A bare card: no header, no footer — just children on a surface.</p>
          </Card>
        </div>
      </Section>
    </div>
  );
}

/** Uniform section wrapper: heading + optional hint + content. */
function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

/** Small fixed-width label used to caption a row of specimens. */
function SpecimenLabel({ children }: { children: string }) {
  return <span className="w-24 font-mono text-xs text-ink-muted">{children}</span>;
}

/** Theme gallery: one card per registered theme; click to activate. */
function ThemesSection() {
  const { theme: activeTheme, setTheme } = useTheme();

  return (
    <Section
      title="Themes"
      hint="Themes are alternate values for the same token contract — click to switch."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {THEMES.map((theme) => (
          <button
            key={theme.name}
            type="button"
            onClick={() => setTheme(theme.name)}
            data-theme={theme.name}
            className="rounded-lg border border-border bg-canvas p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* data-theme on the button scopes this swatch row to the theme
                being previewed, independent of the active app theme. */}
            <div className="flex gap-1.5">
              <Swatch color="var(--ds-color-primary)" />
              <Swatch color="var(--ds-color-surface)" />
              <Swatch color="var(--ds-color-ink)" />
              <Swatch color="var(--ds-color-success)" />
              <Swatch color="var(--ds-color-danger)" />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">
              {theme.label}
              {theme.name === activeTheme && (
                <span className="ml-2 text-xs font-normal text-ink-muted">(active)</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{theme.description}</p>
          </button>
        ))}
      </div>
    </Section>
  );
}

/** The full color-token contract, rendered as live swatches. */
function ColorsSection() {
  const groups: Array<{ name: string; tokens: string[] }> = [
    { name: 'Surfaces', tokens: ['canvas', 'surface', 'overlay', 'border'] },
    { name: 'Content', tokens: ['ink', 'ink-muted'] },
    { name: 'Interactive', tokens: ['primary', 'primary-strong', 'on-primary', 'ring'] },
    { name: 'Status', tokens: ['success', 'warning', 'danger', 'on-danger'] },
  ];

  return (
    <Section
      title="Color tokens"
      hint="The semantic token contract every theme must implement (see tokens.css)."
    >
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.name} className="flex flex-wrap items-center gap-3">
            <SpecimenLabel>{group.name}</SpecimenLabel>
            {group.tokens.map((token) => (
              <div key={token} className="flex items-center gap-2">
                <Swatch color={`var(--ds-color-${token})`} bordered />
                <code className="font-mono text-xs text-ink-muted">--ds-color-{token}</code>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

/** A small color chip rendering a live token value. */
function Swatch({ color, bordered = false }: { color: string; bordered?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        bordered
          ? 'inline-block size-5 rounded-sm border border-border'
          : 'inline-block size-5 rounded-sm'
      }
      style={{ backgroundColor: color }}
    />
  );
}
