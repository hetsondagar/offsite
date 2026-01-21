# 🚨 CRITICAL: Render Build Command Fix

## Current Error

```
error TS2688: Cannot find type definition file for 'node'.
```

## Immediate Fix Required

### Step 1: Update Build Command in Render

1. Go to **Render Dashboard** → Your Service → **Settings**
2. Scroll to **"Build & Deploy"** section
3. Find **"Build Command"** field
4. **Change it to:**
   ```
   npm install --include=dev && npm run build
   ```
5. **Click "Save Changes"**
6. Go to **"Manual Deploy"** → **"Deploy latest commit"**

---

## Why This Fixes It

The error occurs because:
- `@types/node` is in `devDependencies`
- Render's default `npm install` may skip devDependencies
- TypeScript needs `@types/node` to compile
- `--include=dev` ensures devDependencies are installed

---

## Verify Build Command

Your Build Command should be **exactly**:
```
npm install --include=dev && npm run build
```

**NOT:**
- ❌ `npm install && npm run build` (missing `--include=dev`)
- ❌ `npm ci && npm run build` (might skip devDependencies)
- ❌ `npm install --production && npm run build` (definitely skips devDependencies)

---

## After Fixing

The build should show:
```
==> Installing dependencies
==> Building
> tsc
(no TypeScript errors)
==> Build succeeded
```

---

## If Still Failing

If you still get errors after updating the build command:

1. **Check Root Directory:**
   - Should be `offsite/backend` (if repo root contains `offsite/`)
   - Or `backend` (if repo root IS `offsite/`)

2. **Verify package.json exists:**
   - Render should find `package.json` in the Root Directory
   - Check build logs for "Installing dependencies"

3. **Check Node version:**
   - Render uses Node 22.22.0 by default
   - Should be compatible with your code

---

**Update the Build Command now and redeploy!** 🚀
