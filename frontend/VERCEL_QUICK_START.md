# Vercel Deployment - Quick Start

## Pre-Deployment

- [ ] Code is pushed to Git
- [ ] Backend is deployed on Render
- [ ] Backend URL is ready

---

## Deploy in 3 Steps

### 1. Create Vercel Project
- Go to https://vercel.com
- **Add New** → **Project**
- Select repository: `hetsondagar/offsite`
- Click **Import**

### 2. Configure
- **Root Directory:** `offsite/frontend` ⚠️
- **Framework:** Vite (auto-detected)
- **Build Command:** `npm run build` (auto)
- **Output Directory:** `dist` (auto)

### 3. Add Environment Variable
- Click **Environment Variables**
- Add: `VITE_API_URL` = `https://your-backend.onrender.com/api`
- Replace with your actual Render backend URL

### 4. Deploy
- Click **Deploy**
- Wait for build
- App is live! 🎉

---

## Your URLs

- **Frontend:** `https://your-project.vercel.app`
- **Backend:** `https://your-backend.onrender.com/api`

---

## Update API URL

If backend URL changes:
1. **Project Settings** → **Environment Variables**
2. Update `VITE_API_URL`
3. **Redeploy** latest deployment

---

## Common Issues

**Build fails?**
- Check Root Directory = `offsite/frontend`
- Verify `package.json` exists

**API calls fail?**
- Check `VITE_API_URL` is set
- Verify backend is accessible
- Check CORS on backend

**404 on refresh?**
- `vercel.json` should handle SPA routing
- Check rewrites configuration

---

**Full Guide:** `VERCEL_DEPLOYMENT_GUIDE.md`
