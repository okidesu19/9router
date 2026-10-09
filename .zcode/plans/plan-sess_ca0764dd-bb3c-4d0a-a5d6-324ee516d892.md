## Buat `/home/tan/Dokumen/PROJECT/9RouterAI/.env` (gitignored, lokal saja)

Isi:
```
# Local env — gitignored. Vercel: set via dashboard, bukan file ini.
JWT_SECRET=<random hex 64>
INITIAL_PASSWORD=change-me
PORT=20129
NODE_ENV=production
AUTH_COOKIE_SECURE=false

API_KEY_SECRET=<random hex>
MACHINE_ID_SALT=<random hex>
ENABLE_REQUEST_LOGS=false
OBSERVABILITY_ENABLED=true
REQUIRE_API_KEY=false

# Cloud sync (local instance)
BASE_URL=http://localhost:20129
NEXT_PUBLIC_BASE_URL=http://localhost:20129
CLOUD_URL=https://9router.com
NEXT_PUBLIC_CLOUD_URL=https://9router.com
```

Catatan:
- `DATA_DIR` di-omit — default baru = project dir → `<project-dir>/db/data.sqlite` (sudah terbentuk).
- `DB_FILE`/`DB_READONLY` di-omit — Vercel-only, set di dashboard Vercel.
- 3 secret digenerate random (crypto) saat write.
- Port 20129 (20128 dipakai global instance user).
- Verifikasi: `git check-ignore .env` → ignored; app boot lokal masih hijau.