// Vercel build-time only: turn the uploaded local sqlite file into a consistent
// read-only snapshot. The build FS is writable; the runtime FS is not. WAL hot
// files (-wal/-shm) are not readable at runtime, so checkpoint + switch to the
// DELETE journal. No-op outside VERCEL or when the snapshot is absent.
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(process.env.DB_FILE || "db/data.sqlite");

if (!process.env.VERCEL) {
  console.log("[snapshot] not on Vercel — skip");
} else if (!fs.existsSync(file)) {
  console.warn(`[snapshot] ${file} missing — deploy will run without data (run the app locally first)`);
} else {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(file);
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  const mode = db.prepare("PRAGMA journal_mode = DELETE").get();
  db.close();
  console.log(`[snapshot] ${file} checkpointed, journal_mode → ${Object.values(mode ?? {})[0] ?? "?"}`);
}
