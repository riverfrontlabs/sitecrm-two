import { useId, type InputHTMLAttributes } from 'react';
import { cx } from '../utils/cx';

/** Props accepted by {@link Input}; all native `<input>` props pass through. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label, associated with the input via `htmlFor`/`id`. */
  label: string;
  /** Optional helper text rendered under the field. Hidden while `error` is set. */
  hint?: string;
  /**
   * Validation message. When set, the field is marked `aria-invalid`, the
   * message is announced to assistive tech, and the border turns `danger`.
   */
  error?: string;
}

/**
 * A labelled, single-line text field with built-in hint and error display.
 *
 * Accessibility is wired automatically: the label is associated via a
 * generated `id` (overridable), and hint/error text is linked through
 * `aria-describedby` so screen readers announce it with the field.
 *
 * @example
 * <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
 * <Input label="URL" error={urlError} hint="Must start with https://" />
 */
export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cx(
          'h-10 rounded-md border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-canvas',
          'disabled:pointer-events-none disabled:opacity-50',
          error ? 'border-danger' : 'border-border',
        )}
        {...rest}
      />
      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cx('text-xs', error ? 'text-danger' : 'text-ink-muted')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
