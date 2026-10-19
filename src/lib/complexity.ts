/** Detect when a prompt needs multi-wave enterprise generation + real backend. */
export type BuildScale = "simple" | "standard" | "enterprise";

const ENTERPRISE_HINTS =
  /\b(shopify|clone|ecommerce|e-commerce|marketplace|saas platform|crm|erp|admin\s*\+?\s*storefront|oms|fulfillment|multi-tenant|b2b|pos\b|subscription commerce|full.?stack|production.?grade|enterprise|hubspot|mailchimp|digital marketing|mar[\s-]?tech|marketing platform|all-in-one saas)\b/i;

const STANDARD_HINTS =
  /\b(dashboard|auth|crud|database|supabase|backend|orders|inventory|checkout|payments|stripe|multi.?page|admin)\b/i;

/**
 * 3D / WebGL / browser-game briefs need a second wave and larger files.
 * Match canvas/mesh asks ("3d object", "webgl", "three.js") but keep
 * "three pricing tiers" and illustration-only "low-poly" on the normal path.
 */
const SCENE_BUILD_PATTERNS: RegExp[] = [
  /\bwebgl\b/i,
  /\bthree\.js\b/i,
  /\bthreejs\b/i,
  /\b(?:low-?poly|mid-?poly|3d|browser|driving|racing)\s+game\b/i,
  /\bbrowser\s+game\b/i,
  // "3d object", "3-dimensional cube", "three dimensional sphere"
  /\b(?:3[-\s]?d|3\s*dimensional|three[-\s]?dimensional)\b[\w\s-]{0,40}\b(?:object|objects|cube|cubes|sphere|spheres|mesh|meshes|model|models|scene|scenes|viewer|canvas|world|shape|shapes|geometry|render(?:er|ing)?|animation)\b/i,
  // reverse: "cube in 3d", "mesh with three.js"
  /\b(?:object|objects|cube|cubes|sphere|spheres|mesh|meshes|model|models|scene|scenes|viewer|canvas|shape|shapes)\b[\w\s-]{0,40}\b(?:3[-\s]?d|3\s*dimensional|three[-\s]?dimensional|webgl|three\.js)\b/i,
];

export function isSceneBuild(prompt: string): boolean {
  return SCENE_BUILD_PATTERNS.some((re) => re.test(prompt));
}

function stripSceneHints(prompt: string): string {
  return SCENE_BUILD_PATTERNS.reduce((text, re) => {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    return text.replace(new RegExp(re.source, flags), " ");
  }, prompt);
}

export function classifyBuildScale(prompt: string, vfsFileCount = 0): BuildScale {
  if (ENTERPRISE_HINTS.test(prompt) || prompt.length > 2500 || vfsFileCount > 18) {
    return "enterprise";
  }
  if (
    STANDARD_HINTS.test(prompt) ||
    isSceneBuild(prompt) ||
    prompt.length > 600 ||
    vfsFileCount > 8
  ) {
    return "standard";
  }
  return "simple";
}

/** How much of workspacePurpose / approved brief to inline per scale (chars). */
export function purposeCharBudget(scale: BuildScale): number {
  if (scale === "enterprise") return 14_000;
  if (scale === "standard") return 6_000;
  return 2_500;
}

const DATA_HINTS =
  /\b(auth|login|signup|database|supabase|postgres|orders?|products?|customers?|inventory|checkout|cart|payments?|crud|save|persist|backend|api|admin)\b/i;

export function needsPersistentBackend(prompt: string): boolean {
  if (DATA_HINTS.test(prompt)) return true;
  // A short game brief is "standard" only so the scene can fit. That bump must not
  // force Supabase onto a driving game. Data words above still opt in.
  if (isSceneBuild(prompt)) {
    const withoutScene = stripSceneHints(prompt);
    return classifyBuildScale(withoutScene) !== "simple";
  }
  return classifyBuildScale(prompt) !== "simple";
}

export function waveBudget(scale: BuildScale, vfsFileCount = 0) {
  const large = vfsFileCount > 24;
  if (scale === "enterprise") {
    return {
      maxFilesPerWave: 10,
      maxWaves: 4,
      maxFileChars: large ? 5200 : 4500,
      maxContextChars: large ? 36000 : 28000,
      contextFileLimit: large ? 22 : 16,
      preferFiles: "12–28",
    };
  }
  if (scale === "standard") {
    return {
      maxFilesPerWave: 10,
      maxWaves: 2,
      maxFileChars: large ? 4000 : 3200,
      maxContextChars: large ? 24000 : 18000,
      contextFileLimit: large ? 16 : 12,
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
