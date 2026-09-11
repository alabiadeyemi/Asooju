/** Detect when a prompt needs multi-wave enterprise generation + real backend. */
export type BuildScale = "simple" | "standard" | "enterprise";

const ENTERPRISE_HINTS =
  /\b(shopify|clone|ecommerce|e-commerce|marketplace|saas platform|crm|erp|admin\s*\+?\s*storefront|oms|fulfillment|multi-tenant|b2b|pos\b|subscription commerce|full.?stack|production.?grade|enterprise)\b/i;

const STANDARD_HINTS =
  /\b(dashboard|auth|crud|database|supabase|backend|orders|inventory|checkout|payments|stripe|multi.?page|admin)\b/i;

export function classifyBuildScale(prompt: string, vfsFileCount = 0): BuildScale {
  if (ENTERPRISE_HINTS.test(prompt) || prompt.length > 2500 || vfsFileCount > 18) {
    return "enterprise";
  }
  if (STANDARD_HINTS.test(prompt) || prompt.length > 600 || vfsFileCount > 8) {
    return "standard";
  }
  return "simple";
}

export function needsPersistentBackend(prompt: string): boolean {
  return /\b(auth|login|signup|database|supabase|postgres|orders?|products?|customers?|inventory|checkout|cart|payments?|crud|save|persist|backend|api|admin)\b/i.test(
    prompt
  ) || classifyBuildScale(prompt) !== "simple";
}

export function waveBudget(scale: BuildScale) {
  if (scale === "enterprise") {
    return {
      maxFilesPerWave: 10,
      maxWaves: 4,
      maxFileChars: 4500,
      maxContextChars: 28000,
      contextFileLimit: 16,
      preferFiles: "12–28",
    };
  }
  if (scale === "standard") {
    return {
      maxFilesPerWave: 10,
      maxWaves: 2,
      maxFileChars: 3200,
      maxContextChars: 18000,
      contextFileLimit: 12,
      preferFiles: "8–16",
    };
  }
  return {
    maxFilesPerWave: 8,
    maxWaves: 1,
    maxFileChars: 2200,
    maxContextChars: 12000,
    contextFileLimit: 8,
    preferFiles: "4–10",
  };
}
