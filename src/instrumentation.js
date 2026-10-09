export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initConsoleLogCapture } = await import("@/lib/consoleLogBuffer");
    initConsoleLogCapture();

    const { IS_SERVERLESS } = await import("@/lib/serverless.js");

    // Server-only: lets capabilities.js read the synced catalog without pulling
    // node:fs into the dashboard's browser bundle.
    try {
      const { installCatalogSource } = await import("open-sse/providers/catalogOverride.js");
      await installCatalogSource();
    } catch (e) {
      console.warn(`[instrumentation] catalog source unavailable: ${e.message}`);
    }

    // 24h scheduler is pointless per-lambda (and the synced file lands in /tmp anyway).
    if (!IS_SERVERLESS) {
      const { startModelCatalogSync } = await import("@/lib/modelCatalog/sync.js");
      startModelCatalogSync();
    }
  }
}
