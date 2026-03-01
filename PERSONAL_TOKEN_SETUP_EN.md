# Personal Access Token Setup for NEXORA

## Steps to Create Personal Access Token

### 1. Login to GitHub
- Open https://github.com and login with **AgentNEXORA** account

### 2. Access Settings
- Click profile photo in top right corner
- Select **"Settings"** from dropdown menu

### 3. Developer Settings
- Scroll down in left sidebar
- Click **"Developer settings"**

### 4. Personal Access Tokens
- Click **"Personal access tokens"**
- Select **"Tokens (classic)"**
- Click **"Generate new token"**

### 5. Token Configuration
- **Note**: `NEXORA Terminal Access`
- **Expiration**: Select 90 days (or as needed)
- **Select scopes**: Check the following options:
  - ✅ `repo` (Full control of private repositories)
  - ✅ `workflow` (Update GitHub Action workflows)

### 6. Generate & Save Token
- Click **"Generate token"**
- **COPY TOKEN** that appears (⚠️ Token only appears once!)
- Save securely

### 7. Configure Environment Variables
Add to your `.env` file:
```
GITHUB_TOKEN=your_personal_access_token
GITHUB_OWNER=AgentNEXORA
GITHUB_REPO=nexora-terminal
GITHUB_BRANCH=main
```

## Security Best Practices
- Never share your personal access token
- Use the minimum required permissions
- Set appropriate expiration dates
- Rotate tokens regularly
- Store tokens securely (use environment variables)

## Troubleshooting
- If token doesn't work, check permissions
- Ensure token hasn't expired
- Verify GitHub account has proper access
- Check environment variable configuration

## Indonesian Version
For Indonesian documentation, see [PERSONAL_TOKEN_SETUP.md](PERSONAL_TOKEN_SETUP.md)