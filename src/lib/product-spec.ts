/** Long markdown specs / blueprints — skip discovery, lock full brief for build. */
export function isDetailedProductSpec(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  if (t.length >= 800) return true;
  if (t.length >= 350 && /(^|\n)#{1,3}\s+\d+\./m.test(t)) return true;
  if (
    /\b(blueprint|dev blueprint|product scope|roadmap|architecture|feature breakdown)\b/i.test(t) &&
    t.length >= 200
  ) {
    return true;
  }
  if (/\b(module|multi-tenant|phase\s+[01]|mvp)\b/i.test(t) && t.length >= 400) return true;
  return false;
}
