# PWA + Capacitor + App Stores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the React + Vite PWA with Capacitor to produce native iOS and Android apps ready for App Store and Google Play submission as a paid app.

**Architecture:** Capacitor sits as a native shell around the existing web build output (`dist/`). The web app runs inside a WKWebView (iOS) and WebView (Android) with no code changes needed. Capacitor provides native APIs for splash screen and status bar. The Supabase OAuth flow requires a custom URL scheme for the auth callback to work inside the native app.

**Tech Stack:** Capacitor 7, `@capacitor/ios`, `@capacitor/android`, `@capacitor/splash-screen`, `@capacitor/status-bar`, Xcode (iOS), Android Studio (Android)

**Prerequisites:** Plan 1 (Supabase + Auth + Management) must be complete and `yarn build` passing.

---

## File Map

### Created
- `capacitor.config.ts` — Capacitor configuration
- `ios/` — generated iOS Xcode project (do not manually edit)
- `android/` — generated Android Gradle project (do not manually edit)
- `public/splash/` — splash screen assets (various sizes)

### Modified
- `package.json` — add Capacitor scripts
- `vite.config.ts` — ensure `base: "./"` for Capacitor compatibility
- `src/lib/supabase.ts` — add custom URL scheme for OAuth redirect in native
- `public/manifest.json` — verify PWA manifest is valid

---

## Task 1: Install Capacitor and initialize

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`

- [ ] **Step 1: Install Capacitor core and CLI**

```bash
yarn add @capacitor/core
yarn add -D @capacitor/cli
```

- [ ] **Step 2: Initialize Capacitor**

```bash
npx cap init "Iron Protocol" "com.ironprotocol.app" --web-dir dist
```

When prompted:
- App name: `Iron Protocol`
- App ID: `com.ironprotocol.app` (reverse domain — change to your actual domain)
- Web dir: `dist`

This creates `capacitor.config.ts`.

- [ ] **Step 3: Update `capacitor.config.ts`**

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ironprotocol.app",
  appName: "Iron Protocol",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0a0a0c",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0a0a0c",
    },
  },
};

export default config;
```

- [ ] **Step 4: Install platform plugins**

```bash
yarn add @capacitor/ios @capacitor/android
yarn add @capacitor/splash-screen @capacitor/status-bar
```

- [ ] **Step 5: Ensure `vite.config.ts` has `base: "/"` (not `"./"` — Capacitor handles paths)**

Check `vite.config.ts`. The `base` should be `"/"` or unset. Capacitor copies `dist/` into the native project, so relative paths work fine.

- [ ] **Step 6: Commit**

```bash
git add capacitor.config.ts package.json yarn.lock
git commit -m "feat: initialize capacitor with ios and android platforms"
```

---

## Task 2: Configure Supabase OAuth for native apps

The Supabase OAuth redirect after Google/Apple login needs to return to the native app, not a browser URL. This is done via a custom URL scheme.

**Files:**
- Modify: `src/hooks/useAuth.ts`
- Modify: Supabase Dashboard settings

- [ ] **Step 1: Update OAuth redirect in `useAuth.ts`**

In `src/hooks/useAuth.ts`, update both `signInWithGoogle` and `signInWithApple` to use a custom scheme when running natively:

```typescript
function getRedirectUrl(): string {
  // Capacitor sets window.Capacitor when running natively
  const isNative = !!(window as { Capacitor?: unknown }).Capacitor;
  if (isNative) return "com.ironprotocol.app://auth/callback";
  return window.location.origin;
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getRedirectUrl() },
  });
}

async function signInWithApple() {
  await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: getRedirectUrl() },
  });
}
```

- [ ] **Step 2: Add custom scheme to Supabase redirect allowlist**

In Supabase Dashboard > Authentication > URL Configuration > Redirect URLs, add:
```
com.ironprotocol.app://auth/callback
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add native custom url scheme for supabase oauth redirect"
```

---

## Task 3: Add iOS platform

**Files:**
- Create: `ios/` (generated)

- [ ] **Step 1: Build the web app**

```bash
yarn build
```

Expected: `dist/` folder is populated.

- [ ] **Step 2: Add iOS platform**

```bash
npx cap add ios
```

This creates the `ios/` Xcode project. Expected output includes "ios platform added".

- [ ] **Step 3: Sync web build to iOS**

```bash
npx cap sync ios
```

Expected: "Sync finished" with no errors.

- [ ] **Step 4: Open in Xcode**

```bash
npx cap open ios
```

Xcode opens the project.

- [ ] **Step 5: Configure in Xcode**

1. Select the `App` target
2. Under "Signing & Capabilities": set Team to your Apple Developer account
3. Bundle Identifier: `com.ironprotocol.app` (must match `capacitor.config.ts`)
4. Deployment Target: iOS 16.0 minimum

- [ ] **Step 6: Add custom URL scheme to iOS**

In Xcode, select `App > Info > URL Types`:
- Add new URL Type
- Identifier: `com.ironprotocol.app`
- URL Schemes: `com.ironprotocol.app`

- [ ] **Step 7: Test on iOS Simulator**

In Xcode, select an iOS 17+ simulator and press Run (Cmd+R).

Expected: App launches, shows the login screen.

- [ ] **Step 8: Commit**

```bash
git add ios/ capacitor.config.ts
git commit -m "feat: add ios capacitor platform"
```

---

## Task 4: Add Android platform

**Files:**
- Create: `android/` (generated)

- [ ] **Step 1: Add Android platform**

```bash
npx cap add android
```

- [ ] **Step 2: Sync**

```bash
npx cap sync android
```

- [ ] **Step 3: Open in Android Studio**

```bash
npx cap open android
```

Android Studio opens the project. Wait for Gradle sync to complete.

- [ ] **Step 4: Add custom URL scheme to Android**

In `android/app/src/main/AndroidManifest.xml`, inside the `<activity>` block, add:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.ironprotocol.app" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

- [ ] **Step 5: Test on Android Emulator**

In Android Studio, select an emulator (API 33+) and press Run.

Expected: App launches, shows login screen.

- [ ] **Step 6: Commit**

```bash
git add android/
git commit -m "feat: add android capacitor platform"
```

---

## Task 5: App icons and splash screens

**Files:**
- Modify: `public/` — icon assets
- Modify: `ios/` — generated asset catalogs
- Modify: `android/` — generated drawable assets

- [ ] **Step 1: Install Capacitor Assets tool**

```bash
yarn add -D @capacitor/assets
```

- [ ] **Step 2: Prepare source assets**

Create these files (1024x1024 PNG, no transparency for icon; 2732x2732 PNG for splash):

```
assets/
  icon-only.png       — app icon, 1024x1024, no alpha channel
  icon-foreground.png — adaptive icon foreground, 1024x1024 (Android)
  icon-background.png — adaptive icon background, 1024x1024, solid color (#0a0a0c)
  splash.png          — splash screen, 2732x2732, centered logo on dark background
  splash-dark.png     — same as splash.png (already dark)
```

Design notes:
- Icon: use the existing Iron Protocol logo/mark on `#0a0a0c` background
- Splash: centered logo, `#0a0a0c` background — matches `SplashScreen.backgroundColor` in `capacitor.config.ts`

- [ ] **Step 3: Generate all sizes**

```bash
npx capacitor-assets generate --assetPath assets
```

This generates all required icon and splash sizes for iOS and Android automatically.

- [ ] **Step 4: Commit**

```bash
git add assets/ ios/ android/
git commit -m "feat: add app icons and splash screens for ios and android"
```

---

## Task 6: Production build pipeline

- [ ] **Step 1: Add Capacitor build scripts to `package.json`**

```json
{
  "scripts": {
    "cap:sync": "yarn build && npx cap sync",
    "cap:ios": "yarn cap:sync && npx cap open ios",
    "cap:android": "yarn cap:sync && npx cap open android"
  }
}
```

- [ ] **Step 2: Test full build pipeline**

```bash
yarn cap:sync
```

Expected: Vite build succeeds, then Capacitor sync copies to both platforms.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add capacitor build scripts"
```

---

## Task 7: iOS App Store submission

**Prerequisites:**
- Apple Developer account ($99/year) enrolled and active
- App icon and splash prepared (Task 5 complete)
- Tested on real device (not just simulator)

- [ ] **Step 1: Create App in App Store Connect**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps > "+" > New App
3. Platform: iOS
4. Name: "Iron Protocol" (or your chosen name)
5. Bundle ID: `com.ironprotocol.app`
6. SKU: `iron-protocol-ios` (internal reference)
7. User access: Full access

- [ ] **Step 2: Set pricing**

App Store Connect > Pricing and Availability:
- Set price tier (choose your price point)
- Availability: select countries

- [ ] **Step 3: Prepare App Store listing**

In App Store Connect > App Information:
- Subtitle: max 30 chars (e.g., "Controle de Treinos")
- Category: Health & Fitness
- Privacy Policy URL: required (create a simple page or use a generator)

Under Version > Screenshots:
- Required: 6.5" iPhone screenshots (1284×2778 or 1242×2688)
- Optional: 5.5" iPhone, iPad

Under Description:
- Description (up to 4000 chars)
- Keywords (up to 100 chars, comma-separated)
- Support URL

- [ ] **Step 4: Archive and upload from Xcode**

1. In Xcode: Product > Archive
2. Organizer opens > Distribute App
3. App Store Connect > Upload
4. Follow wizard (automatic signing, upload symbols)
5. Wait for Processing in App Store Connect (10-30 min)

- [ ] **Step 5: Submit for review**

In App Store Connect, select the build under the version, complete all required fields, then "Submit for Review".

Review time: typically 1-3 business days.

---

## Task 8: Google Play Store submission

**Prerequisites:**
- Google Play Developer account ($25 one-time fee)
- Android build tested on real device

- [ ] **Step 1: Create signed APK/AAB**

In Android Studio:
1. Build > Generate Signed Bundle/APK
2. Android App Bundle (AAB is required for Play Store)
3. Create a new keystore (save it securely — you need it for every future update):
   - Key store path: `android/keystore/ironprotocol.jks`
   - Alias: `ironprotocol`
4. Build type: Release

- [ ] **Step 2: Store the keystore safely**

```bash
# Add keystore to gitignore — NEVER commit it
echo "android/keystore/" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore android keystore"
```

Back up the `.jks` file and the key passwords somewhere secure (password manager). Losing it means you cannot update the app on Play Store.

- [ ] **Step 3: Create app in Google Play Console**

1. Go to [Google Play Console](https://play.google.com/console)
2. Create app > App name: "Iron Protocol"
3. Language: Portuguese (Brazil)
4. App or game: App
5. Free or paid: Paid → set price

- [ ] **Step 4: Complete store listing**

Under Main store listing:
- Short description (80 chars max)
- Full description (4000 chars max)
- Screenshots: phone (at least 2), tablet optional
- Feature graphic: 1024×500 PNG
- App icon: 512×512 PNG

Under Content rating: complete the questionnaire (Health & Fitness, no violence/mature content).

- [ ] **Step 5: Upload AAB**

1. Production > Create new release
2. Upload the `.aab` file from Android Studio output
3. Release notes (What's new)
4. Review and rollout to 100%

Review time: 1-7 business days for new apps.

---

## Ongoing Release Process

For every app update after the initial release:

```bash
# 1. Build and sync
yarn cap:sync

# 2. iOS: archive in Xcode and upload to App Store Connect
npx cap open ios
# In Xcode: Product > Archive > Distribute

# 3. Android: generate signed AAB and upload to Play Console
npx cap open android
# In Android Studio: Build > Generate Signed Bundle
```

Increment the version in `package.json` and `capacitor.config.ts` for each release.

---

## Verification Checklist

- [ ] `yarn build && npx cap sync` completes without errors
- [ ] iOS app runs on simulator and real device
- [ ] Android app runs on emulator and real device
- [ ] Google OAuth flow completes inside native app (custom scheme redirect works)
- [ ] Apple OAuth flow completes inside native app
- [ ] Splash screen shows correctly on both platforms
- [ ] Status bar color matches app dark background
- [ ] App icon renders correctly on home screen (both platforms)
- [ ] iOS submission accepted by App Store review
- [ ] Android submission accepted by Google Play review
