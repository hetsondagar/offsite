# Production Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Quality
- [ ] All TypeScript compiles without errors (`npm run build`)
- [ ] No hardcoded secrets in code
- [ ] All environment variables use `process.env`
- [ ] Error handling is production-ready
- [ ] Logging is configured properly

### ✅ Configuration
- [ ] `package.json` has correct build and start scripts
- [ ] `tsconfig.json` is properly configured
- [ ] `.gitignore` excludes `.env` files
- [ ] No localhost URLs hardcoded

### ✅ Environment Variables
All required variables must be set in Render:

**Critical (Will fail if missing):**
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` (MongoDB Atlas connection string)
- [ ] `JWT_ACCESS_SECRET` (strong random string)
- [ ] `JWT_REFRESH_SECRET` (strong random string)
- [ ] `OTP_SECRET` (strong random string)

**Important (App may not work correctly):**
- [ ] `CLOUDINARY_URL` (or individual Cloudinary vars)
- [ ] `CORS_ORIGIN` (your frontend URL)
- [ ] `GMAIL_USER` (if using email)
- [ ] `GMAIL_PASS` (Gmail app password)

**Optional:**
- [ ] `HUGGINGFACE_API_KEY` (if using AI)
- [ ] `OPENAI_API_KEY` (if using OpenAI)
- [ ] `MAPTILER_API_KEY` (if using maps)

### ✅ Database
- [ ] MongoDB Atlas cluster is running
- [ ] Network Access allows Render IPs (or `0.0.0.0/0` for testing)
- [ ] Database user has read/write permissions
- [ ] Connection string is correct format

### ✅ Security
- [ ] All secrets are in Render environment variables (not in code)
- [ ] JWT secrets are strong random strings
- [ ] OTP secret is strong random string
- [ ] CORS is configured for your frontend domain only
- [ ] Rate limiting is enabled

### ✅ Build & Start
- [ ] `npm run build` completes successfully
- [ ] `npm start` runs without errors
- [ ] Server listens on `0.0.0.0` (not just localhost)
- [ ] Port is read from `process.env.PORT`

### ✅ Health Checks
- [ ] `/health` endpoint returns success
- [ ] `/api/health` endpoint returns success with DB status

### ✅ Render Configuration
- [ ] Root Directory: `offsite/backend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Node Version: 18+ (Render default)

---

## Post-Deployment Verification

### ✅ Service Status
- [ ] Service is "Live" in Render dashboard
- [ ] Health check returns success
- [ ] No errors in Render logs

### ✅ Database Connection
- [ ] MongoDB connection successful
- [ ] Can query database
- [ ] Material catalog can be seeded

### ✅ API Endpoints
- [ ] `GET /health` works
- [ ] `GET /api/health` works
- [ ] `POST /api/auth/login` works
- [ ] `GET /api/materials/catalog` works

### ✅ Frontend Integration
- [ ] Frontend can connect to API
- [ ] CORS is working
- [ ] Authentication works
- [ ] API requests succeed

### ✅ One-Time Setup
- [ ] Material catalog is seeded (`npm run seed:materials`)
- [ ] Initial admin user exists (if needed)

---

## Common Issues & Solutions

### Build Fails
**Check:**
- Root Directory is `offsite/backend`
- All dependencies in `package.json`
- TypeScript compiles locally

**Fix:**
- Verify Root Directory in Render settings
- Check build logs for specific errors
- Ensure `tsconfig.json` is correct

### Service Crashes
**Check:**
- All required env vars are set
- MongoDB connection string is correct
- JWT secrets are set

**Fix:**
- Check Render logs for error messages
- Verify environment variables
- Test MongoDB connection separately

### Database Connection Fails
**Check:**
- MongoDB Atlas Network Access
- Connection string format
- Database user permissions

**Fix:**
- Add `0.0.0.0/0` to Network Access (temporarily)
- Verify connection string in Atlas
- Check database user credentials

### CORS Errors
**Check:**
- `CORS_ORIGIN` matches frontend URL exactly
- Frontend uses correct API URL

**Fix:**
- Update `CORS_ORIGIN` in Render
- Restart service after updating
- Verify frontend `.env` has correct API URL

---

## Security Reminders

⚠️ **Never commit:**
- `.env` files
- Secrets in code
- API keys
- Database passwords

✅ **Always use:**
- Environment variables for secrets
- Strong random strings for JWT/OTP
- HTTPS in production
- Proper CORS configuration

---

## Performance Tips

1. **Free Tier Limitations:**
   - Services sleep after 15 min inactivity
   - First request after sleep is slow (~30s)
   - Consider upgrading for production

2. **Optimization:**
   - Enable compression (already enabled)
   - Use connection pooling (Mongoose default)
   - Monitor logs for slow queries

3. **Monitoring:**
   - Check Render logs regularly
   - Monitor MongoDB Atlas metrics
   - Set up alerts for errors

---

## Rollback Plan

If deployment fails:

1. Check Render logs for errors
2. Verify all environment variables
3. Test MongoDB connection
4. Revert to previous commit if needed
5. Fix issues and redeploy

---

**Ready for Production! 🚀**

Once all items are checked, your backend is ready for Render deployment.
