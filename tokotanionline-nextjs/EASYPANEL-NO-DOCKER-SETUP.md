# EasyPanel Setup - TANPA Dockerfile (Recommended)

## ⚠️ MASALAH: npm install gagal di Docker

Jika Docker build terus gagal di `npm install`, gunakan pendekatan ini:

## ✅ SOLUSI: Gunakan Build Command Langsung

### Konfigurasi EasyPanel

**Source Tab:**
- **Source Type:** Pilih tab "Git" (BUKAN Dockerfile)
- **Repository URL:** `https://github.com/tikunganbali-tech/project.git`
- **Branch:** `master`
- **Build Path:** `tokotanionline-nextjs` ⚠️ WAJIB DIISI

**Deploy Tab:**
- **Command:** `npm start` (atau kosongkan, akan pakai default)

**Environment Tab:**
Set semua environment variables (lihat `EASYPANEL-ENV-COMPLETE.txt`)

---

## 🔧 Build Process di EasyPanel

EasyPanel akan otomatis:
1. `cd tokotanionline-nextjs`
2. `npm install` (di VPS langsung, lebih reliable)
3. `npm run build` (jika ada Build Command)
4. `npm start` (jika ada Start Command)

---

## 📋 Checklist

- [ ] Source Type: Git (BUKAN Dockerfile)
- [ ] Build Path: `tokotanionline-nextjs` (WAJIB)
- [ ] Environment Variables: Semua sudah di-set
- [ ] Deploy Command: `npm start` atau kosongkan

---

## 🎯 Keuntungan

- ✅ Tidak perlu Docker build
- ✅ npm install langsung di VPS (lebih reliable)
- ✅ Lebih cepat
- ✅ Lebih mudah debug
