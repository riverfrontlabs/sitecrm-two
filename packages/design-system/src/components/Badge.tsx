import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx';

/** Color tone of a {@link Badge}, mapped to status tokens. */
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

/** Props accepted by {@link Badge}; all native `<span>` props pass through. */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Color tone. Defaults to `'neutral'`. */
  tone?: BadgeTone;
}

/**
 * Tone classes use the status token as the text color over a translucent wash
 * of the same token (`color-mix`), which keeps contrast stable across themes.
 */
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-overlay text-ink-muted',
  primary: 'text-primary bg-[color-mix(in_srgb,var(--ds-color-primary)_14%,transparent)]',
  success: 'text-success bg-[color-mix(in_srgb,var(--ds-color-success)_14%,transparent)]',
  warning: 'text-warning bg-[color-mix(in_srgb,var(--ds-color-warning)_14%,transparent)]',
  danger: 'text-danger bg-[color-mix(in_srgb,var(--ds-color-danger)_14%,transparent)]',
};

/**
 * A small inline label for statuses, counts, and tags.
 *
 * @example
 * <Badge tone="success">Published</Badge>
 * <Badge>v0.1.0</Badge>
 */
export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    />
  );
}
