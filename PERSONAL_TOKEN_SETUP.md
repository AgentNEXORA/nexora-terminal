# Setup Personal Access Token untuk NEXORA

## Langkah-langkah Membuat Personal Access Token

### 1. Login ke GitHub
- Buka https://github.com dan login dengan akun **AgentNEXORA**

### 2. Akses Settings
- Klik foto profil di pojok kanan atas
- Pilih **"Settings"** dari dropdown menu

### 3. Developer Settings
- Scroll ke bawah di sidebar kiri
- Klik **"Developer settings"**

### 4. Personal Access Tokens
- Klik **"Personal access tokens"**
- Pilih **"Tokens (classic)"**
- Klik **"Generate new token"**

### 5. Konfigurasi Token
- **Note**: `NEXORA Terminal Access`
- **Expiration**: Pilih 90 days (atau sesuai kebutuhan)
- **Select scopes**: Centang opsi berikut:
  - ✅ `repo` (Full control of private repositories)
  - ✅ `workflow` (Update GitHub Action workflows)

### 6. Generate & Simpan Token
- Klik **"Generate token"**
- **COPY TOKEN** yang muncul (⚠️ Token hanya muncul sekali!)
- Simpan dengan aman

### 7. Gunakan Token
Setelah mendapatkan token, berikan kepada saya dan saya akan bantu:
1. Update file `.env` dengan token Anda
2. Buat repository `nexora-terminal` di GitHub
3. Push kode ke repository

## Contoh Token Format
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Keamanan Token
- Jangan share token di public
- Jangan commit token ke repository
- Gunakan token yang terbatas waktunya
- Revoke token jika tidak digunakan