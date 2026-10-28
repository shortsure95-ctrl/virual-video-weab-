# AdStraw Cinema & Reels (US HD Video Monetization Platform)

A high-converting, mobile-first video streaming and 3-step ad gateway portal designed specifically for US audiences. Built with Vanilla JavaScript, Vite, HTML5, modern CSS design tokens, and optional Firebase Firestore integration.

---

## 🌟 Key Features

### 1. 📱 Auto-Responsive Mobile-First Design
- **True Auto Size**: Automatically adjusts to any phone screen size natively (100% full width on mobile) and sits beautifully centered on tablet/desktop screens without any clunky device frames or simulator toolbars.
- **Ultra-Fresh OLED Dark Palette**: Deep luxury dark theme (`#07090e`) with electric red & cyan accents that makes Hollywood posters and viral reels pop without distracting clutter.

### 2. ⚡ 3-Click Ad Monetization Funnel ("3 Steps to Unlock")
- **Step 1 (Click 1)**: User taps video or button → Opens **Sponsor Ad 1** in a new tab → Progress advances to 33% (Node 1 turns green `✓`).
- **Step 2 (Click 2)**: User taps video or button → Opens **Sponsor Ad 2** in a new tab → Progress advances to 66% (Node 2 turns green `✓`).
- **Step 3 (Click 3)**: User taps video or button → Opens **Sponsor Ad 3** in a new tab → Unlocks the full high-definition video player instantly!
- **Interactive Video Overlay**: Tapping directly on the locked video thumbnail pulses with step prompts (`Tap to Play • Step 1 of 3`, `Step 2 of 3`, `Final Tap • Unlock Full Stream`).
- **Session Caching**: Remembers unlocked videos during the user's session, with a "🔄 Re-test 3-Click Gate" button for testing.

### 3. 🎬 Google Drive & Multi-Source Video Engine
- **Google Drive Integration**: Simply share your Google Drive video as **"Anyone with the link can view"** and paste the link. AdStraw automatically converts it into a high-speed preview player embed and direct stream button.
- **Google Drive Thumbnail Auto-Converter**: If you also upload thumbnail images to Google Drive, AdStraw automatically converts them into browser-renderable image endpoints (`https://lh3.googleusercontent.com/d/FILE_ID`).
- **Universal Support**: Also supports direct `.mp4` / `.webm` files and YouTube links.

### 4. ⚙️ Hidden Admin Control Center (`/admin`)
- **No Visible Admin Buttons**: Completely hidden from ordinary website visitors. No admin buttons appear anywhere in the header or bottom navigation bar.
- **URL-Only Access**: Type `/admin` or `#/admin` directly in the browser address bar (e.g. `http://localhost:5173/#/admin`).
- **PIN Protected**: Default PIN is `1234` (configurable inside the Security tab).
- **Manage Videos**: Add new videos, edit existing videos (change title, thumbnail, link, duration, category), delete videos with 1-click.
- **3-Step Ad Gateways**: Configure custom ad URLs for Step 1, Step 2, and Step 3, plus sponsor banner offer text and link.
- **Individual Ad Overrides**: Option to set custom ad URLs for specific videos.

### 5. ☁️ Firebase Firestore Cloud Sync + Local Storage Fallback
- **Works Instantly Out-of-the-Box**: Uses browser LocalStorage by default so the site works immediately without setup.
- **One-Click Firebase Connection**: Enter your Firebase web credentials in the `/admin` Firebase tab to automatically sync all videos and ad settings to Firebase Firestore across all devices!
- **Bulk Sync Tool**: Includes a "Sync All Local Videos to Firebase" button to upload all initial movies to your cloud database in one click.

---

## 🚀 How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

3. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🔑 Admin Access Details

- **Route**: `http://localhost:5173/#/admin` (or click `⚙️ Admin` in the top bar)
- **Default PIN**: `1234`
- You can change this PIN anytime in the **🔐 Security PIN** tab.

---

## 💡 How to Add Google Drive Videos

1. Upload your video file (`.mp4`, `.mkv`, etc.) to [Google Drive](https://drive.google.com).
2. Right-click the file → **Share** → Set General access to **"Anyone with the link can view"**.
3. Copy the link (e.g., `https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing`).
4. Go to `/admin` → **Manage Videos** → Paste the link into the **Google Drive Video URL** field.
5. Provide a title, thumbnail image URL, and click **🚀 Publish Video**!
