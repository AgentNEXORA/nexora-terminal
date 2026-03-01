# NEXORA Console (CLI On-Demand)

A clean "Web4-style" console UI + Linux bridge API that runs a whitelisted set of commands to trigger your Python module agent.

## 📚 Documentation Languages
- **[English Documentation](README_EN.md)** - Complete guide in English
- **[Dokumentasi Bahasa Indonesia](README.md#panduan-penggunaan-bahasa-indonesia)** - Panduan lengkap dalam Bahasa Indonesia

## Panduan Penggunaan (Bahasa Indonesia)

### Ringkasan
- Terminal NEXORA adalah antarmuka web untuk menjalankan perintah yang di-whitelist melalui “Linux Bridge”.
- Alur: Frontend (UI) → Backend (Bridge API) → Eksekusi perintah dari `backend/commands.json`.

### Prasyarat
- Node.js untuk frontend dan backend.
- (Opsional) Python agent terpasang di server Linux.
- File whitelist: `backend/commands.json` (salin dari `commands.sample.json`).

### Menjalankan Backend (Linux Bridge)
```bash
cd backend
cp .env.example .env
cp commands.sample.json commands.json
npm i
npm start
```
- Port default: `8787`
- Sesuaikan `commands.json` hanya berisi perintah yang aman dan diperlukan.

### Menjalankan Frontend (Terminal Web)
```bash
cd frontend
npm i
export VITE_API_BASE="http://localhost:8787"
npm run dev
```
- Buka: `http://localhost:5173`
- Frontend membaca API dari `VITE_API_BASE`. Jika kosong, gunakan path relatif `/api/...` (cocok untuk proxy/rewrite di hosting).

### Menggunakan Terminal
- Klik “Refresh” untuk memuat katalog perintah dari `/api/commands`.
- Pilih perintah di panel kiri, isi argumen di panel tengah, klik “Run”.
- Gunakan “Cancel”, “Copy Output”, dan “Clear” sesuai kebutuhan.

### Sinkronisasi ke GitHub (otomatis)
- Isi variabel lingkungan backend (lihat `.env.example`):
  - `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_PATH`
- Endpoint tersedia:
  - `POST /api/github/create-repo` → Membuat repo (jika belum ada)
  - `POST /api/github/connect` → Inisialisasi git, set remote, commit awal
  - `POST /api/github/push` → Push commit ke branch
  - `POST /api/github/sync-commands` → Menulis `backend/commands.json` ke repo via GitHub API
- Di UI tersedia tombol: “Connect Repo”, “Push Repo”, “Sync GitHub”.
- Rekomendasi repo: akun `AgentNEXORA` dengan nama misalnya `nexora-console`.

### Keamanan
- Jangan menaruh token di kode; simpan di environment (dotenv).
- Batasi akses Bridge API (reverse proxy, jaringan internal, atau auth tambahan).
- Validasi argumen; backend menolak karakter shell berbahaya.
- Hindari log rahasia; review perubahan `commands.json` via PR untuk audit.

## Quick Start

### Backend (Linux bridge)
```bash
cd backend
cp .env.example .env
cp commands.sample.json commands.json
npm i
npm start
```

### Frontend
```bash
cd frontend
npm i
# Linux/mac:
export VITE_API_BASE="http://localhost:8787"
npm run dev
```

Open: http://localhost:5173

## Agent: python -m nexora_agent --prompt "..."

Install your agent module in a dedicated venv (recommended):
```bash
sudo mkdir -p /opt/nexora-agent
cd /opt/nexora-agent
python3 -m venv .venv
./.venv/bin/pip install -U pip
./.venv/bin/pip install nexora_agent
./.venv/bin/python -m nexora_agent --help
```

## Whitelisted commands

Backend runs ONLY commands listed in `backend/commands.json`. Use `{{placeholders}}` inside command strings and send args from the UI.

### Sync commands.json from official GitHub (optional)
```bash
curl -fsSL "https://raw.githubusercontent.com/ORG/REPO/main/commands.json" -o /opt/nexora-console/backend/commands.json
```

## Security notes (recommended)
- Run backend as a non-root user.
- Keep bridge API behind a reverse proxy / internal network.
- Consider adding API key auth if exposed beyond localhost.
