# INSTRUKSI RESTART SERVER

## 🔴 CRITICAL: Server Perlu Restart

Server yang sedang running (PID: 4736, Port: 8090) masih menggunakan versi lama code.

**Code sudah benar dan lengkap, tapi server perlu restart untuk load code baru.**

---

## 📋 LANGKAH RESTART

### Option 1: Restart Manual (Recommended)

1. **Buka terminal tempat server running**
2. **Tekan `Ctrl+C` untuk stop server**
3. **Restart server:**
   ```powershell
   cd c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs\engine-hub
   $env:OPENAI_API_KEY="your-api-key-here"
   go run cmd/server/main.go
   ```
4. **Tunggu sampai muncul:**
   ```
   [BOOT] ENGINE HUB RUNNING ON :8090
   ```

### Option 2: Kill Process & Restart

1. **Kill process yang menggunakan port 8090:**
   ```powershell
   taskkill /PID 4736 /F
   ```

2. **Verifikasi port kosong:**
   ```powershell
   netstat -ano | findstr ":8090"
   ```
   (Harus tidak ada output)

3. **Restart server:**
   ```powershell
   cd c:\Users\PC-Desktop\Music\AGRICULTURAL\tokotanionline-nextjs\engine-hub
   $env:OPENAI_API_KEY="your-api-key-here"
   go run cmd/server/main.go
   ```

---

## ✅ SETELAH RESTART

1. **Verifikasi server running:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8090/health"
   ```

2. **Generate sample:**
   ```powershell
   cd engine-hub
   .\controlled-production-k1.ps1
   ```

---

## 📊 EXPECTED RESULT

Setelah restart, generate sample akan berhasil dengan:
- ✅ Status: SUCCESS
- ✅ Word Count: 1200-2000
- ✅ Depth Score: ≥ 0.75
- ✅ Repetition Rate: ≤ 5%
- ✅ Structure Compliance: 100%
- ✅ Readability: PASS

---

**Setelah restart, test akan berjalan normal!**
