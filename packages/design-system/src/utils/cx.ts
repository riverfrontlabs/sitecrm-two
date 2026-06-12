/**
 * Joins class name fragments, skipping falsy values.
 *
 * A tiny, dependency-free alternative to `clsx` — sufficient because the
 * design system only ever combines plain strings and conditionals.
 *
 * @param parts - Class name fragments; `false`, `null` and `undefined` are dropped.
 * @returns The space-joined class string.
 *
 * @example
 * cx('btn', isActive && 'btn-active', size === 'lg' && 'btn-lg');
 * // => 'btn btn-active' (when isActive is true and size is 'md')
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
