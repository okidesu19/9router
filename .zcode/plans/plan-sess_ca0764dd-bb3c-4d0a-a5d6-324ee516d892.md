## Diagnosis: opencode "fetch failed" di Vercel

Penyebab paling mungkin: instance Vercel menjalankan build LAMA (sebelum fix `e4d69308`). Saat itu driver DB gagal total → `validateApiKey` di middleware (`dashboardGuard.js:165`) melempar tak tertangkap → SEMUA request `/v1` → 500 → opencode lihat koneksi putus = "fetch failed".

Fix kode (insurance + kecepatan):
1. `src/app/api/v1/models/route.js` — saat `IS_SERVERLESS`, lewati `LIVE_MODEL_RESOLVERS` + `fetchCompatibleModelIds` (outbound berurutan 5-30s/provider, tanpa `maxDuration` → Vercel kill function → timeout). Model list = snapshot DB + statis + alias — cukup untuk opencode.
2. Tambah `export const maxDuration = 60;` di route itu (jaring pengaman).
3. `dashboardGuard.js` — `validateApiKey` dibungkus try/catch → DB error jadi 503, bukan 500 middleware crash.

Langkah user:
1. Push commit `e4d69308` (dan commit fix baru) → redeploy Vercel.
2. Pastikan ada API key di snapshot lokal (DB yang di-commit masih kosong — `apiKeys` kemungkinan 0 baris). Buat key di dashboard lokal lalu commit `db/data.sqlite` lagi ATAU set `REQUIRE_API_KEY` off di DB settings sebelum snapshot.
3. Verifikasi: `curl https://<app>.vercel.app/v1/models -H "Authorization: Bearer <key>"` harus 200.