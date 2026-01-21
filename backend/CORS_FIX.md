# CORS Configuration Fix

## Problem

The backend CORS configuration was blocking requests from the Vercel frontend due to:
1. Placeholder value `'your_frontend_url'` in environment variable
2. Trailing slash mismatch (origin has no slash, but CORS header had slash)
3. Single origin support (not flexible for multiple environments)

## Solution

Updated CORS configuration to:
1. ✅ Support multiple origins (comma-separated)
2. ✅ Normalize URLs (remove trailing slashes)
3. ✅ Support Capacitor mobile app origins
4. ✅ Allow requests with no origin (mobile apps, Postman)
5. ✅ Better error logging for debugging

## How to Fix in Render

### Step 1: Update Environment Variable

In your Render dashboard:
1. Go to your backend service
2. Navigate to **Environment** tab
3. Find or add `CORS_ORIGIN`
4. Set the value to your Vercel frontend URL **without trailing slash**:

```
https://offsite-be-off-the-site.vercel.app
```

### Step 2: Multiple Origins (Optional)

If you need to support multiple origins, use comma-separated list:

```
https://offsite-be-off-the-site.vercel.app,https://another-domain.com
```

### Step 3: Redeploy

After updating the environment variable:
1. Click **Manual Deploy** → **Deploy latest commit**
2. Wait for deployment to complete
3. Test the frontend again

## Supported Origins (Automatic)

The backend automatically allows:
- ✅ Origins specified in `CORS_ORIGIN` environment variable
- ✅ `capacitor://localhost` (for Capacitor mobile apps)
- ✅ `http://localhost` (for Capacitor development)
- ✅ `http://localhost:8080`, `http://localhost:5173`, `http://localhost:3000` (development only)

## Verification

After fixing, you should see:
- ✅ No CORS errors in browser console
- ✅ Health check endpoint works: `https://offsite-backend.onrender.com/health`
- ✅ Login works: `https://offsite-backend.onrender.com/api/auth/login`
- ✅ All API calls succeed

## Common Issues

### Issue: Still getting CORS errors

**Check:**
1. Environment variable has no trailing slash
2. Environment variable matches exact frontend URL
3. Backend has been redeployed after environment variable change

**Solution:**
- Remove trailing slash from `CORS_ORIGIN`
- Verify exact URL matches (case-sensitive for scheme)
- Redeploy backend

### Issue: Multiple frontends

**Solution:**
Use comma-separated list:
```
https://frontend1.vercel.app,https://frontend2.vercel.app
```

### Issue: Mobile app CORS errors

**Solution:**
The backend automatically allows `capacitor://localhost`. If using custom scheme, add it to `CORS_ORIGIN`.

---

**After updating the environment variable in Render, redeploy the backend and the CORS errors should be resolved!**
