## Goal
Deploy 9RouterAI ke Vercel (core saja: dashboard, auth, `/v1` proxy, usage stream). Data dikelola lokal di `<project-dir>/db/data.sqlite`, di-bake ke build sebagai snapshot read-only. MITM/tunnel/OAuth-loopback/MCP auto-disable di Vercel.

## Perubahan kode

### 1. Default DATA_DIR → project dir (lokal)
`src/lib/dataDir.js` — `defaultDir()`: jika `next.config.mjs` ada di `process.cwd()` → return cwd; else fallback `~/.9router` lama (CLI global tetap). Hasil: `<project-dir>/db/data.sqlite`.
- Docker/compose tidak terpengaruh (`DATA_DIR=/app/data` sudah di-set di `Dockerfile:52` + `docker-compose.yml:13`).

### 2. DB file override
`src/lib/db/paths.js`:
```js
export const DATA_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.join(DB_DIR, "data.sqlite");
```
Vercel: `DB_FILE=db/data.sqlite` (baked, read-only), `DATA_DIR=/tmp/9router` (jwt-secret, machine-id, dll tulis ke /tmp).

### 3. Mode snapshot read-only (`DB_READONLY=1`)
- `src/lib/db/driver.js`: `DB_READONLY=1` → paksa `trySqlJs()` saja (skip better-sqlite3/node:sqlite yang open O_RDWR → EROFS).
- `src/lib/db/adapters/sqljsAdapter.js`: param `readonly` — file missing → throw error jelas (`db/data.sqlite missing — run app locally first`); `persist()`/`flush()`/`close()` no-op saat readonly. Tulisan repo berikutnya cuma mutasi memori per-lambda (hilang cold start) — sesuai semantics "snapshot"; tidak perlu gate kode penulis.
- `runMigrationOnce` tetap jalan — schema sudah termigrasi dari lokal, marker table baked → no-op in-memory.

### 4. Serverless gate (core saja)
New `src/lib/serverless.js`: `export const IS_SERVERLESS = !!process.env.VERCEL;`
- `src/shared/services/bootstrap.js`: skip `initializeApp()` saat serverless (tunnel/MITM/watchdog/scheduler tidak jalan).
- `src/instrumentation.js`: skip `startModelCatalogSync()`; `installCatalogSource()` dibungkus try/catch kalau baca file DATA_DIR.
- `src/dashboardGuard.js` — satu choke point di `proxy()`: saat serverless, path prefix `["/api/tunnel", "/api/mcp", "/api/cli-tools", "/api/shutdown", "/api/oauth", "/api/translator/console-logs", "/api/version/update"]` → Response 503 `"{\"error\":\"feature not available on serverless\"}"`. Audit `/api/oauth/*` saat implementasi: kalau ada route refresh-token yang dibutuhkan alur `/v1`, route itu di-exclude dari gate.

### 5. Build config
- `next.config.mjs`:
  - `output: process.env.VERCEL ? undefined : "standalone"` (Vercel pakai default output).
  - saat VERCEL: `outputFileTracingIncludes: { "*": ["./db/**"] }` → `db/data.sqlite` masuk function bundle (read-only, path relatif cwd = project root di lambda).
- New `vercel.json`: `{ "buildCommand": "npm run build" }` — paksa `next build --webpack` (bukan default turbopack).
- New `.vercelignore`: `.git`, `.next`, `.vercel`, `node_modules` — **`db/` TIDAK di-ignore** (CLI upload lokal).
- `.gitignore`: tambah `db/` — sqlite berisi API key, jangan masuk git. Deploy via `vercel` CLI dari mesin lokal (upload lokal, bukan git integration).
- Streaming routes: `export const maxDuration = 300` di `src/app/api/v1/chat`, `api/v1/responses`, `api/v1/messages` (dan route proxy SSE lain — verifikasi daftar saat implementasi) + `api/usage/stream`. Kalau build error "exceeds plan limit" → turunkan ke 60.

### 6. Env Vercel (dashboard project settings)
`JWT_SECRET` (wajib, hindari jwt file di /tmp → sesi reset tiap cold start), `DATA_DIR=/tmp/9router`, `DB_FILE=db/data.sqlite`, `DB_READONLY=1`, `AUTH_COOKIE_SECURE=true`, `NEXT_PUBLIC_BASE_URL=https://<app>.vercel.app`.

## Langkah pre-deploy (lokal)
1. Jalankan app lokal sekali → `<project-dir>/db/data.sqlite` terbentuk. Kalau mau pakai data lama: `cp -r ~/.9router/db ./db`.
2. Deploy: `vercel` CLI dari repo (upload `db/` + kode).

## Verifikasi
1. `VERCEL=1 npm run build` lokal — pastikan output non-standalone, tracing masuk, tidak ada error.
2. Cek proxy runtime: `src/proxy.js` import `localDb` (node:fs) — kalau Vercel build gagal edge-runtime, tambah `runtime: "nodejs"` ke `export const config` (Next 16 node middleware — verifikasi syntax saat implementasi).
3. Smoke test deploy: login, dashboard load, `/v1/models`, gated route → 503.

## Risiko yang diterima (sesuai pilihan user)
- Multi-lambda in-memory state (loginLimiter, usage ring buffer) reset per instance.
- Usage stats & settings changes di Vercel tidak persist (snapshot) — manage data lokal, redeploy untuk update.
- `custom-server.js` (peer-IP stamping) tidak jalan → rate-limit pakai `x-forwarded-for` (Vercel set, trusted proxy).
- Data update = redeploy.