# Troubleshooting Guide

## Signup 500 Error

If you're getting 500 errors during signup, check the following:

### 1. Check MongoDB Connection

Make sure MongoDB is running:
```bash
# Windows - Check Services
# Search for "MongoDB" in Services

# Or test connection
mongosh
```

### 2. Check Environment Variables

Create a `.env` file in the `backend` directory:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/offsite
JWT_ACCESS_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
CORS_ORIGIN=http://localhost:8080
```

### 3. Check Backend Logs

Look at the terminal where the backend is running. You should see:
- MongoDB connection message
- Server startup message
- Detailed error logs

### 4. Common Issues

**Issue: MongoDB not running**
- Solution: Start MongoDB service

**Issue: Database connection string wrong**
- Solution: Check `MONGODB_URI` in `.env`

**Issue: Port already in use**
- Solution: Change `PORT` in `.env` or stop other services on port 3000

**Issue: Missing dependencies**
- Solution: Run `npm install` in the backend directory

### 5. Test Backend Health

```bash
# Test if backend is running
curl http://localhost:3000/health

# Should return:
# {"success":true,"message":"OffSite API is running","timestamp":"..."}
```

### 6. Check Backend Terminal

When you try to signup, check the backend terminal for detailed error messages. The error handler now logs:
- Error message
- Request path and method
- Request body
- Full stack trace

This will help identify the exact issue.

