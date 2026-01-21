# Render Deployment - Quick Start Checklist

## Pre-Deployment Checklist

- [ ] Code is pushed to Git repository
- [ ] MongoDB Atlas cluster is set up
- [ ] MongoDB Atlas IP whitelist configured
- [ ] All environment variables ready
- [ ] Render account created

---

## Step-by-Step Deployment

### 1. Create Render Web Service
- Go to https://dashboard.render.com
- Click **"New +"** → **"Web Service"**
- Connect your Git repository
- Configure:
  - **Name:** `offsite-backend`
  - **Root Directory:** `offsite/backend` ⚠️
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`

### 2. Add Environment Variables

Copy these to Render Environment tab:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_ACCESS_SECRET=generate_random_string
JWT_REFRESH_SECRET=generate_random_string
OTP_SECRET=generate_random_string
CLOUDINARY_URL=your_cloudinary_url
CORS_ORIGIN=your_frontend_url
GMAIL_USER=your_email
GMAIL_PASS=your_app_password
MAPTILER_API_KEY=your_key
```

### 3. Deploy
- Click **"Manual Deploy"** → **"Deploy latest commit"**
- Watch logs for errors
- Wait for "Your service is live" message

### 4. Test
- Visit: `https://your-service.onrender.com/health`
- Should return: `{"success":true,"message":"OffSite API is running"}`

### 5. Seed Materials (One-time)
- Render Dashboard → Your Service → **"Shell"** tab
- Run: `npm run seed:materials`

### 6. Update Frontend
- Update frontend `.env`:
  ```env
  VITE_API_URL=https://your-service.onrender.com/api
  ```

---

## Common Issues

**Build fails?**
- Check Root Directory is `offsite/backend`
- Verify `package.json` has build script

**Service crashes?**
- Check all environment variables are set
- Verify MongoDB connection string
- Check logs in Render dashboard

**Database connection fails?**
- MongoDB Atlas → Network Access → Add `0.0.0.0/0` (temporarily)
- Verify connection string format

**CORS errors?**
- Update `CORS_ORIGIN` in Render environment variables
- Restart service after updating

---

## Your Service URL

After deployment, your API will be available at:
```
https://your-service-name.onrender.com/api
```

Health check:
```
https://your-service-name.onrender.com/health
```

---

## Need Help?

See full guide: `RENDER_DEPLOYMENT_GUIDE.md`
