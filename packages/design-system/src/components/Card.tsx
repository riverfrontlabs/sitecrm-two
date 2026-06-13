import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../utils/cx';

/**
 * Props accepted by {@link Card}; native `<div>` props pass through, except
 * the HTML `title` tooltip attribute, which this component repurposes as
 * its heading.
 */
export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional heading rendered at the top of the card. */
  title?: ReactNode;
  /** Optional muted line rendered under the title. */
  description?: ReactNode;
  /** Optional footer rendered below the body, separated by a hairline. */
  footer?: ReactNode;
  /**
   * Heading level for `title` (2–6). Defaults to 3. Set it to match the
   * surrounding document outline so screen-reader heading navigation stays
   * correct (e.g. `headingLevel={2}` for top-level cards under an `<h1>`).
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Card body. */
  children?: ReactNode;
}

/**
 * A surface container for grouping related content.
 *
 * Renders an elevated panel on the `surface` token with an optional header
 * (title + description) and footer. Composition is intentionally simple:
 * for fully custom layouts, pass everything as `children` and skip the
 * convenience props.
 *
 * @example
 * <Card title="Build status" description="Last 24 hours" footer={<Button size="sm">Details</Button>}>
 *   <p>All 132 checks passing.</p>
 * </Card>
 */
export function Card({
  title,
  description,
  footer,
  children,
  headingLevel = 3,
  className,
  ...rest
}: CardProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cx('rounded-lg border border-border bg-surface p-5 shadow-sm', className)}
      // Associate the card region with its heading for assistive tech.
      aria-labelledby={title ? headingId : undefined}
      {...rest}
    >
      {(title || description) && (
        <header className="mb-3">
          {title && (
            <Heading id={headingId} className="text-base font-semibold text-ink">
              {title}
            </Heading>
          )}
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </header>
      )}
      {children && <div className="text-sm text-ink">{children}</div>}
      {footer && <footer className="mt-4 border-t border-border pt-3">{footer}</footer>}
    </div>
  );
}
