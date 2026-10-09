## Fix "[DB] No SQLite driver available" di Vercel

Akar masalah: `DB_READONLY=1` memaksa sql.js → WASM sql.js tidak ter-trace ke lambda Vercel → init gagal. Padahal `node:sqlite` (built-in Node ≥22.5) bisa buka file read-only.

### 1. `src/lib/db/driver.js`
Readonly mode: coba `node:sqlite` dulu, baru sql.js fallback (better-sqlite3 tetap di-skip — native, open O_RDWR).

### 2. `src/lib/db/adapters/nodeSqliteAdapter.js`
Terima flag readonly:
- `new DatabaseSync(filePath, { readOnly: true })` — open berhasil di FS read-only.
- Pakai pragma read-only-safe (lihat #3) — `PRAGMA journal_mode = WAL` gagal di koneksi readonly → batch exec putus.
- Lewati WAL checkpoint timer + shutdown checkpoint (tetap `db.close()`).

### 3. `src/lib/db/schema.js`
Tambah `PRAGMA_SQL_READONLY` = PRAGMA_SQL tanpa `journal_mode` (synchronous/temp_store/mmap/cache/foreign_keys aman di readonly).

### 4. `next.config.mjs`
Saat VERCEL, `outputFileTracingIncludes` tambah `./node_modules/sql.js/**/*.wasm` — fallback sql.js jalan kalau node:sqlite absen.

### 5. `scripts/prepare-db-snapshot.mjs` (baru)
Dijalankan build-time Vercel (FS masih writable saat build): kalau `VERCEL` + `db/data.sqlite` ada → buka rw, `PRAGMA wal_checkpoint(TRUNCATE)`, `PRAGMA journal_mode = DELETE`, tutup. Snapshot konsisten (WAL hot file tidak lagi dibutuhkan runtime). Idempotent, no-op lokal.
Wire di `vercel.json`: `"buildCommand": "node scripts/prepare-db-snapshot.mjs && npm run build"`.

### Verifikasi lokal
1. `node scripts/prepare-db-snapshot.mjs` dengan env simulasi → journal jadi DELETE.
2. `VERCEL=1 DATA_DIR=/tmp/9router DB_FILE=db/data.sqlite DB_READONLY=1 JWT_SECRET=x node custom-server.js --port 20141` → log `[DB] Driver: node:sqlite`, health 200, gated 503.
3. `VERCEL=1 npm run build` tetap hijau.

Firestore ditunda — tidak perlu bila error ini selesai (data lokal tetap snapshot, tulis di Vercel tetap diabaikan).