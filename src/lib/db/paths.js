import path from "node:path";
import fs from "node:fs";
import { DATA_DIR } from "@/lib/dataDir.js";

export const DB_DIR = path.join(DATA_DIR, "db");
// DB_FILE overrides the sqlite location (Vercel: baked read-only snapshot at db/data.sqlite,
// while DATA_DIR points at /tmp for incidental writes).
export const DATA_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.join(DB_DIR, "data.sqlite");
export const BACKUPS_DIR = path.join(DB_DIR, "backups");
export const LEGACY_FILES = {
  main: path.join(DATA_DIR, "db.json"),
  usage: path.join(DATA_DIR, "usage.json"),
  disabled: path.join(DATA_DIR, "disabledModels.json"),
  details: path.join(DATA_DIR, "request-details.json"),
};
export function ensureDirs() {
  for (const dir of [DATA_DIR, DB_DIR, BACKUPS_DIR, path.dirname(DATA_FILE)]) {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch { /* read-only FS (Vercel snapshot) */ }
    }
  }
}
