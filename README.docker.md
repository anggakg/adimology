# Deploy Lokal dengan Docker Compose

Panduan untuk menjalankan Adimology di lokal menggunakan Docker Compose.  
Database tetap menggunakan **Supabase cloud** (tidak perlu self-host PostgreSQL).

## Prasyarat

- Docker & Docker Compose sudah terpasang
- Akun Supabase (free tier cukup)
- Token Stockbit JWT
- API key Google Gemini

---

## Langkah Setup

### 1. Siapkan environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` dan isi semua variabel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
STOCKBIT_JWT_TOKEN=eyJ...
CRON_SECRET=isi-string-acak-panjang   # openssl rand -hex 32
GEMINI_API_KEY=AIza...
APP_INTERNAL_URL=http://web:3000      # jangan diubah
```

### 2. Jalankan migrations (pertama kali)

Pastikan Supabase Anda sudah punya fungsi `exec_migration_sql`. Jika belum, jalankan SQL di bawah manual di Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum TEXT,
  execution_time_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);
CREATE OR REPLACE FUNCTION exec_migration_sql(sql_query TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN EXECUTE sql_query; END; $$;
```

Kemudian jalankan migration runner (butuh Node.js lokal):

```bash
npm run migrate
```

### 3. Build dan jalankan

```bash
docker compose up --build
```

Atau di background:

```bash
docker compose up --build -d
```

### 4. Akses aplikasi

Buka browser ke: **http://localhost:3000**

---

## Perintah berguna

```bash
# Lihat logs semua service
docker compose logs -f

# Lihat logs app saja
docker compose logs -f web

# Lihat logs cron saja
docker compose logs -f cron

# Test trigger cron secara manual
docker compose exec cron sh /trigger.sh

# Stop semua
docker compose down

# Rebuild setelah perubahan kode
docker compose up --build
```

---

## Cron Job

Cron job **analyze-watchlist** berjalan setiap hari jam **11:00 UTC** (18:00 WIB).  
Ini menggantikan Netlify scheduled function yang sebelumnya digunakan.

Jadwal dapat diubah di `docker/cron/crontab`.

---

## Struktur Docker

```
adimology/
├── Dockerfile              # Multi-stage build untuk Next.js
├── docker-compose.yml      # Orkestasi: web + cron
├── .dockerignore           # File yang di-skip saat build
└── docker/
    └── cron/
        ├── crontab         # Jadwal cron (0 11 * * *)
        └── trigger.sh      # Script yang memanggil /api/analyze-watchlist
```
