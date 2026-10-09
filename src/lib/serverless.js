// Vercel (or any VERCEL env) = serverless: no long-lived processes, no child
// processes, no local listeners, read-only FS. Local-only features must stay off.
export const IS_SERVERLESS = process.env.VERCEL === "1" || process.env.VERCEL === "true";
