# Frontend Deployment Guide - Vercel

This guide will help you deploy the OffSite frontend to Vercel.

## Prerequisites

1. ✅ Backend deployed on Render (or another hosting service)
2. ✅ Vercel account (sign up at https://vercel.com)
3. ✅ Git repository (GitHub/GitLab/Bitbucket) with your code
4. ✅ Backend API URL ready

---

## Step 1: Prepare Your Code

### 1.1 Test Production Build

Test the build locally:

```bash
cd offsite/frontend
npm install
npm run build
npm run preview
```

Verify the build completes without errors and the preview works.

### 1.2 Commit and Push

```bash
git add .
git commit -m "Frontend ready for Vercel deployment"
git push
```

---

## Step 2: Create Vercel Project

### 2.1 Sign In to Vercel

1. Go to https://vercel.com
2. Sign in or create an account
3. Connect your Git provider (GitHub/GitLab/Bitbucket)

### 2.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Select your repository: `hetsondagar/offsite`
3. Click **"Import"**

### 2.3 Configure Project

**Framework Preset:**
- Vercel should auto-detect **Vite**

**Root Directory:**
- Set to: `offsite/frontend` ⚠️ **CRITICAL**

**Build and Output Settings:**
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `dist` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

**Environment Variables:**
- Click **"Environment Variables"**
- Add the following:

```env
VITE_API_URL=https://your-backend.onrender.com/api
```

Replace `your-backend.onrender.com` with your actual Render backend URL.

**Optional:**
```env
VITE_MAPTILER_KEY=your_maptiler_key
```

---

## Step 3: Deploy

### 3.1 Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Your app will be live at: `https://your-project.vercel.app`

### 3.2 Verify Deployment

1. Visit your Vercel URL
2. Test the app:
   - Login should work
   - API calls should connect to your Render backend
   - All features should function

---

## Step 4: Configure Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `VITE_API_URL` if needed

---

## Step 5: Update Environment Variables

### 5.1 Add/Update Variables

1. Go to **Project Settings** → **Environment Variables**
2. Add or update:
   - `VITE_API_URL` - Your Render backend URL
   - `VITE_MAPTILER_KEY` - (Optional) MapTiler API key

### 5.2 Redeploy After Changes

After updating environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Or push a new commit to trigger auto-deploy

---

## Environment Variables Reference

### Required

- **`VITE_API_URL`**
  - Format: `https://your-backend.onrender.com/api`
  - Example: `https://offsite-backend.onrender.com/api`
  - ⚠️ **Must include `/api` suffix**

### Optional

- **`VITE_MAPTILER_KEY`**
  - Your MapTiler API key for location services
  - Only needed if using map features

---

## Vercel Configuration

The project includes `vercel.json` with:
- ✅ SPA routing (all routes → `index.html`)
- ✅ Cache headers for static assets
- ✅ Build configuration

---

## Troubleshooting

### Issue: Build Fails

**Check:**
- Root Directory is set to `offsite/frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

**Solution:**
- Verify Root Directory in Vercel settings
- Check build logs for specific errors
- Ensure `package.json` has build script

### Issue: API Calls Fail

**Check:**
- `VITE_API_URL` is set correctly
- Backend is accessible from internet
- CORS is configured on backend

**Solution:**
- Verify `VITE_API_URL` in Vercel environment variables
- Test backend URL directly in browser
- Check backend CORS settings include your Vercel domain

### Issue: 404 on Page Refresh

**Check:**
- `vercel.json` exists with rewrites configuration

**Solution:**
- Ensure `vercel.json` is in `offsite/frontend/` directory
- Verify rewrites are configured correctly

### Issue: Assets Not Loading

**Check:**
- Build output in `dist/` directory
- Asset paths are correct

**Solution:**
- Verify build completes successfully
- Check browser console for 404 errors
- Ensure `vite.config.ts` is correct

---

## Auto-Deployment

Vercel automatically deploys on:
- ✅ Every push to `main` branch (production)
- ✅ Pull requests (preview deployments)

### Branch Configuration

- **Production:** `main` branch → Production URL
- **Preview:** Other branches → Preview URLs
- **Development:** Can configure specific branch

---

## Performance Optimization

Vercel automatically:
- ✅ CDN distribution
- ✅ Edge caching
- ✅ Automatic HTTPS
- ✅ Compression

Your `vite.config.ts` already includes:
- ✅ Code splitting
- ✅ Chunk optimization
- ✅ Tree shaking

---

## Monitoring

### View Logs

1. Go to **Deployments** tab
2. Click on a deployment
3. View **"Build Logs"** and **"Function Logs"**

### Analytics

- Enable Vercel Analytics in project settings
- View performance metrics
- Monitor errors

---

## Quick Reference

**Vercel Dashboard:**
- https://vercel.com/dashboard

**Your Project URL:**
- `https://your-project.vercel.app`

**Environment Variables:**
- Project Settings → Environment Variables

**Redeploy:**
- Deployments → Latest → Redeploy

---

## Post-Deployment Checklist

- [ ] App loads successfully
- [ ] Login works
- [ ] API calls connect to backend
- [ ] All pages are accessible
- [ ] No console errors
- [ ] PWA features work (if applicable)
- [ ] Offline functionality works
- [ ] Language switching works
- [ ] Theme switching works

---

## Support

If you encounter issues:
1. Check Vercel build logs
2. Verify environment variables
3. Test backend API separately
4. Check browser console for errors
5. Review Vercel documentation: https://vercel.com/docs

---

**Deployment Complete! 🎉**

Your frontend is now live on Vercel and connected to your Render backend.
