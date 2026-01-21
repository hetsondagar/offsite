# Backend Deployment Guide - Render.com

This guide will help you deploy the OffSite backend to Render while keeping MongoDB Atlas as your database.

## Prerequisites

1. ✅ MongoDB Atlas account with database cluster
2. ✅ Render.com account (sign up at https://render.com)
3. ✅ Git repository (GitHub/GitLab/Bitbucket) with your code
4. ✅ All environment variables ready

---

## Step 1: Prepare Your Code

### 1.1 Ensure Production Build Works

Test the build locally:

```bash
cd offsite/backend
npm install
npm run build
npm start
```

Verify the build completes without errors.

### 1.2 Create `.env.example` (Optional but Recommended)

Create a `.env.example` file in `offsite/backend/` with all required variables (without actual values):

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_ACCESS_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
OTP_SECRET=your_otp_secret
CLOUDINARY_URL=your_cloudinary_url
CORS_ORIGIN=https://your-frontend-domain.com
HUGGINGFACE_API_KEY=your_huggingface_key
# ... other variables
```

---

## Step 2: Push Code to Git Repository

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Ensure your repository is accessible** (public or Render has access)

---

## Step 3: Create Render Web Service

### 3.1 Sign In to Render

1. Go to https://dashboard.render.com
2. Sign in or create an account

### 3.2 Create New Web Service

1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your Git repository:
   - If first time: Click **"Connect account"** and authorize Render
   - Select your repository
   - Click **"Connect"**

### 3.3 Configure Service Settings

Fill in the following:

**Basic Settings:**
- **Name:** `offsite-backend` (or your preferred name)
- **Region:** Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch:** `main` (or your main branch)
- **Root Directory:** `offsite/backend` ⚠️ **IMPORTANT: Set this!**
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Instance Type:** 
  - **Free tier:** `Free` (512 MB RAM)
  - **Production:** `Starter` ($7/month) or higher

**Advanced Settings (Optional):**
- **Health Check Path:** `/api/health` (if you have a health endpoint)
- **Auto-Deploy:** `Yes` (deploys on every push)

---

## Step 4: Configure Environment Variables

### 4.1 Add Environment Variables in Render

In the Render dashboard, go to your service → **"Environment"** tab:

**Required Variables:**

```env
NODE_ENV=production
PORT=10000
```

**MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

**JWT Secrets (Generate strong random strings):**
```env
JWT_ACCESS_SECRET=your-very-long-random-secret-key-here
JWT_REFRESH_SECRET=your-very-long-random-refresh-secret-key-here
```

**OTP Secret:**
```env
OTP_SECRET=your-otp-secret-key-here
```

**Cloudinary:**
```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**CORS (Update with your frontend URL):**
```env
CORS_ORIGIN=https://your-frontend-domain.com
```

**AI/LLM (Optional):**
```env
HUGGINGFACE_API_KEY=your_key
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key
LLM_PROVIDER=openai
```

**Email (Gmail SMTP):**
```env
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

**MapTiler:**
```env
MAPTILER_API_KEY=your_maptiler_key
```

**Rate Limiting (Optional):**
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4.2 Generate Secure Secrets

For JWT and OTP secrets, use strong random strings:

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Or use an online generator: https://randomkeygen.com/

---

## Step 5: Configure MongoDB Atlas

### 5.1 Allow Render IP Address

1. Go to MongoDB Atlas → **Network Access**
2. Click **"Add IP Address"**
3. For Render, you have two options:

   **Option A: Allow All IPs (Easier for development)**
   - Click **"Allow Access from Anywhere"**
   - IP Address: `0.0.0.0/0`
   - ⚠️ **Warning:** Less secure, but easier for dynamic IPs

   **Option B: Use Render Static Outbound IP (Recommended for Production)**
   - Render provides static outbound IPs
   - Check Render docs for current IP ranges
   - Add those specific IPs

### 5.2 Verify Database User

1. Go to **Database Access**
2. Ensure you have a database user with read/write permissions
3. Note the username and password for `MONGODB_URI`

### 5.3 Get Connection String

1. Go to **Database** → **Connect**
2. Choose **"Connect your application"**
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with your database name (e.g., `offsite`)

**Example:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/offsite?retryWrites=true&w=majority
```

---

## Step 6: Deploy

### 6.1 Manual Deploy

1. In Render dashboard, click **"Manual Deploy"**
2. Select branch: `main`
3. Click **"Deploy"**

### 6.2 Monitor Deployment

1. Watch the **"Logs"** tab for build progress
2. Check for any errors
3. Build should show:
   ```
   ✓ npm install
   ✓ npm run build
   ✓ npm start
   ```

### 6.3 Verify Deployment

1. Once deployed, you'll get a URL like: `https://offsite-backend.onrender.com`
2. Test the API:
   ```bash
   curl https://offsite-backend.onrender.com/api/health
   ```
   Or visit in browser: `https://offsite-backend.onrender.com/api`

---

## Step 7: Post-Deployment

### 7.1 Seed Material Catalog (One-time)

After first deployment, run the seed script:

**Option A: Using Render Shell (Recommended)**
1. In Render dashboard → Your service → **"Shell"** tab
2. Run:
   ```bash
   npm run seed:materials
   ```

**Option B: Using Local Machine**
1. Temporarily update `MONGODB_URI` in your local `.env`
2. Run:
   ```bash
   npm run seed:materials
   ```

### 7.2 Update Frontend API URL

Update your frontend `.env` or environment variables:

```env
VITE_API_URL=https://offsite-backend.onrender.com/api
```

### 7.3 Test API Endpoints

Test critical endpoints:
- `GET /api/auth/verify` - Health check
- `POST /api/auth/login` - Authentication
- `GET /api/materials/catalog` - Materials catalog

---

## Step 8: Configure Custom Domain (Optional)

1. In Render dashboard → Your service → **"Settings"**
2. Scroll to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `api.yourdomain.com`)
5. Follow DNS configuration instructions
6. Update `CORS_ORIGIN` environment variable

---

## Troubleshooting

### Issue: Build Fails

**Check:**
- Root directory is set to `offsite/backend`
- Build command: `npm install && npm run build`
- Node version compatibility (Render uses Node 18+ by default)

**Solution:**
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation works locally

### Issue: Service Crashes on Start

**Check:**
- All required environment variables are set
- `MONGODB_URI` is correct and accessible
- Port is set correctly (Render uses `PORT` env var automatically)

**Solution:**
- Check logs in Render dashboard
- Verify MongoDB Atlas network access
- Ensure JWT secrets are set

### Issue: Database Connection Fails

**Check:**
- MongoDB Atlas IP whitelist includes Render IPs
- Database user has correct permissions
- Connection string format is correct

**Solution:**
- Temporarily allow `0.0.0.0/0` for testing
- Verify connection string in MongoDB Atlas
- Check database user credentials

### Issue: CORS Errors

**Check:**
- `CORS_ORIGIN` environment variable matches frontend URL
- Frontend is using correct API URL

**Solution:**
- Update `CORS_ORIGIN` in Render environment variables
- Restart service after updating env vars

---

## Render Free Tier Limitations

⚠️ **Important Notes:**

1. **Sleep Mode:** Free tier services sleep after 15 minutes of inactivity
   - First request after sleep takes ~30 seconds to wake up
   - Consider upgrading to paid tier for production

2. **Resource Limits:**
   - 512 MB RAM
   - 0.1 CPU
   - May be slow under heavy load

3. **Recommendations:**
   - Use free tier for development/testing
   - Upgrade to **Starter ($7/month)** for production
   - Consider **Standard ($25/month)** for better performance

---

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `NODE_ENV=production`
- [ ] `PORT=10000` (Render sets this automatically, but good to have)
- [ ] `MONGODB_URI` (MongoDB Atlas connection string)
- [ ] `JWT_ACCESS_SECRET` (strong random string)
- [ ] `JWT_REFRESH_SECRET` (strong random string)
- [ ] `OTP_SECRET` (strong random string)
- [ ] `CLOUDINARY_URL` (or individual Cloudinary vars)
- [ ] `CORS_ORIGIN` (your frontend URL)
- [ ] `GMAIL_USER` (if using email)
- [ ] `GMAIL_PASS` (Gmail app password)
- [ ] `MAPTILER_API_KEY` (if using maps)
- [ ] AI keys (if using AI features)

---

## Quick Reference

**Render Service URL Format:**
```
https://your-service-name.onrender.com
```

**API Base URL:**
```
https://your-service-name.onrender.com/api
```

**Health Check:**
```
https://your-service-name.onrender.com/api/health
```

**Update Environment Variables:**
- Render Dashboard → Your Service → Environment → Add/Edit

**View Logs:**
- Render Dashboard → Your Service → Logs

**Restart Service:**
- Render Dashboard → Your Service → Manual Deploy → Deploy latest commit

---

## Support

If you encounter issues:
1. Check Render logs first
2. Verify all environment variables
3. Test MongoDB connection separately
4. Check Render status page: https://status.render.com

---

**Deployment Complete! 🎉**

Your backend is now live on Render and connected to MongoDB Atlas.
