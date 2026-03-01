# NEXORA Console (CLI On-Demand)

A clean "Web4-style" console UI + Linux bridge API that runs a whitelisted set of commands to trigger your Python module agent.

## Usage Guide (English)

### Overview
- NEXORA Terminal is a web interface for executing whitelisted commands through a "Linux Bridge".
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
- Click "Refresh" to load command catalog from `/api/commands`.
- Select command in left panel, enter arguments in middle panel, click "Run".
- Use "Cancel", "Copy Output", and "Clear" as needed.

### GitHub Synchronization (Automatic)
- Fill backend environment variables (see `.env.example`):
  - `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_PATH`
- Available endpoints:
  - `POST /api/github/create-repo` → Create repo (if not exists)
  - `POST /api/github/connect` → Initialize git, set remote, initial commit
  - `POST /api/github/push` → Push commit to branch
  - `POST /api/github/sync-commands` → Write `backend/commands.json` to repo via GitHub API
- UI buttons available: "Connect Repo", "Push Repo", "Sync GitHub".

## Indonesian Documentation
For Indonesian documentation, see the original files:
- [GITHUB_APP_SETUP.md](GITHUB_APP_SETUP.md) - GitHub App Setup Guide (Indonesian)
- [PERSONAL_TOKEN_SETUP.md](PERSONAL_TOKEN_SETUP.md) - Personal Access Token Guide (Indonesian)
- [MANUAL_REPO_CREATION.md](MANUAL_REPO_CREATION.md) - Manual Repository Creation (Indonesian)

## Security Notes
- Only whitelist safe commands in `commands.json`
- Never expose sensitive data in command outputs
- Use environment variables for sensitive configuration
- Regularly update dependencies for security patches