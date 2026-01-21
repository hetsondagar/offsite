# Render Root Directory Fix

## Problem

You're seeing this error:
```
Root directory "backend" does not exist
builder.sh: line 51: cd: /opt/render/project/src/offsite/backend: No such file or directory
```

## Solution

The Root Directory in Render settings depends on your repository structure.

### Check Your Repository Structure

**Option 1: Repository root is `offsite/` folder**
```
your-repo/
└── offsite/
    ├── backend/
    │   ├── package.json
    │   └── src/
    └── frontend/
```

**In this case, set Root Directory to:** `backend`

---

**Option 2: Repository root is project root (contains `offsite/`)**
```
your-repo/
└── offsite/
    ├── backend/
    │   ├── package.json
    │   └── src/
    └── frontend/
```

**In this case, set Root Directory to:** `offsite/backend`

---

## How to Fix in Render

1. Go to your Render service dashboard
2. Click **"Settings"** tab
3. Scroll to **"Build & Deploy"** section
4. Find **"Root Directory"** field
5. Update it based on your repository structure:
   - If repo root = `offsite/` → Use: `backend`
   - If repo root = project root → Use: `offsite/backend`
6. Click **"Save Changes"**
7. Go to **"Manual Deploy"** → **"Deploy latest commit"**

## Verify Root Directory

After setting the Root Directory, Render should be able to:
- Find `package.json` in the root directory
- Run `npm install` successfully
- Run `npm run build` successfully
- Run `npm start` successfully

## Quick Test

To verify your Root Directory is correct, check the build logs. You should see:
```
==> Installing dependencies
==> Building
==> Starting service
```

If you see errors about missing `package.json`, the Root Directory is wrong.

## Common Mistakes

❌ **Wrong:** Root Directory = `backend` when repo root is project root
❌ **Wrong:** Root Directory = `offsite/backend` when repo root is `offsite/`
❌ **Wrong:** Root Directory = `/offsite/backend` (don't use leading slash)
❌ **Wrong:** Root Directory = `offsite/backend/` (don't use trailing slash)

✅ **Correct:** Match the Root Directory to your actual repository structure

---

## Still Having Issues?

1. Check your repository structure on GitHub/GitLab
2. Verify where `package.json` is located relative to repo root
3. Set Root Directory to the folder containing `package.json` (relative to repo root)
4. Save and redeploy
