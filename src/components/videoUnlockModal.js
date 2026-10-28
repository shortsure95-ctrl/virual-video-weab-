import { parseVideoUrl } from "../utils/googleDrive.js";
import { recordVideoClick } from "../storage.js";

/**
 * Dynamic 1-Step to 4-Step Ad Monetization Video Unlock Modal
 */

export function createVideoUnlockModal({ onToast }) {
  let activeVideo = null;
  let currentStep = 0; // 0 = not started, up to totalSteps
  let globalSettings = {};

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
  const nodesContainer = document.getElementById("step-nodes-container");
  const funnelStatusLabel = document.getElementById("funnel-status-label");
  const stepPill = document.getElementById("step-pill");
  const stepFill = document.getElementById("step-fill");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const unlockHint = document.getElementById("unlock-hint");
  const btnUnlock = document.getElementById("btn-unlock-action");
  const btnUnlockIcon = document.getElementById("btn-unlock-icon");
  const btnUnlockText = document.getElementById("btn-unlock-text");
  const unlockedActions = document.getElementById("unlocked-actions");
  const btnDriveOpen = document.getElementById("btn-drive-open");
  const btnDriveLabel = document.getElementById("btn-drive-label");
  const btnRelock = document.getElementById("btn-relock");

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
  btnRelock.addEventListener("click", () => {
    sessionStorage.removeItem(`unlocked_${activeVideo?.id}`);
    currentStep = 0;
    updateFunnelUI();
    renderMediaPreview();
    if (onToast) onToast("Reset video lock for testing!");
  });

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

  /**
   * Opens ad in background tab on PC/browsers
   * Keeps current window focused so user remains on fresh video site
   */
  function openAdInBackground(url) {
    if (!url) return;
    try {
      const adTab = window.open(url, "_blank");
      if (adTab) {
        try {
          adTab.blur();
        } catch (e) {}
      }
      window.focus();
    } catch (err) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.focus();
    }
  }

  function openModal(video, settings, options = {}) {
    activeVideo = video;
    globalSettings = settings || {};

    const totalSteps = getTotalSteps();

    // Track click analytics for Admin
    recordVideoClick(video.id);

    // Build the dynamic nodes based on clicksRequired
    buildDynamicStepNodes();

    // Check if user already unlocked this in current session
    const isAlreadyUnlocked = sessionStorage.getItem(`unlocked_${video.id}`) === "true";

    if (isAlreadyUnlocked) {
      currentStep = totalSteps;
    } else {
      if (options.triggerFirstClickAd) {
        // First click on video triggers Step 1 ad in background tab
        const smartLinkDefault = "https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af";
        const step1AdUrl = activeVideo.customAdLinks?.[0] || globalSettings.adLink1 || smartLinkDefault;
        
        openAdInBackground(step1AdUrl);
        currentStep = 1;

        if (totalSteps === 1) {
          sessionStorage.setItem(`unlocked_${video.id}`, "true");
          if (onToast) onToast("🎉 1-Step Unlocked! (Sponsor opened in background tab)");
        } else {
          if (onToast) onToast(`⚡ Step 1 completed! Sponsor opened in background tab.`);
        }
      } else {
        currentStep = 0;
      }
    }

    titleEl.textContent = video.title;
    descEl.textContent = video.description || "Stream direct in full high definition quality.";

    // Badges
    badgesContainer.innerHTML = `
      <span class="card-badge-top-left" style="position: static;">${video.quality || 'HD 1080p'}</span>
      <span class="card-badge-top-right" style="position: static;">${video.category || 'Movies'}</span>
      <span class="badge-vip">${totalSteps} Step${totalSteps > 1 ? 's' : ''} Gate</span>
    `;

    btnRelock.textContent = `🔄 Re-test ${totalSteps}-Click Gate`;

    renderMediaPreview();
    updateFunnelUI();

    modalEl.classList.add("open");
    window.focus();
  }

  function closeModal() {
    modalEl.classList.remove("open");
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
        openAdInBackground(targetAdUrl);
        updateFunnelUI();
        renderMediaPreview();
        if (onToast) onToast(`🎉 All ${totalSteps} step(s) completed! Full video unlocked!`);
      } else {
        openAdInBackground(targetAdUrl);
        updateFunnelUI();
        renderMediaPreview();
        if (onToast) onToast(`Step ${currentStep}/${totalSteps} verified! Sponsor opened in background tab.`);
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
