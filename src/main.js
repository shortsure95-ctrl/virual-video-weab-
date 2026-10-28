import { 
  initializeFirebaseFromStorage, 
  fetchVideos, 
  fetchSettings,
  fetchCategories,
  subscribeToRealtimeData,
  SUPER_ADMIN_EMAIL,
  isEmailAuthorizedAdmin,
  getCurrentAdminEmail,
  isCurrentlyAdminAuthenticated,
  setAdminSession,
  clearAdminSession,
  getUserReferralCode,
  getReferralCount,
  recordReferralVisit,
  getUserTelegramUsername,
  setUserTelegramUsername
} from "./storage.js";
import { createVideoUnlockModal } from "./components/videoUnlockModal.js";
import { createAdminPanel } from "./components/adminPanel.js";
import { auth, onAuthStateChanged } from "./firebase.js";

// Global Application State
let currentVideos = [];
let currentSettings = {};
let currentCategories = [];
let currentCategory = "All";
let searchQuery = "";
let currentRoute = "home"; // 'home' | 'me' | 'admin'

const appMain = document.getElementById("app-main");
const toastContainer = document.getElementById("toast-container");

// Toast Notification Utility
export function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>💬</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 3-Step Unlock Modal instance
const unlockModal = createVideoUnlockModal({
  onToast: showToast
});

// Register Service Worker for PWA (relative path for GitHub Pages)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      console.log("PWA Service Worker registered:", reg.scope);
    }).catch((err) => {
      console.warn("PWA Service Worker registration skipped:", err);
    });
  });
}

// Deferred PWA Install Prompt Handler
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  
  const headerInstallBtn = document.getElementById("btn-header-install");
  if (headerInstallBtn) {
    headerInstallBtn.style.display = "inline-flex";
  }
});

function triggerPWAInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choice) => {
      if (choice.outcome === "accepted") {
        showToast("🎉 Installing Viral Videos App...");
      }
      deferredInstallPrompt = null;
      const headerInstallBtn = document.getElementById("btn-header-install");
      if (headerInstallBtn) headerInstallBtn.style.display = "none";
    });
  } else {
    showToast("📲 Tap browser menu (⋮ or Share) then select 'Add to Home screen'");
  }
}

// Admin Panel Instance
const adminPanel = createAdminPanel({
  container: appMain,
  onToast: showToast,
  onNavigateHome: () => navigateTo("home")
});

/**
 * Route Navigator (supports URL bar /admin and normal tabs)
 * Instant 0ms tab switching between Home and Me
 */
function navigateTo(route) {
  currentRoute = route;

  if (route === "admin") {
    // 1. Check for passkey in URL: #/admin?auth=axelboyus or ?auth=axelboyus
    const urlParams = new URLSearchParams(window.location.search);
    const hashParts = (window.location.hash || "").split("?");
    const hashParams = new URLSearchParams(hashParts[1] || "");
    const authKey = (urlParams.get("auth") || urlParams.get("key") || hashParams.get("auth") || hashParams.get("key") || "").toLowerCase();

    if (authKey === "axelboyus" || authKey === "axelboyus@gmail.com" || authKey === "1234") {
      setAdminSession(SUPER_ADMIN_EMAIL);
      showToast("👑 Admin access unlocked for this browser!");
      window.history.replaceState(null, "", window.location.pathname + "#/admin");
    }

    // 2. Check if Firebase Auth is signed into axelboyus@gmail.com
    if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      setAdminSession(SUPER_ADMIN_EMAIL);
    }

    // 3. Verify if this browser has access
    const hasAccess = isCurrentlyAdminAuthenticated();

    if (hasAccess) {
      if (!window.location.hash.includes("admin")) {
        window.location.hash = "/admin";
      }
      updateNavSelection("admin");
      adminPanel.render();
    } else {
      // Unauthorized browser: Immediately redirect to home without showing login page!
      showToast("⛔ Access Denied: Admin authorization required. Redirecting...");
      if (window.location.hash.includes("admin")) {
        window.location.hash = "/";
      }
      currentRoute = "home";
      updateNavSelection("home");
      renderHomeView();
    }
  } else if (route === "me") {
    if (window.location.hash.includes("admin")) {
      window.location.hash = "/me";
    }
    updateNavSelection("me");
    renderMeView();
  } else {
    if (window.location.hash.includes("admin") || window.location.hash.includes("me")) {
      window.location.hash = "/";
    }
    updateNavSelection("home");
    renderHomeView();
  }
}

function updateNavSelection(route) {
  // Mobile bottom nav
  const navHome = document.getElementById("nav-home");
  const navMe = document.getElementById("nav-me");

  if (navHome) navHome.classList.toggle("active", route === "home");
  if (navMe) navMe.classList.toggle("active", route === "me");

  // Desktop header nav
  document.querySelectorAll(".d-nav-item").forEach(btn => {
    const r = btn.getAttribute("data-route");
    btn.classList.toggle("active", r === route);
  });
}

function getCategoryIcon(catName) {
  const c = catName.toLowerCase();
  if (c.includes("trend")) return "🔥";
  if (c.includes("movie") || c.includes("film")) return "🎬";
  if (c.includes("reel") || c.includes("short")) return "⚡";
  if (c.includes("action")) return "💥";
  if (c.includes("horror") || c.includes("scary")) return "👻";
  if (c.includes("comedy") || c.includes("funny")) return "😂";
  if (c.includes("anime")) return "🍙";
  if (c.includes("series") || c.includes("tv")) return "📺";
  return "🍿";
}

/**
 * Render the Clean Mobile Cinema Homepage View
 * Instantaneous rendering using in-memory cache
 */
function renderHomeView() {
  if (!currentVideos || currentVideos.length === 0) {
    try {
      const cached = localStorage.getItem("adstraw_videos_v1");
      if (cached) currentVideos = JSON.parse(cached);
    } catch (e) {}
  }
  if (!currentCategories || currentCategories.length === 0) {
    currentCategories = ["Trending", "Movies", "Viral Reels", "Action", "Horror"];
  }

  appMain.innerHTML = `
    <!-- Search Bar -->
    <div class="search-container">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          id="main-search-input" 
          class="search-input" 
          placeholder="Search movies, viral clips, reels..." 
          value="${searchQuery}" 
        />
        ${searchQuery ? '<button id="clear-search" style="background:none;border:none;color:var(--text-muted);cursor:pointer;">✕</button>' : ''}
      </div>
    </div>

    <!-- Stories / Quick Reels Circles -->
    <div class="stories-section">
      <div class="stories-track">
        ${currentVideos.slice(0, 8).map(v => `
          <div class="story-item" data-id="${v.id}">
            <div class="story-ring">
              <img src="${v.thumbnail}" class="story-avatar" alt="${v.title}" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&q=80'" />
              <span class="story-badge">PLAY</span>
            </div>
            <span class="story-name">${v.title.split(":")[0]}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 1st Image: Dynamic Categories Filter Bar -->
    <div class="categories-bar">
      <button class="category-pill ${currentCategory === 'All' ? 'active' : ''}" data-cat="All">All Streams</button>
      ${currentCategories.map(cat => `
        <button class="category-pill ${currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" data-cat="${cat}">
          ${getCategoryIcon(cat)} ${cat}
        </button>
      `).join('')}
    </div>

    <!-- Adsterra Native Banner Unit -->
    <div class="native-banner-container" id="native-banner-wrapper">
      <div id="container-d62c8dd228076739fc5123b0c9cb8692"></div>
    </div>

    <!-- Video Grid Section (Directly under categories) -->
    <div class="section-header" style="margin-top: 14px;">
      <h2 class="section-title">
        <span>🎬</span>
        <span>${currentCategory === 'All' ? 'Recommended Streams' : currentCategory}</span>
      </h2>
      <span class="section-count" id="video-count">Showing ${getFilteredVideos().length} videos</span>
    </div>

    <div class="video-grid" id="video-grid">
      ${renderVideoCards()}
    </div>
  `;

  attachHomeEventListeners();
  loadNativeBannerAd();
}

function loadNativeBannerAd() {
  const container = document.getElementById("container-d62c8dd228076739fc5123b0c9cb8692");
  if (!container) return;

  // Remove existing script if re-rendering view
  const oldScript = document.getElementById("adsterra-native-banner-script");
  if (oldScript) oldScript.remove();

  const script = document.createElement("script");
  script.id = "adsterra-native-banner-script";
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  script.src = "https://biomanos.org/21/d62c8dd228076739fc5123b0c9cb8692";
  container.parentNode.appendChild(script);
}

function getFilteredVideos() {
  return currentVideos.filter(v => {
    const matchesCat = currentCategory === "All" || 
      (v.category && v.category.toLowerCase() === currentCategory.toLowerCase()) || 
      (v.tags && v.tags.some(t => t.toLowerCase() === currentCategory.toLowerCase()));
    
    const matchesSearch = !searchQuery || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.category && v.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCat && matchesSearch;
  });
}

function renderVideoCards() {
  const filtered = getFilteredVideos();
  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">🎬</div>
        <h3 style="font-size: 1rem; margin-bottom: 4px;">No videos found</h3>
        <p style="font-size: 0.78rem;">Try searching for another movie title or tap 'All Streams'.</p>
      </div>
    `;
  }

  return filtered.map(v => `
    <div class="video-card" data-id="${v.id}">
      <div class="card-poster">
        <img src="${v.thumbnail}" class="card-img" alt="${v.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80'" />
        <span class="card-badge-top-left">${v.quality || 'HD 1080p'}</span>
        <span class="card-badge-top-right">${v.clicksRequired || 3} Step${(v.clicksRequired || 3) > 1 ? 's' : ''}</span>
        <div class="card-play-overlay">
          <div class="play-circle">▶</div>
        </div>
      </div>
      <div class="card-details">
        <h3 class="card-title">${v.title}</h3>
        <div class="card-meta-row">
          <span class="card-tag">${v.category || 'Movies'}</span>
          <span class="card-views">🔥 ${v.totalClicks ? `${v.totalClicks} clicks` : (v.views || '1.2M')}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function attachHomeEventListeners() {
  // Search input
  const searchInput = document.getElementById("main-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      document.getElementById("video-grid").innerHTML = renderVideoCards();
      document.getElementById("video-count").textContent = `Showing ${getFilteredVideos().length} videos`;
      attachCardClickListeners();
    });
  }

  const clearBtn = document.getElementById("clear-search");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchQuery = "";
      renderHomeView();
    });
  }

  // Category pills
  document.querySelectorAll(".category-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      currentCategory = pill.getAttribute("data-cat");
      document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      document.getElementById("video-grid").innerHTML = renderVideoCards();
      document.getElementById("video-count").textContent = `Showing ${getFilteredVideos().length} videos`;
      attachCardClickListeners();
    });
  });

  // Story reels click
  document.querySelectorAll(".story-item").forEach(item => {
    item.addEventListener("click", () => {
      const vidId = item.getAttribute("data-id");
      const video = currentVideos.find(v => v.id === vidId);
      if (video) {
        unlockModal.openModal(video, currentSettings);
      }
    });
  });

  attachCardClickListeners();
}

function attachCardClickListeners() {
  document.querySelectorAll(".video-card").forEach(card => {
    card.addEventListener("click", () => {
      const vidId = card.getAttribute("data-id");
      const video = currentVideos.find(v => v.id === vidId);
      if (video) {
        unlockModal.openModal(video, currentSettings);
      }
    });
  });
}

/**
 * Minimal & Clean "Me" Screen
 * ONLY Copy Link and Contact Admin (Admin access completely removed)
 * Synchronous instant render
 */
function renderMeView() {
  const refCode = getUserReferralCode();
  const officialTg = (currentSettings.contactTelegram || "axelboyus").replace("@", "");
  const referralLink = `${window.location.origin}/?ref=${refCode}`;

  appMain.innerHTML = `
    <div class="me-container" style="max-width: 520px; margin: 0 auto; gap: 14px; padding-top: 24px;">
      
      <!-- 1. COPY LINK -->
      <div class="me-card">
        <div class="me-card-header">
          <div class="me-card-icon">🔗</div>
          <div>
            <h3 class="me-card-title">Copy Link</h3>
            <p class="me-card-subtitle">Your personal referral invite link</p>
          </div>
        </div>

        <div class="referral-box">
          <div class="referral-link-input-wrap">
            <input type="text" id="referral-url-input" class="referral-input" readonly value="${referralLink}" />
            <button id="btn-copy-ref" class="btn-copy-ref">
              <span>📋</span> <span id="copy-btn-text">Copy Link</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. CONTACT ADMIN -->
      <div class="me-card">
        <div class="me-card-header">
          <div class="me-card-icon" style="background: rgba(0, 136, 204, 0.15); color: #0088cc;">✈️</div>
          <div>
            <h3 class="me-card-title">Contact Admin</h3>
            <p class="me-card-subtitle">Direct message & 24/7 support on Telegram</p>
          </div>
        </div>

        <a href="https://t.me/${officialTg}" target="_blank" rel="noopener noreferrer" class="btn-join-telegram" style="justify-content: center; gap: 10px;">
          <span>✈️</span> <span>Contact Admin (@${officialTg})</span> <span>→</span>
        </a>
      </div>

    </div>
  `;

  attachMeEventListeners(referralLink);
}

function attachMeEventListeners(referralLink) {
  // Copy Link button
  const copyBtn = document.getElementById("btn-copy-ref");
  const copyText = document.getElementById("copy-btn-text");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(referralLink).then(() => {
        if (copyText) copyText.textContent = "Copied!";
        showToast("🎉 Link copied to clipboard!");
        setTimeout(() => {
          if (copyText) copyText.textContent = "Copy Link";
        }, 2000);
      }).catch(() => {
        const inp = document.getElementById("referral-url-input");
        if (inp) {
          inp.select();
          document.execCommand("copy");
        }
        showToast("🎉 Link copied!");
      });
    });
  }
}

// Global Nav Event Bindings
function initGlobalEvents() {
  // Brand click -> Homepage
  const brand = document.getElementById("brand-link");
  if (brand) brand.addEventListener("click", () => navigateTo("home"));

  // Bottom Nav items (Home and Me)
  const navHome = document.getElementById("nav-home");
  if (navHome) {
    navHome.addEventListener("click", () => {
      currentCategory = "All";
      navigateTo("home");
    });
  }

  const navMe = document.getElementById("nav-me");
  if (navMe) {
    navMe.addEventListener("click", () => {
      navigateTo("me");
    });
  }

  // Desktop Header Nav items
  document.querySelectorAll(".d-nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const r = btn.getAttribute("data-route");
      if (r === "home") currentCategory = "All";
      navigateTo(r);
    });
  });

  // Handle URL navigation (hashchange + popstate for /admin, /me, /)
  window.addEventListener("hashchange", handleHashRoute);
  window.addEventListener("popstate", handleHashRoute);
}

function handleHashRoute() {
  const hash = (window.location.hash || "").toLowerCase();
  const path = (window.location.pathname || "").toLowerCase().replace(/\/$/, "");
  
  if (hash === "#/admin" || hash === "#admin" || path === "/admin") {
    navigateTo("admin");
  } else if (hash === "#/me" || hash === "#me" || path === "/me") {
    navigateTo("me");
  } else {
    navigateTo("home");
  }
}

/**
 * Animated Live Watcher Counter (Social Proof)
 * Fluctuates naturally between 1,350 and 1,890 viewers
 */
function startLiveWatcherCounter() {
  const countEl = document.getElementById("live-watcher-count");
  if (!countEl) return;

  let currentCount = 1482;

  setInterval(() => {
    const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4
    currentCount = Math.max(1340, Math.min(1890, currentCount + delta));
    countEl.classList.add("count-update");
    countEl.textContent = currentCount.toLocaleString();
    setTimeout(() => countEl.classList.remove("count-update"), 400);
  }, 4800);
}

/**
 * Mobile Sticky Smart Link VIP Bar
 */
function initStickySmartLinkBar() {
  const bar = document.getElementById("sticky-smartlink-bar");
  const closeBtn = document.getElementById("sticky-bar-close");
  if (!bar) return;

  // Check if user dismissed it in this browser session
  if (sessionStorage.getItem("dismissed_sticky_bar") === "true") {
    bar.style.display = "none";
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      bar.style.opacity = "0";
      bar.style.transform = "translateY(20px)";
      setTimeout(() => {
        bar.style.display = "none";
      }, 300);
      sessionStorage.setItem("dismissed_sticky_bar", "true");
    });
  }

  updateStickySmartLinkHref();
}

function updateStickySmartLinkHref() {
  const btn = document.getElementById("sticky-smartlink-btn");
  if (btn) {
    btn.href = currentSettings.bannerAdUrl || currentSettings.adLink1 || "https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af";
  }
}

// Application Startup
async function init() {
  initGlobalEvents();
  startLiveWatcherCounter();
  initStickySmartLinkBar();

  // Header PWA Install Button
  const headerInstallBtn = document.getElementById("btn-header-install");
  if (headerInstallBtn) {
    headerInstallBtn.addEventListener("click", () => triggerPWAInstall());
  }

  // Check URL for referral parameter
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      await recordReferralVisit(ref);
    }
  } catch (e) {
    console.warn("Referral tracking skipped:", e);
  }

  // Initialize Firebase (or local storage fallback)
  await initializeFirebaseFromStorage();

  // Load initial videos & settings into in-memory cache
  try {
    currentVideos = await fetchVideos();
    currentSettings = await fetchSettings();
    currentCategories = await fetchCategories();
    updateStickySmartLinkHref();
  } catch (e) {
    console.warn("Initial data load note:", e);
  }

  // Setup real-time listeners for instant synchronization across devices
  subscribeToRealtimeData({
    onVideosChange: (newVideos) => {
      currentVideos = newVideos;
      if (currentRoute === "home") {
        document.getElementById("video-grid").innerHTML = renderVideoCards();
        const countEl = document.getElementById("video-count");
        if (countEl) countEl.textContent = `Showing ${getFilteredVideos().length} videos`;
        attachCardClickListeners();
      }
    },
    onSettingsChange: (newSettings) => {
      currentSettings = newSettings;
      updateStickySmartLinkHref();
      if (currentRoute === "home") {
        renderHomeView();
      } else if (currentRoute === "me") {
        renderMeView();
      }
    }
  });

  // Automatically detect if browser is logged into axelboyus@gmail.com via Firebase Auth
  onAuthStateChanged(auth, (user) => {
    if (user && user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      setAdminSession(SUPER_ADMIN_EMAIL);
      if (currentRoute === "admin") {
        adminPanel.render();
      }
    }
  });

  // Check initial route
  handleHashRoute();
}

init();
