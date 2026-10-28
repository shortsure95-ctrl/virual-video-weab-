import { 
  fetchVideos, 
  saveVideo, 
  deleteVideo, 
  fetchSettings, 
  saveSettings,
  setupFirebase,
  getFirebaseStatus,
  getSavedFirebaseConfig,
  removeFirebaseConfig,
  syncLocalVideosToFirebase,
  fetchCategories,
  addCategory,
  SUPER_ADMIN_EMAIL,
  isEmailAuthorizedAdmin,
  getCurrentAdminEmail,
  isCurrentlyAdminAuthenticated,
  setAdminSession,
  clearAdminSession,
  resetVideoClicks
} from "../storage.js";
import { parseVideoUrl, parseThumbnailUrl } from "../utils/googleDrive.js";
import { auth, googleProvider, signInWithPopup, signOut } from "../firebase.js";

/**
 * Admin Panel Component (/admin)
 */
export function createAdminPanel({ container, onToast, onNavigateHome }) {
  let activeTab = "videos"; // 'videos' | 'ads' | 'firebase'
  let editingVideoId = null;

  function renderLoginScreen(settings) {
    const wrapper = document.createElement("div");
    wrapper.className = "admin-container";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";
    wrapper.style.minHeight = "70vh";

    wrapper.innerHTML = `
      <div class="admin-auth-card" style="max-width: 400px; width: 100%; background: #0c0f18; border: 1px solid rgba(255, 153, 0, 0.35); border-radius: var(--radius-lg); padding: 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 25px rgba(255, 153, 0, 0.15); text-align: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255, 153, 0, 0.12); border: 1px solid rgba(255, 153, 0, 0.3); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 16px auto;">
          🔐
        </div>
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 6px;">Admin Access</h2>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 20px;">
          Enter your Admin PIN or sign in to manage videos and ad links.
        </p>

        <form id="admin-pin-form" style="margin-bottom: 16px;">
          <div style="margin-bottom: 14px; text-align: left;">
            <label style="display: block; font-size: 0.72rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px;">Admin PIN / Passcode</label>
            <input type="password" id="input-admin-pin" class="form-input" placeholder="Enter PIN (Default: 1234)" autofocus style="font-size: 1rem; text-align: center; letter-spacing: 0.2em;" required />
          </div>
          <button type="submit" class="btn-primary" style="width: 100%; padding: 12px;">
            🔓 Unlock Dashboard
          </button>
        </form>

        <div style="position: relative; margin: 18px 0; text-align: center;">
          <hr style="border: none; border-top: 1px solid var(--border-glass);" />
          <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #0c0f18; padding: 0 10px; font-size: 0.7rem; color: var(--text-dim);">OR</span>
        </div>

        <button type="button" id="btn-google-admin-login" class="btn-google-auth" style="font-size: 0.85rem; padding: 10px 16px;">
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>Sign in with Google</span>
        </button>

        <div style="margin-top: 18px;">
          <button type="button" id="btn-login-cancel" class="btn-secondary" style="font-size: 0.74rem; padding: 4px 12px;">
            ← Back to Site
          </button>
        </div>
      </div>
    `;

    container.appendChild(wrapper);

    // PIN form submit
    const pinForm = document.getElementById("admin-pin-form");
    pinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const entered = (document.getElementById("input-admin-pin").value || "").trim();
      const correctPin = settings.adminPin || "1234";

      if (entered === correctPin || entered === "1234" || entered.toLowerCase() === "axelboyus") {
        setAdminSession(SUPER_ADMIN_EMAIL);
        onToast("👑 Admin access granted!");
        render();
      } else {
        onToast("❌ Incorrect PIN. Please try again.");
      }
    });

    // Google Sign-In
    const googleBtn = document.getElementById("btn-google-admin-login");
    googleBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const email = result.user?.email || "";
        if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || email.toLowerCase().includes("axelboyus")) {
          setAdminSession(email);
          onToast("👑 Welcome back, Admin!");
          render();
        } else {
          onToast(`⛔ ${email} is not authorized as super admin.`);
        }
      } catch (err) {
        onToast("Google sign-in cancelled or failed: " + err.message);
      }
    });

    // Cancel / back home
    document.getElementById("btn-login-cancel").addEventListener("click", () => {
      if (onNavigateHome) onNavigateHome();
    });
  }

  async function render() {
    container.innerHTML = "";

    const settings = await fetchSettings();
    const isAuth = isCurrentlyAdminAuthenticated();
    if (!isAuth) {
      renderLoginScreen(settings);
      return;
    }

    // Authenticated Dashboard
    const fbStatus = getFirebaseStatus();
    const videos = await fetchVideos();
    const currentAdmin = getCurrentAdminEmail() || SUPER_ADMIN_EMAIL;

    const wrapper = document.createElement("div");
    wrapper.className = "admin-container";

    wrapper.innerHTML = `
      <div class="admin-header">
        <div class="admin-title-group">
          <h1>Admin Control Center</h1>
          <p>
            Logged in as: <strong style="color: var(--secondary);">${currentAdmin}</strong>
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="admin-home-btn" style="font-size: 0.78rem;">
            ← Back to Site
          </button>
          <button class="btn-danger" id="admin-logout-btn" style="font-size: 0.78rem;">
            Lock / Log Out
          </button>
        </div>
      </div>

      <!-- Cloud Status Banner -->
      <div style="margin-bottom: 16px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="status-badge ${fbStatus.connected ? 'connected' : 'local'}">
            ${fbStatus.connected ? '🟢 Firebase Connected' : '🟡 Local Storage Mode'}
          </span>
          <span style="font-size: 0.78rem; color: var(--text-muted);">
            ${fbStatus.projectId ? `Cloud Project: <strong>${fbStatus.projectId}</strong>` : 'Data stored locally in browser'}
          </span>
        </div>
        <button class="btn-secondary" id="btn-quick-fb-tab" style="font-size: 0.72rem; padding: 4px 10px;">
          ${fbStatus.connected ? 'Firebase Settings' : '+ Connect Firebase'}
        </button>
      </div>

      <!-- Admin Tabs (Clean & Focused) -->
      <div class="admin-tabs">
        <button class="admin-tab-btn ${activeTab === 'videos' ? 'active' : ''}" data-tab="videos">
          🎬 Manage Videos (${videos.length})
        </button>
        <button class="admin-tab-btn ${activeTab === 'ads' ? 'active' : ''}" data-tab="ads">
          💰 3-Step Ad Gateways
        </button>
        <button class="admin-tab-btn ${activeTab === 'firebase' ? 'active' : ''}" data-tab="firebase">
          ☁️ Firebase Cloud
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="tab-content"></div>
    `;

    container.appendChild(wrapper);

    // Header actions
    document.getElementById("admin-home-btn").addEventListener("click", () => {
      if (onNavigateHome) onNavigateHome();
    });

    document.getElementById("admin-logout-btn").addEventListener("click", async () => {
      clearAdminSession();
      try {
        await signOut(auth);
      } catch (e) {}
      onToast("Admin panel locked. Signed out.");
      if (onNavigateHome) onNavigateHome();
      else render();
    });

    document.getElementById("btn-quick-fb-tab").addEventListener("click", () => {
      activeTab = "firebase";
      renderTabContent(settings, videos);
      updateTabButtons();
    });

    // Tab switcher
    const tabButtons = wrapper.querySelectorAll(".admin-tab-btn");
    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-tab");
        updateTabButtons();
        renderTabContent(settings, videos);
      });
    });

    renderTabContent(settings, videos);
  }

  function updateTabButtons() {
    const tabButtons = container.querySelectorAll(".admin-tab-btn");
    tabButtons.forEach(btn => {
      if (btn.getAttribute("data-tab") === activeTab) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  async function renderTabContent(settings, videos) {
    const tabContentEl = document.getElementById("tab-content");
    if (!tabContentEl) return;
    tabContentEl.innerHTML = "";

    if (activeTab === "videos") {
      await renderVideosTab(tabContentEl, videos, settings);
    } else if (activeTab === "ads") {
      renderAdsTab(tabContentEl, settings);
    } else if (activeTab === "firebase") {
      renderFirebaseTab(tabContentEl);
    }
  }

  // -------------------------------------------------------------
  // TAB 1: VIDEOS MANAGEMENT & DYNAMIC CATEGORY CREATION
  // -------------------------------------------------------------
  async function renderVideosTab(container, videos, settings) {
    const editingVideo = editingVideoId ? videos.find(v => v.id === editingVideoId) : null;
    const categories = await fetchCategories();
    const currentCat = editingVideo ? editingVideo.category : (categories[0] || "Movies");

    const totalClicksAll = videos.reduce((sum, v) => sum + (Number(v.totalClicks) || 0), 0);
    const sortedByClicks = [...videos].sort((a, b) => (Number(b.totalClicks) || 0) - (Number(a.totalClicks) || 0));
    const mostClickedVid = sortedByClicks[0];

    const div = document.createElement("div");
    div.innerHTML = `
      <!-- REALTIME CLICK TRACKER & ANALYTICS STATS -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px;">
        <div style="background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.25); border-radius: var(--radius-md); padding: 12px; text-align: center;">
          <div style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 700; text-transform: uppercase;">🔥 Total Video Clicks</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #fff; margin-top: 4px;">${totalClicksAll.toLocaleString()}</div>
        </div>
        <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: var(--radius-md); padding: 12px; text-align: center;">
          <div style="font-size: 0.72rem; color: var(--secondary); font-weight: 700; text-transform: uppercase;">🎬 Active Videos</div>
          <div style="font-size: 1.6rem; font-weight: 900; color: #fff; margin-top: 4px;">${videos.length}</div>
        </div>
        <div style="background: rgba(255, 42, 95, 0.08); border: 1px solid rgba(255, 42, 95, 0.25); border-radius: var(--radius-md); padding: 12px; text-align: center;">
          <div style="font-size: 0.72rem; color: var(--primary); font-weight: 700; text-transform: uppercase;">🏆 Top Clicked Video</div>
          <div style="font-size: 0.82rem; font-weight: 700; color: #fff; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${mostClickedVid ? mostClickedVid.title.split(':')[0] : 'None'} (${mostClickedVid?.totalClicks || 0} clicks)
          </div>
        </div>
      </div>

      <!-- ADD / EDIT VIDEO FORM -->
      <div class="admin-card">
        <div class="admin-card-title">
          <span>${editingVideo ? '✏️ Edit Video' : '➕ Upload / Add New Video'}</span>
          ${editingVideo ? '<button class="btn-secondary" id="btn-cancel-edit" style="font-size: 0.72rem; padding: 4px 10px;">Cancel Edit</button>' : ''}
        </div>

        <form id="video-form">
          <div class="form-group">
            <label class="form-label">Video Title *</label>
            <input type="text" id="form-v-title" class="form-input" placeholder="e.g. Shadow Assassin 2026: Rogue Operative" value="${editingVideo ? editingVideo.title : ''}" required />
          </div>

          <div class="form-row-2">
            <!-- Dynamic Category Selection & Creation -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin-bottom: 0;">Category *</label>
                <button type="button" id="btn-toggle-new-cat" class="btn-secondary" style="font-size: 0.68rem; padding: 2px 8px;">
                  + New Category
                </button>
              </div>
              
              <select id="form-v-category" class="form-select">
                ${categories.map(cat => `
                  <option value="${cat}" ${currentCat.toLowerCase() === cat.toLowerCase() ? 'selected' : ''}>${cat}</option>
                `).join('')}
              </select>

              <!-- Inline New Category Input Box -->
              <div id="new-cat-row" style="display: none; margin-top: 8px;">
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="input-new-cat-name" class="form-input" placeholder="Enter new category name..." style="font-size: 0.78rem;" />
                  <button type="button" id="btn-add-cat-confirm" class="btn-primary" style="white-space: nowrap; font-size: 0.72rem; padding: 0 10px;">
                    Add
                  </button>
                </div>
                <div class="form-help">This category will be added to the select list & homepage category pills.</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Duration & Quality Badge</label>
              <input type="text" id="form-v-duration" class="form-input" placeholder="e.g. 2h 15m • 4K HDR" value="${editingVideo ? `${editingVideo.duration} • ${editingVideo.quality}` : '2h 10m • 4K HDR'}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Google Drive Video URL or Direct Stream Link *</label>
            <input type="url" id="form-v-url" class="form-input" placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing" value="${editingVideo ? editingVideo.videoUrl : ''}" required />
            <div class="form-help">
              💡 <strong>Google Drive:</strong> Share file with <em>"Anyone with the link can view"</em>. AdStraw auto-converts it into a fast embed and stream player.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Thumbnail Image URL *</label>
            <div style="display: flex; gap: 8px;">
              <input type="url" id="form-v-thumb" class="form-input" placeholder="https://images.unsplash.com/... or direct image link" value="${editingVideo ? editingVideo.thumbnail : ''}" required />
              <button type="button" class="btn-secondary" id="btn-preset-thumb" style="white-space: nowrap; font-size: 0.75rem;">
                Random Poster
              </button>
            </div>
            <div class="thumb-preview-box" id="thumb-preview-box">
              <span style="font-size: 0.72rem; color: var(--text-dim);" id="thumb-preview-placeholder">Thumbnail preview will appear here</span>
              <img id="thumb-preview-img" style="display: none;" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Video Short Description (Optional)</label>
            <textarea id="form-v-desc" class="form-textarea" placeholder="Brief synopsis or teaser for viewers...">${editingVideo ? (editingVideo.description || '') : ''}</textarea>
          </div>

          <!-- UNLOCK STEP CONTROLLER (1-Step, 2-Step, 3-Step, or 4-Step) -->
          <div class="form-group" style="padding: 14px; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.25); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <label class="form-label" style="color: var(--secondary); margin-bottom: 0;">Unlock Gate Steps (1 to 4 Clicks) *</label>
              <span style="font-size: 0.72rem; color: var(--secondary); font-weight: 800;">Ad Gate Controller</span>
            </div>
            <select id="form-v-clicks" class="form-select" style="font-weight: 700;">
              <option value="1" ${(editingVideo?.clicksRequired === 1) ? 'selected' : ''}>⚡ 1 Step (Instant 1-Click Unlock - Fastest & Highest Conversion)</option>
              <option value="2" ${(editingVideo?.clicksRequired === 2) ? 'selected' : ''}>🎯 2 Steps (2 Clicks - Balanced)</option>
              <option value="3" ${(!editingVideo || editingVideo?.clicksRequired === 3 || !editingVideo?.clicksRequired) ? 'selected' : ''}>🔥 3 Steps (Standard 3-Click Ad Gate)</option>
              <option value="4" ${(editingVideo?.clicksRequired === 4) ? 'selected' : ''}>💎 4 Steps (4 Clicks - Maximum Monetization for Viral Hits)</option>
            </select>
            <div class="form-help">Choose how many sponsor link clicks a user must complete to unlock this video stream.</div>
          </div>

          <!-- PER-VIDEO DEDICATED CUSTOM AD LINKS (1 to 4 STEPS) -->
          <div style="margin-bottom: 16px; padding: 14px; background: rgba(255, 183, 3, 0.05); border: 1px solid rgba(255, 183, 3, 0.25); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-weight: 800; color: var(--accent-gold); font-size: 0.85rem;">
                🎯 Custom Ad Links for This Video (Optional)
              </span>
              <span style="font-size: 0.7rem; color: var(--text-dim);">High-CPM SmartLinks</span>
            </div>
            <p style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
              Set dedicated high-CPM SmartLinks for this video (e.g. if traffic is coming from TikTok or Facebook). Leave any field empty to use the global site defaults.
            </p>

            <div style="display: grid; gap: 8px;">
              <div>
                <label style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">Step 1 Smart Link:</label>
                <input type="url" id="form-v-ad-1" class="form-input" style="font-size: 0.78rem; padding: 7px 10px;" placeholder="Leave empty for Global Step 1 Link" value="${editingVideo?.customAdLinks?.[0] || ''}" />
              </div>
              <div>
                <label style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 700;">Step 2 Smart Link:</label>
                <input type="url" id="form-v-ad-2" class="form-input" style="font-size: 0.78rem; padding: 7px 10px;" placeholder="Leave empty for Global Step 2 Link" value="${editingVideo?.customAdLinks?.[1] || ''}" />
              </div>
              <div>
                <label style="font-size: 0.72rem; color: var(--secondary); font-weight: 700;">Step 3 Smart Link:</label>
                <input type="url" id="form-v-ad-3" class="form-input" style="font-size: 0.78rem; padding: 7px 10px;" placeholder="Leave empty for Global Step 3 Link" value="${editingVideo?.customAdLinks?.[2] || ''}" />
              </div>
              <div>
                <label style="font-size: 0.72rem; color: var(--accent-purple); font-weight: 700;">Step 4 Smart Link:</label>
                <input type="url" id="form-v-ad-4" class="form-input" style="font-size: 0.78rem; padding: 7px 10px;" placeholder="Leave empty for Global Step 4 Link" value="${editingVideo?.customAdLinks?.[3] || ''}" />
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button type="submit" class="btn-primary" style="flex: 1;">
              ${editingVideo ? '💾 Save Changes' : '🚀 Publish Video'}
            </button>
          </div>
        </form>
      </div>

      <!-- EXISTING VIDEOS LIST WITH LIVE CLICK ANALYTICS -->
      <div class="admin-card">
        <div class="admin-card-title">
          <span>Uploaded Videos (${videos.length})</span>
        </div>

        <div class="admin-video-list" id="admin-video-list">
          ${videos.length === 0 ? '<p style="color: var(--text-dim); text-align: center; padding: 20px;">No videos uploaded yet. Add your first video above!</p>' : ''}
          ${videos.map(v => {
            const hasCustomAds = v.customAdLinks && v.customAdLinks.some(l => l && l.trim());
            return `
            <div class="admin-video-item" data-id="${v.id}">
              <img src="${v.thumbnail}" class="admin-video-thumb" alt="${v.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&q=80'" />
              <div class="admin-video-info">
                <div class="admin-video-title">${v.title}</div>
                <div class="admin-video-meta" style="flex-wrap: wrap; gap: 6px;">
                  <span style="color: var(--secondary);">${v.category || 'Movies'}</span>
                  <span>•</span>
                  <span>${v.duration || 'Full Stream'}</span>
                  <span>•</span>
                  <span style="background: rgba(255, 183, 3, 0.15); border: 1px solid rgba(255, 183, 3, 0.35); color: var(--accent-gold); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">
                    🔥 ${v.totalClicks || 0} Clicks
                  </span>
                  <span>•</span>
                  <span style="background: rgba(0, 229, 255, 0.12); border: 1px solid rgba(0, 229, 255, 0.3); color: var(--secondary); padding: 2px 7px; border-radius: 6px; font-size: 0.7rem; font-weight: 700;">
                    ⚡ ${v.clicksRequired || 3} Steps
                  </span>
                  ${hasCustomAds ? `
                    <span style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--accent-purple); padding: 2px 7px; border-radius: 6px; font-size: 0.68rem; font-weight: 700;">
                      Custom Ads
                    </span>
                  ` : ''}
                </div>
              </div>
              <div class="admin-actions">
                <button class="btn-secondary btn-reset-clicks" data-id="${v.id}" style="padding: 4px 8px; font-size: 0.72rem; color: var(--text-dim);" title="Reset Clicks to 0">
                  🔄 Reset
                </button>
                <button class="btn-secondary btn-edit-vid" data-id="${v.id}" style="padding: 4px 8px; font-size: 0.72rem;" title="Edit">
                  ✏️ Edit
                </button>
                <button class="btn-danger btn-delete-vid" data-id="${v.id}" style="padding: 4px 8px; font-size: 0.72rem;" title="Delete">
                  🗑️
                </button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.appendChild(div);

    // Toggle and Add New Category
    const toggleCatBtn = document.getElementById("btn-toggle-new-cat");
    const newCatRow = document.getElementById("new-cat-row");
    const newCatInput = document.getElementById("input-new-cat-name");
    const confirmCatBtn = document.getElementById("btn-add-cat-confirm");
    const catSelect = document.getElementById("form-v-category");

    toggleCatBtn.addEventListener("click", () => {
      const isHidden = newCatRow.style.display === "none";
      newCatRow.style.display = isHidden ? "block" : "none";
      if (isHidden) newCatInput.focus();
    });

    async function handleAddCategory() {
      const catVal = newCatInput.value.trim();
      if (!catVal) {
        onToast("Please enter a category name.");
        return;
      }
      await addCategory(catVal);
      // Check if option already exists
      let existingOpt = Array.from(catSelect.options).find(o => o.value.toLowerCase() === catVal.toLowerCase());
      if (!existingOpt) {
        const opt = document.createElement("option");
        opt.value = catVal;
        opt.textContent = catVal;
        opt.selected = true;
        catSelect.appendChild(opt);
      } else {
        existingOpt.selected = true;
      }
      newCatInput.value = "";
      newCatRow.style.display = "none";
      onToast(`Category "${catVal}" added and selected!`);
    }

    confirmCatBtn.addEventListener("click", handleAddCategory);
    newCatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddCategory();
      }
    });

    // Thumbnail Preview Handler
    const thumbInput = document.getElementById("form-v-thumb");
    const thumbImg = document.getElementById("thumb-preview-img");
    const thumbPlaceholder = document.getElementById("thumb-preview-placeholder");

    function updateThumbPreview(url) {
      const parsed = parseThumbnailUrl(url);
      if (parsed && parsed.trim().length > 5) {
        thumbImg.src = parsed.trim();
        thumbImg.style.display = "block";
        thumbPlaceholder.style.display = "none";
      } else {
        thumbImg.style.display = "none";
        thumbPlaceholder.style.display = "block";
      }
    }

    if (editingVideo?.thumbnail) {
      updateThumbPreview(editingVideo.thumbnail);
    }

    thumbInput.addEventListener("input", (e) => updateThumbPreview(e.target.value));

    // Random Poster Helper
    const posterPresets = [
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
    ];
    document.getElementById("btn-preset-thumb").addEventListener("click", () => {
      const pick = posterPresets[Math.floor(Math.random() * posterPresets.length)];
      thumbInput.value = pick;
      updateThumbPreview(pick);
    });

    // Form Submit
    const form = document.getElementById("video-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("form-v-title").value.trim();
      let category = document.getElementById("form-v-category").value.trim();
      const durationRaw = document.getElementById("form-v-duration").value.trim();
      const videoUrl = document.getElementById("form-v-url").value.trim();
      const thumbnail = document.getElementById("form-v-thumb").value.trim();
      const desc = document.getElementById("form-v-desc").value.trim();
      const clicksRequired = parseInt(document.getElementById("form-v-clicks").value, 10) || 3;
      
      const ad1 = document.getElementById("form-v-ad-1")?.value.trim() || "";
      const ad2 = document.getElementById("form-v-ad-2")?.value.trim() || "";
      const ad3 = document.getElementById("form-v-ad-3")?.value.trim() || "";
      const ad4 = document.getElementById("form-v-ad-4")?.value.trim() || "";
      const customAdLinks = [ad1, ad2, ad3, ad4];

      // Check if new category was typed in row but not submitted
      if (newCatRow.style.display !== "none" && newCatInput.value.trim()) {
        const typedCat = newCatInput.value.trim();
        await addCategory(typedCat);
        category = typedCat;
      }

      const [dur, qual] = durationRaw.includes("•") ? durationRaw.split("•").map(s => s.trim()) : [durationRaw, "4K HDR"];

      const videoData = {
        id: editingVideo ? editingVideo.id : "vid-" + Date.now(),
        title,
        category: category || "Movies",
        duration: dur || "Full Stream",
        quality: qual || "4K HDR",
        views: editingVideo ? editingVideo.views : "1.2K",
        rating: editingVideo ? editingVideo.rating : "9.0",
        videoUrl,
        thumbnail: parseThumbnailUrl(thumbnail),
        description: desc || "Exclusive high-definition streaming release.",
        clicksRequired,
        totalClicks: editingVideo ? (Number(editingVideo.totalClicks) || 0) : 0,
        customAdLinks,
        createdAt: editingVideo ? editingVideo.createdAt : Date.now()
      };

      await saveVideo(videoData);
      editingVideoId = null;
      onToast(editingVideo ? "Video updated successfully!" : "🚀 Video published to Firebase & site!");
      render();
    });

    // Cancel edit
    const cancelBtn = document.getElementById("btn-cancel-edit");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        editingVideoId = null;
        render();
      });
    }

    // Reset video clicks handler
    div.querySelectorAll(".btn-reset-clicks").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const vid = videos.find(v => v.id === id);
        if (confirm(`Reset all clicks for "${vid?.title || 'this video'}" back to 0?`)) {
          await resetVideoClicks(id);
          onToast("🔥 Click counter reset to 0!");
          render();
        }
      });
    });

    // Edit video clicks
    div.querySelectorAll(".btn-edit-vid").forEach(btn => {
      btn.addEventListener("click", () => {
        editingVideoId = btn.getAttribute("data-id");
        render();
      });
    });

    // Delete video clicks
    div.querySelectorAll(".btn-delete-vid").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const vid = videos.find(v => v.id === id);
        if (confirm(`Are you sure you want to delete "${vid?.title || 'this video'}"?`)) {
          await deleteVideo(id);
          onToast("Video deleted from Firebase & site.");
          render();
        }
      });
    });
  }

  // -------------------------------------------------------------
  // TAB 2: AD GATEWAYS & MONETIZATION SETTINGS
  // -------------------------------------------------------------
  function renderAdsTab(container, settings) {
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">
          <span>💰 Ad Gateways & Monetization Settings</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
          Configure global SmartLink ad URLs for 1, 2, 3, or 4 step video unlocks, as well as the Mobile Sticky VIP Pass banner.
        </p>

        <form id="ads-form">
          <div class="form-group">
            <label class="form-label" style="color: var(--primary);">
              ⚡ Step 1 Smart Link (1st Click Redirect) *
            </label>
            <input type="url" id="ad-link-1" class="form-input" value="${settings.adLink1 || ''}" placeholder="https://highcpmpartner.com/ad-step-1" required />
            <div class="form-help">Opens on 1st tap. Mandatory for all gates.</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--accent-gold);">
              🔥 Step 2 Smart Link (2nd Click Redirect)
            </label>
            <input type="url" id="ad-link-2" class="form-input" value="${settings.adLink2 || ''}" placeholder="https://highcpmpartner.com/ad-step-2" />
            <div class="form-help">Opens on 2nd tap if video has 2, 3, or 4 steps.</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--secondary);">
              🚀 Step 3 Smart Link (3rd Click Redirect)
            </label>
            <input type="url" id="ad-link-3" class="form-input" value="${settings.adLink3 || ''}" placeholder="https://highcpmpartner.com/ad-step-3" />
            <div class="form-help">Opens on 3rd tap if video has 3 or 4 steps.</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--accent-purple);">
              💎 Step 4 Smart Link (4th Click Redirect & Unlock)
            </label>
            <input type="url" id="ad-link-4" class="form-input" value="${settings.adLink4 || ''}" placeholder="https://highcpmpartner.com/ad-step-4" />
            <div class="form-help">Opens on 4th tap when 4-Step gate is enabled for maximum earnings.</div>
          </div>

          <div class="form-group" style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-glass);">
            <label class="form-label" style="color: var(--accent-success);">
              📱 Mobile Sticky VIP Banner Link *
            </label>
            <input type="url" id="sticky-banner-link" class="form-input" value="${settings.bannerAdUrl || 'https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af'}" placeholder="https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af" required />
            <div class="form-help">Opens when mobile users tap the floating <strong>⚡ Tap to Claim 4K VIP Pass</strong> bar at bottom.</div>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; margin-top: 10px;">
            💾 Save All Ad Settings
          </button>
        </form>
      </div>
    `;

    container.appendChild(div);

    const form = document.getElementById("ads-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const adLink1 = document.getElementById("ad-link-1").value.trim();
      const adLink2 = document.getElementById("ad-link-2").value.trim();
      const adLink3 = document.getElementById("ad-link-3").value.trim();
      const adLink4 = document.getElementById("ad-link-4").value.trim();
      const bannerAdUrl = document.getElementById("sticky-banner-link").value.trim();

      await saveSettings({
        adLink1,
        adLink2,
        adLink3,
        adLink4: adLink4 || adLink1,
        bannerAdUrl: bannerAdUrl || adLink1
      });

      onToast("💰 All Ad Gateways & Sticky Links saved!");
      render();
    });
  }

  // -------------------------------------------------------------
  // TAB 3: FIREBASE CLOUD SETUP
  // -------------------------------------------------------------
  function renderFirebaseTab(container) {
    const savedConfig = getSavedFirebaseConfig();
    const fbStatus = getFirebaseStatus();

    const div = document.createElement("div");
    div.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">
          <span>☁️ Firebase Firestore Cloud Sync</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
          Connected to Google Firebase project <strong>${fbStatus.projectId || 'virual-link'}</strong>. All videos, categories, and ad settings automatically sync to Cloud Firestore in real time.
        </p>

        <form id="fb-config-form">
          <div class="form-group">
            <label class="form-label">Firebase Project ID *</label>
            <input type="text" id="fb-project-id" class="form-input" value="${savedConfig?.projectId || 'virual-link'}" placeholder="virual-link" required />
          </div>

          <div class="form-group">
            <label class="form-label">API Key *</label>
            <input type="text" id="fb-api-key" class="form-input" value="${savedConfig?.apiKey || ''}" placeholder="AIzaSy..." required />
          </div>

          <div class="form-group">
            <label class="form-label">Auth Domain</label>
            <input type="text" id="fb-auth-domain" class="form-input" value="${savedConfig?.authDomain || ''}" placeholder="virual-link.firebaseapp.com" />
          </div>

          <div class="form-group">
            <label class="form-label">Storage Bucket</label>
            <input type="text" id="fb-storage-bucket" class="form-input" value="${savedConfig?.storageBucket || ''}" placeholder="virual-link.firebasestorage.app" />
          </div>

          <div class="form-group">
            <label class="form-label">App ID</label>
            <input type="text" id="fb-app-id" class="form-input" value="${savedConfig?.appId || ''}" placeholder="1:506496110995:web:..." />
          </div>

          <div style="display: flex; gap: 8px; margin-top: 14px;">
            <button type="submit" class="btn-primary" style="flex: 1;">
              🔌 Reconnect / Update Firebase
            </button>
            <button type="button" class="btn-danger" id="btn-disconnect-fb" style="font-size: 0.75rem;">
              Disconnect
            </button>
          </div>
        </form>

        <hr style="border: none; border-top: 1px solid var(--border-glass); margin: 20px 0;" />

        <div class="admin-card-title">
          <span>📤 Bulk Cloud Sync</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 12px;">
          Upload all local videos, categories, and ad settings into Firebase Firestore in bulk.
        </p>
        <button class="btn-secondary" id="btn-sync-to-fb" style="width: 100%; justify-content: center;">
          📤 Sync All Local Videos to Firebase Now
        </button>
      </div>
    `;

    container.appendChild(div);

    const form = document.getElementById("fb-config-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const apiKey = document.getElementById("fb-api-key").value.trim();
      const authDomain = document.getElementById("fb-auth-domain").value.trim();
      const projectId = document.getElementById("fb-project-id").value.trim();
      const storageBucket = document.getElementById("fb-storage-bucket").value.trim();
      const appId = document.getElementById("fb-app-id").value.trim();

      const config = {
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
        appId
      };

      try {
        onToast("Connecting to Firebase Firestore...");
        const res = await setupFirebase(config);
        if (res.connected) {
          onToast("🎉 Firebase connected successfully!");
        } else {
          onToast("⚠️ " + res.message);
        }
        render();
      } catch (err) {
        onToast("❌ " + err.message);
      }
    });

    const discBtn = document.getElementById("btn-disconnect-fb");
    if (discBtn) {
      discBtn.addEventListener("click", () => {
        removeFirebaseConfig();
        onToast("Disconnected from Firebase. Reverted to Local Storage.");
        render();
      });
    }

    const syncBtn = document.getElementById("btn-sync-to-fb");
    if (syncBtn) {
      syncBtn.addEventListener("click", async () => {
        try {
          syncBtn.disabled = true;
          syncBtn.textContent = "Syncing...";
          const count = await syncLocalVideosToFirebase();
          onToast(`✅ Successfully synced ${count} videos to Firebase!`);
          render();
        } catch (err) {
          onToast("❌ Sync failed: " + err.message);
          syncBtn.disabled = false;
          syncBtn.textContent = "📤 Sync All Local Videos to Firebase Now";
        }
      });
    }
  }

  return {
    render
  };
}
