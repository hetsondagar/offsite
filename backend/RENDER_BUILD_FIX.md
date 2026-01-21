# Render Build Fix - TypeScript Compilation Errors

## Problem

Build is failing with TypeScript errors about missing type definitions:
- `Cannot find name 'process'`
- `Could not find a declaration file for module 'express'`
- Missing `@types/*` packages

## Root Cause

Render's build process might not be installing `devDependencies` properly, or the build command needs to explicitly include them.

## Solution

### Option 1: Update Build Command in Render (Recommended)

In Render Dashboard → Your Service → Settings → Build & Deploy:

**Change Build Command from:**
```
npm install && npm run build
```

**To:**
```
npm install --include=dev && npm run build
```

This ensures devDependencies (including all `@types/*` packages) are installed.

---

### Option 2: Use npm ci (Alternative)

**Change Build Command to:**
```
npm ci && npm run build
```

This uses `package-lock.json` and installs all dependencies including devDependencies.

---

### Option 3: Move Critical Types to Dependencies (Not Recommended)

You could move `@types/node` and `typescript` to `dependencies`, but this is not ideal as it increases production bundle size.

---

## Quick Fix Steps

1. **Go to Render Dashboard** → Your Service → **Settings**

2. **Find "Build Command"** (under Build & Deploy section)

3. **Update to:**
   ```
   npm install --include=dev && npm run build
   ```

4. **Save Changes**

5. **Go to "Manual Deploy"** → **"Deploy latest commit"**

---

## Verify Fix

After updating, the build logs should show:
```
==> Installing dependencies
==> Building
> tsc
(no errors)
==> Build succeeded
```

Instead of TypeScript compilation errors.

---

## Why This Happens

- `npm install` in production mode (NODE_ENV=production) may skip devDependencies
- TypeScript and `@types/*` packages are in devDependencies
- Build needs these packages to compile TypeScript
- Solution: Explicitly include devDependencies during build

---

## Additional Notes

- The `--include=dev` flag ensures devDependencies are installed
- This only affects the build process, not the runtime
- Production runtime doesn't need TypeScript or type definitions
- Only the compiled JavaScript (`dist/`) is used at runtime

---

**After applying this fix, your build should succeed! 🎉**
