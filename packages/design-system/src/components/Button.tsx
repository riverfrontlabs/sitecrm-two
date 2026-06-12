import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../utils/cx';

/** Visual style of a {@link Button}. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Size of a {@link Button}. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Props accepted by {@link Button}; all native `<button>` props pass through. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style. Defaults to `'primary'`.
   * - `primary` — main call to action; solid brand color.
   * - `secondary` — neutral surface with a border; secondary actions.
   * - `ghost` — borderless; toolbars and low-emphasis actions.
   * - `danger` — destructive actions (delete, remove).
   */
  variant?: ButtonVariant;
  /** Control height/padding. Defaults to `'md'`. */
  size?: ButtonSize;
}

/** Tailwind classes per {@link ButtonVariant}; colors come from semantic tokens only. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-strong',
  secondary: 'bg-surface text-ink border border-border hover:bg-overlay',
  ghost: 'bg-transparent text-ink hover:bg-overlay',
  danger: 'bg-danger text-on-danger hover:opacity-90',
};

/** Tailwind classes per {@link ButtonSize}. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

/**
 * The standard action button.
 *
 * Renders a native `<button>` (default `type="button"` so it never submits a
 * form by accident) styled exclusively with semantic design tokens, so it
 * adapts to every theme automatically. Disabled state dims the button and
 * blocks pointer interaction; focus is a visible token-colored ring.
 *
 * @example
 * <Button onClick={save}>Save</Button>
 * <Button variant="danger" size="sm" onClick={remove}>Delete</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
}
