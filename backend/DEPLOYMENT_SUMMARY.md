# Backend Deployment to Render - Summary

## 📋 What You Need

1. **MongoDB Atlas** - Database (already set up)
2. **Render.com Account** - Free tier available
3. **Git Repository** - Code pushed to GitHub/GitLab/Bitbucket
4. **Environment Variables** - All secrets ready

---

## 🚀 Quick Deployment Steps

### 1. Prepare Code
```bash
cd offsite/backend
npm run build  # Test build works
git add .
git commit -m "Ready for Render deployment"
git push
```

### 2. Create Render Service
1. Go to https://dashboard.render.com
2. **New +** → **Web Service**
3. Connect Git repository
4. Configure:
   - **Root Directory:** `offsite/backend` ⚠️ CRITICAL
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### 3. Add Environment Variables
In Render Dashboard → Environment tab, add:

**Required:**
- `NODE_ENV=production`
- `MONGODB_URI=your_atlas_connection_string`
- `JWT_ACCESS_SECRET=random_string`
- `JWT_REFRESH_SECRET=random_string`
- `OTP_SECRET=random_string`
- `CLOUDINARY_URL=your_cloudinary_url`
- `CORS_ORIGIN=your_frontend_url`

**Optional:**
- `GMAIL_USER`, `GMAIL_PASS`
- `MAPTILER_API_KEY`
- AI keys (if using AI features)

### 4. Configure MongoDB Atlas
1. Atlas → **Network Access**
2. Add IP: `0.0.0.0/0` (or specific Render IPs)
3. Verify database user has permissions

### 5. Deploy
- Click **"Manual Deploy"** → **"Deploy latest commit"**
- Watch logs for success
- Service URL: `https://your-service.onrender.com`

### 6. Test
```bash
curl https://your-service.onrender.com/health
# Should return: {"success":true,"message":"OffSite API is running"}
```

### 7. Seed Materials (One-time)
Render Dashboard → Shell → Run:
```bash
npm run seed:materials
```

### 8. Update Frontend
Update frontend `.env`:
```env
VITE_API_URL=https://your-service.onrender.com/api
```

---

## 📝 Important Notes

### Root Directory
⚠️ **CRITICAL:** Set Root Directory to `offsite/backend` in Render settings!
- Without this, Render won't find `package.json`

### Port
- Render automatically sets `PORT` environment variable
- Your code uses `env.PORT` which will work automatically
- No need to hardcode port

### Free Tier Limitations
- Services sleep after 15 min inactivity
- First request after sleep takes ~30 seconds
- 512 MB RAM limit
- Consider upgrading for production

### Environment Variables
- Never commit `.env` files
- Use Render's Environment tab for secrets
- Generate strong secrets for JWT/OTP

---

## 🔗 Your URLs

After deployment:
- **API Base:** `https://your-service.onrender.com/api`
- **Health Check:** `https://your-service.onrender.com/health`
- **API Health:** `https://your-service.onrender.com/api/health`

---

## 📚 Documentation

- **Full Guide:** `RENDER_DEPLOYMENT_GUIDE.md`
- **Quick Start:** `RENDER_QUICK_START.md`
- **Environment Template:** `.env.example`

---

## ✅ Post-Deployment Checklist

- [ ] Service is live and accessible
- [ ] Health check returns success
- [ ] MongoDB connection working
- [ ] Material catalog seeded
- [ ] Frontend updated with new API URL
- [ ] CORS configured correctly
- [ ] All environment variables set
- [ ] Test login/authentication
- [ ] Test material requests

---

## 🆘 Troubleshooting

**Service won't start?**
- Check logs in Render dashboard
- Verify all required env vars are set
- Check MongoDB connection string

**Build fails?**
- Verify Root Directory is `offsite/backend`
- Check `package.json` has build script
- Review build logs for specific errors

**Database connection fails?**
- Check MongoDB Atlas Network Access
- Verify connection string format
- Ensure database user has permissions

**CORS errors?**
- Update `CORS_ORIGIN` in Render env vars
- Restart service after updating
- Verify frontend URL matches exactly

---

## 🎉 Success!

Once deployed, your backend will be:
- ✅ Live on Render
- ✅ Connected to MongoDB Atlas
- ✅ Accessible via HTTPS
- ✅ Auto-deploying on git push (if enabled)

**Next Steps:**
1. Test all API endpoints
2. Monitor logs for errors
3. Set up custom domain (optional)
4. Consider upgrading from free tier for production

---

**Need help?** Check the full deployment guide: `RENDER_DEPLOYMENT_GUIDE.md`
