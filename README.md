# NEXORA Console (CLI On-Demand)

A clean "Web4-style" console UI + Linux bridge API that runs a whitelisted set of commands to trigger your Python module agent.

## 📚 Documentation
- **[English Documentation](README.md)** - Complete guide in English

## Usage Guide (English)

### Overview
- NEXORA Terminal is a web interface for executing whitelisted commands through a “Linux Bridge”.
- Flow: Frontend (UI) → Backend (Bridge API) → Execute commands from `backend/commands.json`.

### Prerequisites
- Node.js for frontend and backend.
- (Optional) Python agent installed on Linux server.
- Whitelist file: `backend/commands.json` (copy from `commands.sample.json`).

### Running Backend (Linux Bridge)
```bash
cd backend
cp .env.example .env
cp commands.sample.json commands.json
npm i
npm start
```
- Default port: `8787`
- Adjust `commands.json` to only contain safe and necessary commands.

### Running Frontend (Web Terminal)
```bash
cd frontend
npm i
export VITE_API_BASE="http://localhost:8787"
npm run dev
```
- Open: `http://localhost:5173`
- Frontend reads API from `VITE_API_BASE`. If empty, uses relative path `/api/...` (suitable for proxy/rewrite in hosting).

### Using the Terminal
- Click “Refresh” to load command catalog from `/api/commands`.
- Select command in left panel, enter arguments in middle panel, click “Run”.
- Use “Cancel”, “Copy Output”, and “Clear” as needed.

### GitHub Synchronization (Automatic)
- Fill backend environment variables (see `.env.example`):
  - `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_PATH`
- Available endpoints:
  - `POST /api/github/create-repo` → Create repo (if not exists)
  - `POST /api/github/connect` → Initialize git, set remote, initial commit
  - `POST /api/github/push` → Push commit to branch
  - `POST /api/github/sync-commands` → Write `backend/commands.json` to repo via GitHub API
- UI buttons available: “Connect Repo”, “Push Repo”, “Sync GitHub”.
- Recommended repo: account `AgentNEXORA` with name like `nexora-console`.

### Security
- Don’t put tokens in code; store in environment (dotenv).
- Limit Bridge API access (reverse proxy, internal network, or additional auth).
- Validate arguments; backend rejects dangerous shell characters.
- Avoid secret logs; review `commands.json` changes via PR for audit.

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
