# CLEANUP CONSOLE.LOG STRATEGY

**Status:** IN PROGRESS  
**Total Instances:** 565 matches across 228 files

## STRATEGY

### Kategori Console Statements

1. **KEEP (Intentional Error Logging):**
   - `console.error` di error handlers
   - `console.error` di catch blocks (untuk debugging production issues)
   - Logging yang sudah wrapped dengan proper logger

2. **REMOVE (Debug Logging):**
   - `console.log` di client components (development debugging)
   - `console.log` di API routes (temporary debugging)
   - `console.debug` statements

3. **REPLACE (Production Logging):**
   - `console.log` → proper logger (`lib/logger.ts`, `lib/structured-logger.ts`)
   - Wrap dengan `NODE_ENV` check jika perlu

## PRIORITY CLEANUP

### Phase 1: Client Components (High Priority)
- `components/admin/*.tsx` - Remove console.log dari client components
- `app/admin/**/page.tsx` - Remove console.log dari pages

### Phase 2: API Routes (Medium Priority)
- `app/api/**/route.ts` - Replace console.log dengan proper logger

### Phase 3: Scripts (Low Priority)
- `scripts/*.ts` - Keep (scripts are for development)

## IMPLEMENTATION

### Option 1: Manual Cleanup (Recommended)
- Review each file
- Remove obvious debug logs
- Keep error logging

### Option 2: Automated Script
- Create script to remove console.log
- Keep console.error
- Review changes before commit

## NOTES

- **Error logging is OK** - console.error untuk debugging production issues is acceptable
- **Development logging** - console.log di development mode is OK if wrapped with NODE_ENV check
- **Production safety** - console.log tidak akan break production, tapi tidak professional

## DECISION

Untuk finalization sequence, kita akan:
1. ✅ Document strategy (this file)
2. ⏳ Cleanup critical files (client components, public pages)
3. ⏳ Leave API error logging (acceptable for production debugging)

**Keputusan:** Console.log cleanup bukan blocking untuk production, tapi perlu dilakukan untuk professionalism.
