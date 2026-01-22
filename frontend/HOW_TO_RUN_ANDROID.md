# How to Run the OffSite Android App

## Prerequisites Checklist

Before running the app, make sure you have:

- [ ] **Node.js** installed (v18 or higher)
- [ ] **Android Studio** installed (latest version)
- [ ] **Java JDK 17+** installed
- [ ] **Android SDK** installed (via Android Studio)
- [ ] **Android device** connected OR **Android emulator** set up

---

## Step-by-Step Instructions

### Step 1: Install Dependencies (First Time Only)

```bash
cd offsite/frontend
npm install
```

### Step 2: Build the Web App

```bash
npm run build
```

This creates the `dist/` folder with your production build.

**Expected output:**
```
✓ built in XX.XXs
```

### Step 3: Sync with Android

```bash
npm run cap:sync
```

This copies the web build to the Android project and updates plugins.

**Expected output:**
```
√ Copying web assets...
√ Sync finished in X.XXXs
```

### Step 4: Open in Android Studio

**Option A: Using npm script (Recommended)**
```bash
npm run cap:open:android
```

**Option B: Manual**
1. Open **Android Studio**
2. Click **File** → **Open**
3. Navigate to: `offsite/frontend/android/`
4. Click **OK**

### Step 5: Wait for Gradle Sync

Android Studio will automatically:
- Download Gradle (first time only)
- Sync project files
- Index files

**Wait for:** "Gradle sync completed" message at the bottom.

### Step 6: Set Up Device/Emulator

#### Option A: Use Physical Device

1. **Enable Developer Options** on your Android device:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings** → **Developer Options**
   - Enable **USB Debugging**

2. **Connect device via USB**
   - Use a USB cable
   - Allow USB debugging when prompted on device

3. **Verify connection:**
   - In Android Studio, check top toolbar
   - You should see your device name in the device dropdown

#### Option B: Use Android Emulator

1. **Create Virtual Device:**
   - Click **Device Manager** (phone icon in toolbar)
   - Click **Create Device**
   - Select a device (e.g., Pixel 5)
   - Select a system image (e.g., Android 13)
   - Click **Finish**

2. **Start Emulator:**
   - Click the ▶️ play button next to your virtual device
   - Wait for emulator to boot (first time takes longer)

### Step 7: Run the App

1. **Select your device/emulator** from the dropdown in Android Studio toolbar

2. **Click the green "Run" button** (▶️) or press `Shift + F10`

3. **Wait for build:**
   - Android Studio will compile the app
   - First build takes 2-5 minutes
   - Subsequent builds are faster

4. **App launches automatically** on your device/emulator!

---

## Quick Commands Reference

```bash
# Build web app
npm run build

# Sync to Android
npm run cap:sync

# Build and sync (one command)
npm run cap:build

# Open Android Studio
npm run cap:open:android
```

---

## Troubleshooting

### Issue: "Gradle sync failed"

**Solution:**
1. Check internet connection
2. File → Invalidate Caches → Invalidate and Restart
3. Try again

### Issue: "SDK not found"

**Solution:**
1. Android Studio → Tools → SDK Manager
2. Install Android SDK Platform (latest)
3. Install Android SDK Build-Tools
4. Click Apply

### Issue: "Device not detected"

**Solution:**
1. Check USB cable (use data cable, not charging-only)
2. Enable USB Debugging in Developer Options
3. Allow USB debugging prompt on device
4. Try different USB port

### Issue: "App crashes on launch"

**Solution:**
1. Check Logcat in Android Studio (bottom panel)
2. Look for error messages
3. Verify backend API URL is correct
4. Check network connectivity

### Issue: "Build takes too long"

**Solution:**
- First build always takes 2-5 minutes
- Subsequent builds are faster (30 seconds - 2 minutes)
- Be patient on first build

### Issue: "Cannot find module" errors

**Solution:**
```bash
cd offsite/frontend
npm install
npm run build
npm run cap:sync
```

---

## Development Workflow

When you make code changes:

1. **Edit code** in `offsite/frontend/src/`
2. **Build:** `npm run build`
3. **Sync:** `npm run cap:sync`
4. **Run in Android Studio** (click Run button again)

**Tip:** You can use `npm run cap:build` to do steps 2 and 3 together.

---

## Testing the App

Once the app is running:

1. **Login** - Test authentication
2. **GPS Check-in** - Test geolocation (Attendance page)
3. **Camera** - Test camera (DPR page - upload photos)
4. **Offline Mode** - Turn off WiFi, test offline features
5. **Sync** - Turn WiFi back on, test sync

---

## Building APK for Distribution

To create an APK file:

1. **Build** → **Generate Signed Bundle / APK**
2. Choose **APK**
3. Create keystore (first time) or use existing
4. Select **release** build variant
5. Click **Finish**
6. APK will be in: `android/app/release/app-release.apk`

---

## Next Steps

- ✅ App is running!
- 📱 Test all features
- 🔧 Make code changes
- 🚀 Build APK for distribution

---

**Need Help?** Check `CAPACITOR_ANDROID_GUIDE.md` for detailed documentation.
