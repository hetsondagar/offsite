# 🚨 CRITICAL FIX - Render Build Command

## Current Error

All TypeScript errors about missing type definitions:
- `Cannot find name 'process'`
- `Could not find a declaration file for module 'express'`
- `Cannot find name 'Buffer'`
- etc.

## Root Cause

**The Build Command in Render is NOT installing devDependencies!**

TypeScript needs `@types/*` packages to compile, but they're in `devDependencies` and aren't being installed.

---

## ✅ IMMEDIATE FIX (2 Steps)

### Step 1: Update Build Command in Render

1. **Go to Render Dashboard** → Your Service → **Settings**
2. **Scroll to "Build & Deploy"** section
3. **Find "Build Command"** field
4. **DELETE the current command**
5. **Type exactly this:**
   ```
   npm install --include=dev && npm run build
   ```
6. **Click "Save Changes"**

### Step 2: Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Watch the build logs

---

## Verify Build Command

Your Build Command should be **EXACTLY**:
```
npm install --include=dev && npm run build
```

**Common Mistakes:**
- ❌ `npm install && npm run build` (missing `--include=dev`)
- ❌ `npm ci && npm run build` (might skip devDependencies)
- ❌ `npm install --production && npm run build` (definitely skips devDependencies)
- ❌ `npm install --include-dev && npm run build` (wrong flag name)

✅ **Correct:** `npm install --include=dev && npm run build`

---

## Why This Works

- `npm install` by itself may skip `devDependencies` in production environments
- `--include=dev` explicitly tells npm to install devDependencies
- All `@types/*` packages are in devDependencies
- TypeScript compilation needs these packages

---

## Expected Build Output

After fixing, you should see:
```
==> Installing dependencies
added 248 packages, and audited 249 packages
==> Building
> tsc
(no errors - compilation succeeds)
==> Build succeeded
```

---

## If Still Failing

If you still get errors after updating the build command:

1. **Check Root Directory:**
   - Should be `offsite/backend` (if repo root contains `offsite/`)
   - Or `backend` (if repo root IS `offsite/`)

2. **Verify in Build Logs:**
   - Look for "Installing dependencies"
   - Check if `@types/node` is being installed
   - Should see: `added 248 packages` (includes devDependencies)

3. **Clear Build Cache (if needed):**
   - Render Dashboard → Settings → Clear Build Cache
   - Then redeploy

---

## Alternative: Use npm ci

If `--include=dev` doesn't work, try:
```
npm ci && npm run build
```

This uses `package-lock.json` and should install all dependencies including devDependencies.

---

**UPDATE THE BUILD COMMAND NOW AND REDEPLOY!** 🚀

The fix is simple: Add `--include=dev` to your build command.
