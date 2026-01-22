# Environment Setup untuk Development

## ✅ Setup Selesai

File `.env` sudah dikonfigurasi di `engine-hub/.env` dengan:
- ✅ `OPENAI_API_KEY` - API key untuk AI content generation
- ✅ `IMAGE_SIZE` - Ukuran gambar (1024x1024)
- ✅ `.gitignore` - File .env sudah diabaikan Git

## 📋 Cara Menggunakan

### 1. File .env (DISARANKAN untuk Development)

File `.env` sudah dibuat di `engine-hub/.env`. Server akan otomatis load file ini saat start.

**Tidak perlu set environment variable manual!**

```powershell
# Langsung start server
cd engine-hub
go run cmd/server/main.go
```

### 2. Environment Variable (Alternative)

Jika tidak menggunakan .env, bisa set environment variable:

```powershell
$env:OPENAI_API_KEY = "sk-..."
cd engine-hub
go run cmd/server/main.go
```

### 3. Test Drive

Setelah server running, jalankan test:

```powershell
cd engine-hub
.\QUICK-TEST-DRIVE.ps1
```

Script akan otomatis detect .env file atau environment variable.

## 🔒 Security

- ✅ File `.env` sudah di `.gitignore` (tidak akan di-commit)
- ✅ API key tidak akan muncul di repository
- ✅ Untuk production, gunakan environment variables (bukan .env file)

## 📝 Isi File .env

```
OPENAI_API_KEY=sk-proj-...
IMAGE_SIZE=1024x1024
```

File lengkap ada di `engine-hub/.env`

## ⚠️ Troubleshooting

### Server tidak load .env

Pastikan:
1. File `.env` ada di `engine-hub/.env` (sama level dengan `go.mod`)
2. Package `godotenv` sudah terinstall: `go get github.com/joho/godotenv`
3. Server di-start dari directory `engine-hub/`

### API Key Error

Jika masih error "API key not set":
1. Cek isi file `.env` (pastikan `OPENAI_API_KEY=sk-...`)
2. Restart server setelah edit .env
3. Atau set environment variable sebagai fallback
