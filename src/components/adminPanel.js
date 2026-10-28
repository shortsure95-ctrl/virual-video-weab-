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
  clearAdminSession
} from "../storage.js";
import { parseVideoUrl, parseThumbnailUrl } from "../utils/googleDrive.js";
import { auth, googleProvider, signInWithPopup, signOut } from "../firebase.js";

/**
 * Admin Panel Component (/admin)
 */
export function createAdminPanel({ container, onToast, onNavigateHome }) {
  let activeTab = "videos"; // 'videos' | 'ads' | 'firebase'
  let editingVideoId = null;

  async function render() {
    container.innerHTML = "";

    const settings = await fetchSettings();
    // If not authenticated as axelboyus@gmail.com, immediately redirect home (no login UI)
    if (!isAuthenticated) {
      if (onNavigateHome) onNavigateHome();
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

          <!-- OPTIONAL CUSTOM AD OVERRIDE -->
          <div class="form-group" style="padding: 12px; background: rgba(255,42,95,0.06); border: 1px solid rgba(255,42,95,0.2); border-radius: var(--radius-sm);">
            <label class="form-label" style="color: var(--primary);">Custom Ad Link for This Video (Optional)</label>
            <input type="url" id="form-v-ad" class="form-input" placeholder="Leave empty to use Global 3-Step Ad Links" value="${editingVideo?.customAdLinks?.[0] || ''}" />
            <div class="form-help">
              If left blank, clicks will automatically open your global 3-Step ad links configured in <strong>Ad Gateways</strong>.
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button type="submit" class="btn-primary" style="flex: 1;">
              ${editingVideo ? '💾 Save Changes' : '🚀 Publish Video'}
            </button>
          </div>
        </form>
      </div>

      <!-- EXISTING VIDEOS LIST -->
      <div class="admin-card">
        <div class="admin-card-title">
          <span>Uploaded Videos (${videos.length})</span>
        </div>

        <div class="admin-video-list" id="admin-video-list">
          ${videos.length === 0 ? '<p style="color: var(--text-dim); text-align: center; padding: 20px;">No videos uploaded yet. Add your first video above!</p>' : ''}
          ${videos.map(v => `
            <div class="admin-video-item" data-id="${v.id}">
              <img src="${v.thumbnail}" class="admin-video-thumb" alt="${v.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&q=80'" />
              <div class="admin-video-info">
                <div class="admin-video-title">${v.title}</div>
                <div class="admin-video-meta">
                  <span style="color: var(--secondary);">${v.category || 'Movies'}</span>
                  <span>•</span>
                  <span>${v.duration || 'Full Stream'}</span>
                  <span>•</span>
                  <span style="background: rgba(255, 183, 3, 0.15); border: 1px solid rgba(255, 183, 3, 0.35); color: var(--accent-gold); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">
                    🔥 ${v.totalClicks || 0} Clicks
                  </span>
                </div>
              </div>
              <div class="admin-actions">
                <button class="btn-secondary btn-edit-vid" data-id="${v.id}" style="padding: 4px 8px; font-size: 0.72rem;" title="Edit">
                  ✏️ Edit
                </button>
                <button class="btn-danger btn-delete-vid" data-id="${v.id}" style="padding: 4px 8px; font-size: 0.72rem;" title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          `).join('')}
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
      const customAd = document.getElementById("form-v-ad").value.trim();

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
        clicksRequired: 3,
        totalClicks: editingVideo ? (Number(editingVideo.totalClicks) || 0) : 0,
        customAdLinks: customAd ? [customAd, customAd, customAd] : [],
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
  // TAB 2: 3-STEP AD GATEWAY SETTINGS
  // -------------------------------------------------------------
  function renderAdsTab(container, settings) {
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-title">
          <span>💰 3-Step Ad Redirection System</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.4;">
          When a user clicks "Watch Video", the system requires 3 clicks to unlock. 
          Configure the exact ad URLs or affiliate links that open on each step.
        </p>

        <form id="ads-form">
          <div class="form-group">
            <label class="form-label" style="color: var(--primary);">
              ⚡ Step 1 Ad Link (1st Click Redirect) *
            </label>
            <input type="url" id="ad-link-1" class="form-input" value="${settings.adLink1 || ''}" placeholder="https://highcpmpartner.com/ad-step-1" required />
            <div class="form-help">Opens on 1st tap. Progress moves to 33%.</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--accent-gold);">
              🔥 Step 2 Ad Link (2nd Click Redirect) *
            </label>
            <input type="url" id="ad-link-2" class="form-input" value="${settings.adLink2 || ''}" placeholder="https://highcpmpartner.com/ad-step-2" required />
            <div class="form-help">Opens on 2nd tap. Progress moves to 66%.</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: var(--secondary);">
              🚀 Step 3 Ad Link (3rd Final Click Redirect & Unlock) *
            </label>
            <input type="url" id="ad-link-3" class="form-input" value="${settings.adLink3 || ''}" placeholder="https://highcpmpartner.com/ad-step-3" required />
            <div class="form-help">Opens on 3rd tap, then <strong>instantly unlocks</strong> the Google Drive video player!</div>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; margin-top: 10px;">
            💾 Save Ad Settings
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

      await saveSettings({
        adLink1,
        adLink2,
        adLink3
      });

      onToast("💰 Ad Gateways saved to Firebase!");
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
