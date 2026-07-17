/** Unique program names safe under Playwright parallel workers. */
export function uniqueName(base: string): string {
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
