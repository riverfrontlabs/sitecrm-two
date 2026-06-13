/**
 * The main builder shell: a split-pane layout with the prompt/config panel
 * on the left and a live preview iframe on the right.
 *
 * Phase 3 will wire in:
 * - The AI generation pipeline (prompt → SiteSpec via `/api/sites/generate`)
 * - The interactive section editor (click-to-edit with follow-up prompts)
 * - The live preview renderer (SiteSpec → iframe sandbox on port 5175)
 */
export function BuilderPage() {
  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Left pane — prompt + config */}
      <aside className="flex w-96 flex-shrink-0 flex-col border-r border-[var(--color-border)] p-4">
        <h1 className="mb-4 text-lg font-semibold">Site Builder</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Describe the site you want to build and the AI will generate a full spec with live
          preview. Phase 3 implementation coming soon.
        </p>
      </aside>

      {/* Right pane — live preview */}
      <main className="flex flex-1 items-center justify-center bg-[var(--color-surface)]">
        <p className="text-sm text-[var(--color-text-muted)]">Preview will appear here</p>
      </main>
    </div>
  );
}
