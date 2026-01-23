# EasyPanel Final Solution - Fix npm install Error

## 🔍 ROOT CAUSE

Error `npm install` di Docker build kemungkinan karena:
1. **Network timeout** - VPS network lambat ke npm registry
2. **Memory limit** - Docker build context terbatas
3. **Dependency conflict** - Package resolution issue
4. **Alpine Linux compatibility** - Native modules butuh build tools

## ✅ SOLUSI FINAL: 2 Opsi

### OPSI 1: Gunakan Git Source (TANPA Dockerfile) ⭐ RECOMMENDED

**Konfigurasi EasyPanel:**

1. **Source Tab:**
   - Pilih tab "Git" (BUKAN Dockerfile)
   - Repository URL: `https://github.com/tikunganbali-tech/project.git`
   - Branch: `master`
   - **Build Path:** `tokotanionline-nextjs` ⚠️ WAJIB DIISI

2. **Deploy Tab:**
   - Command: `npm start` (atau kosongkan)

3. **Environment Tab:**
   - Set semua variables (lihat `EASYPANEL-ENV-COMPLETE.txt`)

**EasyPanel akan:**
- Pull repo
- `cd tokotanionline-nextjs`
- `npm install` (langsung di VPS, lebih reliable)
- `npm run build` (otomatis)
- `npm start`

---

### OPSI 2: Perbaiki Dockerfile (Jika tetap pakai Docker)

Jika tetap ingin pakai Dockerfile, gunakan versi yang lebih robust:

```dockerfile
# Next.js Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat python3 make g++ git

# Configure npm
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files
COPY package.json ./

# Install with retry and verbose logging
RUN npm install --no-audit --no-fund --legacy-peer-deps --verbose || \
    (echo "=== Retry after cache clean ===" && \
     npm cache clean --force && \
     npm install --no-audit --no-fund --legacy-peer-deps --verbose)

# Copy Prisma and generate
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME="0.0.0.0"
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🎯 REKOMENDASI

**Gunakan OPSI 1 (Git Source tanpa Dockerfile)** karena:
- ✅ Lebih sederhana
- ✅ Lebih reliable (npm install langsung di VPS)
- ✅ Lebih cepat (tidak perlu build Docker image)
- ✅ Lebih mudah debug

---

## 📝 Langkah Deploy

1. **EasyPanel → App → Source Tab**
   - Pilih "Git" (BUKAN Dockerfile)
   - Build Path: `tokotanionline-nextjs`
   - Save

2. **Environment Tab**
   - Set semua variables
   - Save

3. **Deploy Tab**
   - Command: `npm start` (atau kosongkan)
   - Save

4. **Klik "Deploy"**
   - Monitor build logs
   - Tunggu sampai selesai

---

## 🔧 Troubleshooting

**Jika masih error:**
1. Cek Deployments tab untuk error detail
2. Pastikan Build Path benar: `tokotanionline-nextjs`
3. Pastikan semua Environment Variables sudah di-set
4. Coba restart VPS jika network issue
