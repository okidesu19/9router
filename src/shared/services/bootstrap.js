import { IS_SERVERLESS } from "@/lib/serverless.js";

// Skip during Next.js build/prerender — bootstrap would download cloudflared, init DNS, etc.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  || process.env.NEXT_PHASE === "phase-export"
  || process.env.NEXT_PHASE === "phase-static";

// Server-only singleton: guard via global so HMR / re-imports don't double-init
// Serverless: no tunnel/MITM/watchdog — dynamic import keeps those modules unloaded.
if (typeof window === "undefined" && !isBuildPhase && !IS_SERVERLESS && !global.__appBootstrapped) {
  global.__appBootstrapped = true;
  import("./initializeApp.js")
    .then((m) => m.default())
    .catch((e) => console.error("[Bootstrap] init failed:", e.message));
}
