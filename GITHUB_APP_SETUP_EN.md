# GitHub App Setup Guide for NEXORA

## Step 1: Create GitHub App
1. Go to https://github.com/settings/apps
2. Click "New GitHub App"
3. Fill out the form:
   - **Name**: NEXORA Terminal
   - **Homepage URL**: https://github.com/AgentNEXORA
   - **Webhook**: No need to activate
   - **Permissions**:
     - Repository: Read & Write
     - Contents: Read & Write
   - **Subscribe to events**: Not needed
4. Click "Create GitHub App"

## Step 2: Install GitHub App
1. After creation, click "Install App" in the sidebar
2. Select AgentNEXORA account
3. Choose "All repositories" or select specific repository
4. Click "Install"

## Step 3: Get Installation Access Token
1. After installation, open GitHub App settings
2. At the bottom, click "Generate a private key"
3. Save the `.pem` file securely
4. Use the following script to get access token:

```bash
# Install dependencies
npm install @octokit/auth-app

# Create token script
const { createAppAuth } = require('@octokit/auth-app');

const auth = createAppAuth({
  appId: YOUR_APP_ID,
  privateKey: fs.readFileSync('path/to/private-key.pem'),
  installationId: YOUR_INSTALLATION_ID,
});

const { token } = await auth({ type: 'installation' });
console.log('Installation Token:', token);
```

## Step 4: Configure Environment Variables
Add to your `.env` file:
```
GITHUB_APP_ID=your_app_id
GITHUB_INSTALLATION_ID=your_installation_id
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
```

## Troubleshooting
- Make sure the GitHub App has proper permissions
- Check that the app is installed on the correct repositories
- Verify the private key file is accessible
- Installation token expires after 1 hour, refresh as needed

## Indonesian Version
For Indonesian documentation, see [GITHUB_APP_SETUP.md](GITHUB_APP_SETUP.md)