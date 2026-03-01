# Panduan Setup GitHub App untuk NEXORA

## Langkah 1: Buat GitHub App
1. Buka https://github.com/settings/apps
2. Klik "New GitHub App"
3. Isi form:
   - **Name**: NEXORA Terminal
   - **Homepage URL**: https://github.com/AgentNEXORA
   - **Webhook**: Tidak perlu aktif
   - **Permissions**:
     - Repository: Read & Write
     - Contents: Read & Write
   - **Subscribe to events**: Tidak perlu
4. Klik "Create GitHub App"

## Langkah 2: Install GitHub App
1. Setelah dibuat, klik "Install App" di sidebar
2. Pilih akun AgentNEXORA
3. Pilih "All repositories" atau pilih repository tertentu
4. Klik "Install"

## Langkah 3: Dapatkan Installation Access Token
1. Setelah install, buka settings GitHub App
2. Di bagian bawah, klik "Generate a private key"
3. Simpan file `.pem` dengan aman
4. Gunakan script berikut untuk mendapatkan access token:

```bash
# Install dependencies
npm install @octokit/auth-app

# Buat script get-token.js
const { createAppAuth } = require("@octokit/auth-app");

const auth = createAppAuth({
  appId: "YOUR_APP_ID",
  privateKey: require("fs").readFileSync("path/to/private-key.pem"),
  installationId: "YOUR_INSTALLATION_ID"
});

auth({ type: "installation" }).then(({ token }) => {
  console.log("Installation Token:", token);
});
```

## Langkah 4: Update .env
Setelah mendapatkan token, update file backend/.env:
```
GITHUB_TOKEN=your_installation_token_here
```