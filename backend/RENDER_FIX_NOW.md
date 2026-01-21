# 🚨 IMMEDIATE FIX for Render Root Directory Error

## Error You're Seeing

```
Root directory "backend" does not exist
builder.sh: line 51: cd: /opt/render/project/src/offsite/backend: No such file or directory
```

## Quick Fix

Based on the error path `/opt/render/project/src/offsite/backend`, your repository structure is:

```
your-repo-root/
└── offsite/
    └── backend/
        └── package.json
```

### Solution

1. **Go to Render Dashboard** → Your Service → **Settings**

2. **Find "Root Directory" field** (under Build & Deploy section)

3. **Change it to:** `offsite/backend`

4. **Save Changes**

5. **Go to "Manual Deploy"** → **"Deploy latest commit"**

---

## How to Verify Your Repository Structure

1. Go to your GitHub repository: `https://github.com/hetsondagar/offsite`
2. Check the root folder structure
3. Find where `package.json` is located:
   - If it's at: `offsite/backend/package.json` → Root Directory = `offsite/backend`
   - If it's at: `backend/package.json` → Root Directory = `backend`

---

## Alternative: Check Render Build Logs

Look at the first few lines of your Render build logs. It will show:
```
==> Cloning from https://github.com/hetsondagar/offsite
==> Root directory "..." does not exist
```

The path it's trying tells you what structure Render expects.

---

## Most Likely Fix

Based on your error, set Root Directory to:

**`offsite/backend`**

This is because Render is looking for `/opt/render/project/src/offsite/backend`, which means:
- Repo root = project root (contains `offsite/`)
- Backend is at `offsite/backend/`
- So Root Directory = `offsite/backend`

---

## After Fixing

1. Save the Root Directory change
2. Trigger a new deployment
3. Watch the build logs - it should now find `package.json`
4. Build should proceed successfully

---

## Still Not Working?

If `offsite/backend` doesn't work, try:

1. Check your actual GitHub repository structure
2. Count the folders from repo root to `package.json`
3. Set Root Directory to that exact path (no leading/trailing slashes)

Example:
- Repo root has `offsite/` → Backend is at `offsite/backend/` → Use: `offsite/backend`
- Repo root IS `offsite/` → Backend is at `backend/` → Use: `backend`
