import { parseVideoUrl } from "../utils/googleDrive.js";
import { recordVideoClick } from "../storage.js";

/**
 * Dynamic 1-Step to 4-Step Ad Monetization Video Unlock Modal
 * Includes:
 * 1. 📥 Fake 4K Download Button (High-CTR Mirror)
 * 2. ⏱️ 5-Second Stream Generator Countdown with "Skip Wait" SmartLink Trigger
 * 3. 💬 Social Proof Verified Comments & Interactive Review Form
 */

export function createVideoUnlockModal({ onToast }) {
  let activeVideo = null;
  let currentStep = 0; // 0 = not started, up to totalSteps
  let globalSettings = {};
  let generatorTimer = null;
  let generatorSeconds = 5;

  // Preloaded verified viewer comments
  const defaultComments = [
    {
      id: "c-1",
      author: "Alex Miller",
      country: "🇺🇸 USA",
      avatar: "AM",
      avatarBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
      time: "4m ago",
      text: "Finally found the full uncut video in 1080p, thanks! Sound quality is unreal. ❤️"
    },
    {
      id: "c-2",
      author: "Sarah Jenkins",
      country: "🇬🇧 UK",
      avatar: "SJ",
      avatarBg: "linear-gradient(135deg, #ec4899, #be185d)",
      time: "12m ago",
      text: "Step verification took 5 seconds on my iPhone and it unlocked the full Drive player. Legit!"
    },
    {
      id: "c-3",
      author: "David Ramos",
      country: "🇨🇦 Canada",
      avatar: "DR",
      avatarBg: "linear-gradient(135deg, #10b981, #047857)",
      time: "28m ago",
      text: "Fastest 4K stream I've watched all week. 0 buffering even on mobile data."
    },
    {
      id: "c-4",
      author: "Jessica L.",
      country: "🇦🇺 Australia",
      avatar: "JL",
      avatarBg: "linear-gradient(135deg, #f59e0b, #d97706)",
      time: "45m ago",
      text: "Saved me $20 on cinema tickets tonight. 10/10 recommendation!"
    }
  ];

  let commentsList = [...defaultComments];

  // Inject modal markup into body if not already present
  let modalEl = document.getElementById("adstraw-unlock-modal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "adstraw-unlock-modal";
    modalEl.className = "modal-backdrop";
    modalEl.innerHTML = `
      <div class="modal-box" id="modal-box">
        <button class="modal-close-btn" id="modal-close" title="Close">✕</button>
        
        <div class="modal-preview-media" id="modal-media-container">
          <!-- Poster or Iframe will be injected here -->
        </div>

        <div class="modal-body">
          <div class="modal-header-info">
            <div class="modal-badges" id="modal-badges"></div>
            <h2 class="modal-title" id="modal-title"></h2>
            <p class="modal-desc" id="modal-desc"></p>
          </div>

          <!-- 1. 📥 HIGH-CTR FAKE 4K DOWNLOAD BAR -->
          <div class="download-mirror-card" id="download-mirror-card">
            <div class="dl-info">
              <span class="dl-badge">4K ULTRA HD</span>
              <div class="dl-text">
                <strong id="dl-filename">Download Full 4K Movie File</strong>
                <span id="dl-filesize">1.42 GB • Fast Cloud CDN Mirror</span>
              </div>
            </div>
            <button class="btn-fake-download" id="btn-fake-download" title="Download Full High Definition Stream">
              <span>📥</span>
              <span id="btn-fake-download-text">Download 4K (1.4 GB)</span>
            </button>
          </div>

          <!-- AD MONETIZATION FUNNEL (1, 2, 3, or 4 Steps) -->
          <div class="unlock-funnel-card" id="unlock-card">
            <div class="funnel-header">
              <span class="funnel-status-label" id="funnel-status-label">
                <span style="color: var(--primary);">🔒</span> Video Locked
              </span>
              <span class="step-indicator-pill" id="step-pill">Step 0 of 3</span>
            </div>

            <!-- Dynamic Visual Nodes Container -->
            <div class="step-nodes" id="step-nodes-container">
              <div class="step-nodes-progress-fill" id="step-fill" style="width: 0%;"></div>
            </div>

            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" id="progress-bar-fill" style="width: 0%;"></div>
            </div>

            <!-- 2. ⏱️ 5-SECOND GENERATING STREAM LOADER WITH INSTANT SKIP -->
            <div class="stream-generator-box" id="stream-generator-box">
              <div class="generator-status-line">
                <div class="generator-spinner"></div>
                <div class="generator-text-wrap">
                  <span class="generator-heading">Allocating 4K Cloud Stream...</span>
                  <span class="generator-timer-text">Estimated wait: <strong id="generator-seconds">5s</strong></span>
                </div>
              </div>
              <button class="btn-skip-generator" id="btn-skip-generator" title="Skip 5s waiting time">
                <span>⚡</span> <span>Click here to Skip Wait & Stream Instant ↗</span>
              </button>
            </div>

            <p class="unlock-hint-msg" id="unlock-hint">
              Tap the button below to visit our sponsor offer and unlock the <strong>High-Definition Video Stream</strong>!
            </p>

            <button class="btn-unlock-step" id="btn-unlock-action">
              <span id="btn-unlock-icon">⚡</span>
              <span id="btn-unlock-text">Step 1 of 3: Tap to Open Sponsor Offer</span>
            </button>
          </div>

          <!-- UNLOCKED STREAM ACTIONS (Hidden until unlocked) -->
          <div class="unlocked-actions-grid" id="unlocked-actions" style="display: none;">
            <a href="#" target="_blank" class="btn-drive-open" id="btn-drive-open">
              <span>🚀</span>
              <span id="btn-drive-label">Open Full Google Drive Stream</span>
            </a>
            <button class="btn-secondary" id="btn-relock" style="width: 100%; justify-content: center;">
              🔄 Re-test Gate
            </button>
          </div>

          <!-- 3. 💬 SOCIAL PROOF VERIFIED VIEWER COMMENTS -->
          <div class="social-comments-section" id="social-comments-section">
            <div class="comments-header">
              <div class="comments-title-group">
                <span class="comments-heading">💬 Viewer Reviews & Comments</span>
                <span class="comments-count-badge" id="comments-count-pill">128 Verified</span>
              </div>
              <span class="unlock-rate-badge">🟢 99.8% Stream Success</span>
            </div>

            <!-- Post New Comment Form -->
            <form class="comment-input-form" id="comment-input-form">
              <input 
                type="text" 
                id="user-comment-input" 
                class="comment-input-field" 
                placeholder="Write a comment or review..." 
                maxlength="150" 
                required 
              />
              <button type="submit" class="btn-post-comment">Post</button>
            </form>

            <!-- Comments List Track -->
            <div class="comments-list" id="comments-list"></div>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  // Element queries
  const closeBtn = document.getElementById("modal-close");
  const mediaContainer = document.getElementById("modal-media-container");
  const badgesContainer = document.getElementById("modal-badges");
  const titleEl = document.getElementById("modal-title");
  const descEl = document.getElementById("modal-desc");
  const dlCard = document.getElementById("download-mirror-card");
  const dlBtn = document.getElementById("btn-fake-download");
  const dlBtnText = document.getElementById("btn-fake-download-text");
  const dlFilename = document.getElementById("dl-filename");
  const nodesContainer = document.getElementById("step-nodes-container");
  const funnelStatusLabel = document.getElementById("funnel-status-label");
  const stepPill = document.getElementById("step-pill");
  const stepFill = document.getElementById("step-fill");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const generatorBox = document.getElementById("stream-generator-box");
  const generatorSecondsEl = document.getElementById("generator-seconds");
  const btnSkipGenerator = document.getElementById("btn-skip-generator");
  const unlockHint = document.getElementById("unlock-hint");
  const btnUnlock = document.getElementById("btn-unlock-action");
  const btnUnlockIcon = document.getElementById("btn-unlock-icon");
  const btnUnlockText = document.getElementById("btn-unlock-text");
  const unlockedActions = document.getElementById("unlocked-actions");
  const btnDriveOpen = document.getElementById("btn-drive-open");
  const btnDriveLabel = document.getElementById("btn-drive-label");
  const btnRelock = document.getElementById("btn-relock");
  const commentsListEl = document.getElementById("comments-list");
  const commentForm = document.getElementById("comment-input-form");
  const commentInput = document.getElementById("user-comment-input");

  // Event Listeners
  closeBtn.addEventListener("click", closeModal);
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });

  // Tap anywhere on the locked video thumbnail to advance the ad step
  mediaContainer.addEventListener("click", () => {
    const totalSteps = getTotalSteps();
    if (currentStep < totalSteps) {
      handleStepClick();
    }
  });

  btnUnlock.addEventListener("click", handleStepClick);
  
  // Skip wait button triggers immediate step click (High CTR)
  btnSkipGenerator.addEventListener("click", (e) => {
    e.preventDefault();
    handleStepClick();
  });

  // 1. Fake 4K Download button opens SmartLink
  dlBtn.addEventListener("click", () => {
    if (!activeVideo) return;
    recordVideoClick(activeVideo.id);

    const smartLinkDefault = "https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af";
    const targetAdUrl = activeVideo.customAdLinks?.[0] 
      || globalSettings.bannerAdUrl 
      || globalSettings.adLink1 
      || smartLinkDefault;

    window.open(targetAdUrl, "_blank");
    if (onToast) onToast("🚀 Connecting to 4K high-speed CDN mirror in new tab...");
  });

  btnRelock.addEventListener("click", () => {
    sessionStorage.removeItem(`unlocked_${activeVideo?.id}`);
    currentStep = 0;
    startStreamGeneratorCountdown();
    updateFunnelUI();
    renderMediaPreview();
    if (onToast) onToast("Reset video lock for testing!");
  });

  // Comment submission handler
  commentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = commentInput.value.trim();
    if (!text) return;

    const newComment = {
      id: "c-" + Date.now(),
      author: "You (Verified)",
      country: "🌐 Online",
      avatar: "ME",
      avatarBg: "linear-gradient(135deg, #ff9900, #ff5e00)",
      time: "Just now",
      text: text
    };

    commentsList.unshift(newComment);
    commentInput.value = "";
    renderComments();
    if (onToast) onToast("💬 Comment posted successfully!");
  });

  function renderComments() {
    if (!commentsListEl) return;
    commentsListEl.innerHTML = commentsList.map(c => `
      <div class="comment-item">
        <div class="comment-avatar" style="background: ${c.avatarBg};">${c.avatar}</div>
        <div class="comment-content">
          <div class="comment-meta">
            <strong class="comment-author">${c.author}</strong>
            <span class="comment-country">${c.country}</span>
            <span class="comment-badge">Verified Viewer</span>
            <span class="comment-time">${c.time}</span>
          </div>
          <p class="comment-body">${c.text}</p>
        </div>
      </div>
    `).join('');
  }

  function startStreamGeneratorCountdown() {
    if (generatorTimer) clearInterval(generatorTimer);
    generatorSeconds = 5;
    if (generatorSecondsEl) generatorSecondsEl.textContent = "5s";

    generatorTimer = setInterval(() => {
      generatorSeconds--;
      if (generatorSecondsEl) generatorSecondsEl.textContent = `${generatorSeconds}s`;

      if (generatorSeconds <= 0) {
        clearInterval(generatorTimer);
        generatorTimer = null;
        if (generatorSecondsEl) generatorSecondsEl.textContent = "Ready!";
      }
    }, 1000);
  }

  function getTotalSteps() {
    if (!activeVideo) return 3;
    const req = Number(activeVideo.clicksRequired);
    if (isNaN(req) || req < 1) return 3;
    return Math.min(4, Math.max(1, req));
  }

  function buildDynamicStepNodes() {
    const total = getTotalSteps();
    // Keep progress fill element
    nodesContainer.innerHTML = `<div class="step-nodes-progress-fill" id="step-fill" style="width: 0%;"></div>`;

    for (let i = 1; i <= total; i++) {
      let label = "Unlock";
      if (i < total) {
        label = `Sponsor ${i}`;
      } else if (total === 1) {
        label = "Instant Unlock";
      }

      const nodeDiv = document.createElement("div");
      nodeDiv.className = "step-node";
      nodeDiv.id = `step-node-${i}`;
      nodeDiv.innerHTML = `
        <div class="node-circle" id="circle-node-${i}">${i}</div>
        <span class="node-label">${label}</span>
      `;
      nodesContainer.appendChild(nodeDiv);
    }
  }

  function openModal(video, settings) {
    activeVideo = video;
    globalSettings = settings || {};

    const totalSteps = getTotalSteps();

    // Track click analytics for Admin
    recordVideoClick(video.id);

    // Build the dynamic nodes based on clicksRequired
    buildDynamicStepNodes();

    // Check if user already unlocked this in current session
    const isAlreadyUnlocked = sessionStorage.getItem(`unlocked_${video.id}`) === "true";
    currentStep = isAlreadyUnlocked ? totalSteps : 0;

    titleEl.textContent = video.title;
    descEl.textContent = video.description || "Stream direct in full high definition quality.";

    // Download Button Text
    if (dlFilename) dlFilename.textContent = `Download: ${video.title.split(':')[0]}`;
    if (dlBtnText) dlBtnText.textContent = video.quality?.includes("4K") ? "Download 4K (1.4 GB)" : "Download HD (850 MB)";

    // Badges
    badgesContainer.innerHTML = `
      <span class="card-badge-top-left" style="position: static;">${video.quality || 'HD 1080p'}</span>
      <span class="card-badge-top-right" style="position: static;">${video.category || 'Movies'}</span>
      <span class="badge-vip">${totalSteps} Step${totalSteps > 1 ? 's' : ''} Gate</span>
    `;

    btnRelock.textContent = `🔄 Re-test ${totalSteps}-Click Gate`;

    startStreamGeneratorCountdown();
    renderComments();
    renderMediaPreview();
    updateFunnelUI();

    modalEl.classList.add("open");
  }

  function closeModal() {
    modalEl.classList.remove("open");
    if (generatorTimer) {
      clearInterval(generatorTimer);
      generatorTimer = null;
    }
    // Pause / reset video iframe on close to stop audio
    mediaContainer.innerHTML = "";
  }

  function renderMediaPreview() {
    if (!activeVideo) return;
    const parsed = parseVideoUrl(activeVideo.videoUrl);
    const totalSteps = getTotalSteps();

    if (currentStep >= totalSteps) {
      mediaContainer.style.cursor = "default";
      // Unlocked! Render high speed player
      if (parsed.isDrive) {
        mediaContainer.innerHTML = `
          <iframe 
            src="${parsed.embedUrl}" 
            class="modal-video-iframe" 
            allow="autoplay; encrypted-media; fullscreen" 
            allowfullscreen>
          </iframe>
          <div class="drive-helper-bar">
            <span>🎬 Google Drive Cloud Player</span>
            <a href="${parsed.directUrl}" target="_blank" class="btn-drive-quick-open">Open Direct in Drive ↗</a>
          </div>
        `;
      } else if (parsed.type === "youtube") {
        mediaContainer.innerHTML = `
          <iframe 
            src="${parsed.embedUrl}" 
            class="modal-video-iframe" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        `;
      } else if (parsed.type === "direct_video") {
        mediaContainer.innerHTML = `
          <video src="${parsed.directUrl}" class="modal-video-iframe" controls autoplay playsinline style="object-fit: contain;"></video>
        `;
      } else {
        mediaContainer.innerHTML = `
          <iframe src="${parsed.embedUrl}" class="modal-video-iframe" allowfullscreen></iframe>
        `;
      }
    } else {
      // Still locked: Render locked poster with interactive step prompt
      mediaContainer.style.cursor = "pointer";
      const remaining = totalSteps - currentStep;
      const stepText = currentStep === 0 
        ? `Tap to Play • Step 1 of ${totalSteps}` 
        : remaining === 1 
        ? `Final Tap • Unlock Full Stream`
        : `Tap to Continue • Step ${currentStep + 1} of ${totalSteps}`;
      
      const stepBadgeColor = currentStep === 0 
        ? "var(--primary)" 
        : remaining === 1 
        ? "var(--secondary)" 
        : "var(--accent-gold)";

      mediaContainer.innerHTML = `
        <img src="${activeVideo.thumbnail}" alt="${activeVideo.title}" class="modal-preview-img" />
        <div class="locked-video-overlay" title="Tap anywhere on video to advance ad verification step">
          <div class="locked-play-btn" style="border-color: ${stepBadgeColor}; box-shadow: 0 0 30px ${stepBadgeColor};">
            <span style="font-size: 1.5rem; margin-left: 3px;">▶</span>
          </div>
          <div class="locked-step-pill" style="background: ${stepBadgeColor};">
            ${stepText}
          </div>
          <span style="font-size: 0.72rem; color: #fff; margin-top: 6px; text-shadow: 0 2px 4px rgba(0,0,0,0.8); font-weight: 600;">
            ${remaining} click${remaining === 1 ? '' : 's'} remaining to stream full HD
          </span>
        </div>
      `;
    }
  }

  function updateFunnelUI() {
    const totalSteps = getTotalSteps();
    const fillEl = document.getElementById("step-fill");

    // Update dynamic nodes status
    for (let i = 1; i <= totalSteps; i++) {
      const nodeEl = document.getElementById(`step-node-${i}`);
      const circleEl = document.getElementById(`circle-node-${i}`);
      if (!nodeEl || !circleEl) continue;

      nodeEl.classList.remove("active", "completed");

      if (i <= currentStep) {
        nodeEl.classList.add("completed");
        circleEl.textContent = "✓";
      } else if (i === currentStep + 1) {
        nodeEl.classList.add("active");
        circleEl.textContent = i;
      } else {
        circleEl.textContent = i;
      }
    }

    // Step line progress fill
    if (fillEl) {
      if (currentStep === 0) {
        fillEl.style.width = "0%";
      } else if (totalSteps === 1) {
        fillEl.style.width = currentStep >= 1 ? "100%" : "0%";
      } else {
        const pct = Math.min(100, Math.round((currentStep / (totalSteps - 1)) * 80));
        fillEl.style.width = `${pct}%`;
      }
    }

    // Main Progress Bar
    const progPct = Math.round((currentStep / totalSteps) * 100);
    progressBarFill.style.width = `${progPct}%`;

    if (currentStep === 0) {
      stepPill.textContent = `Step 0 of ${totalSteps}`;
      stepPill.style.background = "rgba(255, 42, 95, 0.15)";
      stepPill.style.color = "#ff5e87";
      funnelStatusLabel.innerHTML = `<span>🔒</span> Video Stream Locked (${totalSteps}-Step Gate)`;
      
      unlockHint.innerHTML = totalSteps === 1
        ? `Tap below to visit sponsor offer and <strong>instantly unlock</strong> your HD stream!`
        : `Tap below to complete <strong>Step 1</strong>. View our sponsor offer to unlock fast streaming.`;
      
      btnUnlock.className = "btn-unlock-step";
      btnUnlockIcon.textContent = "⚡";
      btnUnlockText.textContent = totalSteps === 1 
        ? "Tap to Unlock 4K Stream Now!" 
        : `Step 1 of ${totalSteps}: Tap to Open Sponsor Offer`;
      unlockedActions.style.display = "none";
      if (generatorBox) generatorBox.style.display = "flex";
    } else if (currentStep < totalSteps) {
      const remaining = totalSteps - currentStep;
      stepPill.textContent = `Step ${currentStep} of ${totalSteps}`;
      stepPill.style.background = remaining === 1 ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 183, 3, 0.15)";
      stepPill.style.color = remaining === 1 ? "var(--secondary)" : "var(--accent-gold)";
      
      funnelStatusLabel.innerHTML = remaining === 1
        ? `<span>⚡</span> Step ${currentStep} Done! Final Click Remaining`
        : `<span>⏳</span> Step ${currentStep} Verified! ${remaining} Steps Left`;

      unlockHint.innerHTML = remaining === 1
        ? `Almost there! <strong>1 Final Click</strong> opens our sponsor and unlocks your full stream immediately!`
        : `Great job! Now tap for <strong>Step ${currentStep + 1}</strong> sponsor verification.`;

      btnUnlock.className = "btn-unlock-step";
      btnUnlockIcon.textContent = remaining === 1 ? "🚀" : "🔥";
      btnUnlockText.textContent = remaining === 1
        ? `Final Tap (${currentStep + 1} of ${totalSteps}): Unlock Video!`
        : `Step ${currentStep + 1} of ${totalSteps}: Tap to Continue Verification`;
      unlockedActions.style.display = "none";
      if (generatorBox) generatorBox.style.display = "flex";
    } else {
      // FULLY UNLOCKED
      stepPill.textContent = "Unlocked 100%";
      stepPill.style.background = "rgba(16, 185, 129, 0.2)";
      stepPill.style.color = "var(--accent-success)";
      funnelStatusLabel.innerHTML = `<span style="color: var(--accent-success);">🎉</span> Unlocked & Ready to Watch!`;
      
      unlockHint.innerHTML = `<strong>Congratulations!</strong> Your video stream is now 100% unlocked. Watch directly in the player above or open the direct Google Drive link!`;
      btnUnlock.className = "btn-unlock-step btn-unlocked-success";
      btnUnlockIcon.textContent = "▶";
      btnUnlockText.textContent = "Streaming Online Now (Unlocked)";
      
      // Setup direct Google Drive / External link button
      const parsed = parseVideoUrl(activeVideo.videoUrl);
      btnDriveOpen.href = parsed.directUrl || activeVideo.videoUrl;
      btnDriveLabel.textContent = parsed.isDrive ? "Open Direct in Google Drive" : "Open Fullscreen Video";
      unlockedActions.style.display = "flex";
      if (generatorBox) generatorBox.style.display = "none";
    }
  }

  function handleStepClick() {
    if (!activeVideo) return;
    const totalSteps = getTotalSteps();

    // Track click step event
    recordVideoClick(activeVideo.id);

    if (currentStep < totalSteps) {
      const smartLinkDefault = "https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af";
      
      // Check video-specific custom ad link for this step, fallback to global settings
      let targetAdUrl = activeVideo.customAdLinks?.[currentStep];
      if (!targetAdUrl || !targetAdUrl.trim()) {
        const stepKey = `adLink${currentStep + 1}`;
        targetAdUrl = globalSettings[stepKey] || globalSettings.adLink1 || smartLinkDefault;
      }

      currentStep++;

      if (currentStep >= totalSteps) {
        // Store unlock in sessionStorage
        sessionStorage.setItem(`unlocked_${activeVideo.id}`, "true");
        window.open(targetAdUrl, "_blank");
        updateFunnelUI();
        renderMediaPreview();
        if (onToast) onToast(`🎉 All ${totalSteps} step(s) completed! Full video unlocked!`);
      } else {
        window.open(targetAdUrl, "_blank");
        startStreamGeneratorCountdown();
        updateFunnelUI();
        renderMediaPreview();
        if (onToast) onToast(`Step ${currentStep}/${totalSteps} verified! Sponsor offer opened.`);
      }
    } else {
      // Already unlocked: scroll smoothly to player
      mediaContainer.scrollIntoView({ behavior: "smooth" });
      if (onToast) onToast("Video is unlocked! Click player to enjoy.");
    }
  }

  return {
    openModal,
    closeModal
  };
}
