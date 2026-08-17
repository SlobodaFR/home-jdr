/**
 * Joins conditional class names, filtering out falsy values.
 * Small local helper — avoids pulling in a dependency just to
 * concatenate Tailwind token classes.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
