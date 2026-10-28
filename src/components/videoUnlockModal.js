import { parseVideoUrl } from "../utils/googleDrive.js";

/**
 * 3-Step Ad Monetization Video Unlock Modal
 */

export function createVideoUnlockModal({ onToast }) {
  let activeVideo = null;
  let currentStep = 0; // 0 = not started, 1 = step 1 done, 2 = step 2 done, 3 = fully unlocked
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

          <!-- 3-STEP AD MONETIZATION FUNNEL -->
          <div class="unlock-funnel-card" id="unlock-card">
            <div class="funnel-header">
              <span class="funnel-status-label" id="funnel-status-label">
                <span style="color: var(--primary);">🔒</span> Video Locked (3-Step Gate)
              </span>
              <span class="step-indicator-pill" id="step-pill">Step 0 of 3</span>
            </div>

            <!-- Visual Nodes -->
            <div class="step-nodes">
              <div class="step-nodes-progress-fill" id="step-fill" style="width: 0%;"></div>
              
              <div class="step-node active" id="node-1">
                <div class="node-circle" id="circle-1">1</div>
                <span class="node-label">Sponsor 1</span>
              </div>
              <div class="step-node" id="node-2">
                <div class="node-circle" id="circle-2">2</div>
                <span class="node-label">Sponsor 2</span>
              </div>
              <div class="step-node" id="node-3">
                <div class="node-circle" id="circle-3">3</div>
                <span class="node-label">Unlock</span>
              </div>
            </div>

            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" id="progress-bar-fill" style="width: 0%;"></div>
            </div>

            <p class="unlock-hint-msg" id="unlock-hint">
              Tap the button below to visit our sponsor link. Complete all 3 steps to unlock the <strong>High-Definition Video Stream</strong>!
            </p>

            <button class="btn-unlock-step" id="btn-unlock-action">
              <span id="btn-unlock-icon">⚡</span>
              <span id="btn-unlock-text">Step 1 of 3: Tap to Open Sponsor Offer</span>
            </button>
          </div>

          <!-- UNLOCKED STREAM ACTIONS (Hidden until step 3 completed) -->
          <div class="unlocked-actions-grid" id="unlocked-actions" style="display: none;">
            <a href="#" target="_blank" class="btn-drive-open" id="btn-drive-open">
              <span>🚀</span>
              <span id="btn-drive-label">Open Full Google Drive Stream</span>
            </a>
            <button class="btn-secondary" id="btn-relock" style="width: 100%; justify-content: center;">
              🔄 Re-test 3-Click Gate
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
  const unlockCard = document.getElementById("unlock-card");
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
    if (currentStep < 3) {
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

  function openModal(video, settings) {
    activeVideo = video;
    globalSettings = settings || {};

    // Check if user already unlocked this in current session
    const isAlreadyUnlocked = sessionStorage.getItem(`unlocked_${video.id}`) === "true";
    currentStep = isAlreadyUnlocked ? 3 : 0;

    titleEl.textContent = video.title;
    descEl.textContent = video.description || "Stream direct in full high definition quality.";

    // Badges
    badgesContainer.innerHTML = `
      <span class="card-badge-top-left" style="position: static;">${video.quality || 'HD 1080p'}</span>
      <span class="card-badge-top-right" style="position: static;">${video.category || 'Movies'}</span>
      <span class="badge-vip">${video.duration || 'Full Stream'}</span>
    `;

    renderMediaPreview();
    updateFunnelUI();

    modalEl.classList.add("open");
  }

  function closeModal() {
    modalEl.classList.remove("open");
    // Pause / reset video iframe on close to stop audio
    mediaContainer.innerHTML = "";
  }

  function renderMediaPreview() {
    if (!activeVideo) return;
    const parsed = parseVideoUrl(activeVideo.videoUrl);

    if (currentStep >= 3) {
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
      const stepText = currentStep === 0 
        ? "Tap to Play • Step 1 of 3" 
        : currentStep === 1 
        ? "Tap to Continue • Step 2 of 3" 
        : "Final Tap • Unlock Full Stream";
      
      const stepBadgeColor = currentStep === 0 ? "var(--primary)" : currentStep === 1 ? "var(--accent-gold)" : "var(--secondary)";

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
            ${3 - currentStep} click${3 - currentStep === 1 ? '' : 's'} remaining to stream full HD
          </span>
        </div>
      `;
    }
  }

  function updateFunnelUI() {
    const node1 = document.getElementById("node-1");
    const node2 = document.getElementById("node-2");
    const node3 = document.getElementById("node-3");
    const circle1 = document.getElementById("circle-1");
    const circle2 = document.getElementById("circle-2");
    const circle3 = document.getElementById("circle-3");

    // Reset classes
    [node1, node2, node3].forEach(n => {
      n.classList.remove("active", "completed");
    });

    if (currentStep === 0) {
      stepPill.textContent = "Step 0 of 3";
      stepPill.style.background = "rgba(255, 42, 95, 0.15)";
      stepPill.style.color = "#ff5e87";
      funnelStatusLabel.innerHTML = `<span>🔒</span> Video Stream Locked`;
      stepFill.style.width = "0%";
      progressBarFill.style.width = "0%";
      node1.classList.add("active");
      circle1.textContent = "1";
      circle2.textContent = "2";
      circle3.textContent = "3";
      
      unlockHint.innerHTML = `Tap below to complete <strong>Step 1</strong>. View our sponsor offer to unlock fast streaming.`;
      btnUnlock.className = "btn-unlock-step";
      btnUnlockIcon.textContent = "⚡";
      btnUnlockText.textContent = "Step 1 of 3: Tap to Open Sponsor Offer";
      unlockedActions.style.display = "none";
    } else if (currentStep === 1) {
      stepPill.textContent = "Step 1 of 3";
      stepPill.style.background = "rgba(255, 183, 3, 0.15)";
      stepPill.style.color = "var(--accent-gold)";
      funnelStatusLabel.innerHTML = `<span>⏳</span> Step 1 Verified! 2 Steps Left`;
      stepFill.style.width = "40%";
      progressBarFill.style.width = "33%";
      node1.classList.add("completed");
      circle1.textContent = "✓";
      node2.classList.add("active");
      circle2.textContent = "2";
      circle3.textContent = "3";

      unlockHint.innerHTML = `Great job! Now tap for <strong>Step 2</strong> sponsor verification.`;
      btnUnlock.className = "btn-unlock-step";
      btnUnlockIcon.textContent = "🔥";
      btnUnlockText.textContent = "Step 2 of 3: Tap to Continue Verification";
      unlockedActions.style.display = "none";
    } else if (currentStep === 2) {
      stepPill.textContent = "Step 2 of 3";
      stepPill.style.background = "rgba(0, 229, 255, 0.15)";
      stepPill.style.color = "var(--secondary)";
      funnelStatusLabel.innerHTML = `<span>⚡</span> Step 2 Completed! Final Click Next`;
      stepFill.style.width = "80%";
      progressBarFill.style.width = "66%";
      node1.classList.add("completed");
      circle1.textContent = "✓";
      node2.classList.add("completed");
      circle2.textContent = "✓";
      node3.classList.add("active");
      circle3.textContent = "3";

      unlockHint.innerHTML = `Almost there! <strong>1 Final Click</strong> opens sponsor #3 and unlocks your full stream immediately!`;
      btnUnlock.className = "btn-unlock-step";
      btnUnlockIcon.textContent = "🚀";
      btnUnlockText.textContent = "Step 3 of 3: Final Tap to Unlock Video!";
      unlockedActions.style.display = "none";
    } else {
      // Step 3: FULLY UNLOCKED
      stepPill.textContent = "Unlocked 100%";
      stepPill.style.background = "rgba(16, 185, 129, 0.2)";
      stepPill.style.color = "var(--accent-success)";
      funnelStatusLabel.innerHTML = `<span style="color: var(--accent-success);">🎉</span> Unlocked & Ready to Watch!`;
      stepFill.style.width = "80%";
      progressBarFill.style.width = "100%";
      node1.classList.add("completed");
      node2.classList.add("completed");
      node3.classList.add("completed");
      circle1.textContent = "✓";
      circle2.textContent = "✓";
      circle3.textContent = "✓";

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

    // Get current ad link based on step (defaults to user's Adsterra Smart Link)
    const smartLinkDefault = "https://apiguinee.org/4/0f38298c6cfc407ecb309e4a05a945af";
    let targetAdUrl = "";
    if (currentStep === 0) {
      targetAdUrl = activeVideo.customAdLinks?.[0] || globalSettings.adLink1 || smartLinkDefault;
      currentStep = 1;
      window.open(targetAdUrl, "_blank");
      updateFunnelUI();
      renderMediaPreview();
      if (onToast) onToast("Step 1/3 verified! Sponsor offer opened in new tab.");
    } else if (currentStep === 1) {
      targetAdUrl = activeVideo.customAdLinks?.[1] || globalSettings.adLink2 || globalSettings.adLink1 || smartLinkDefault;
      currentStep = 2;
      window.open(targetAdUrl, "_blank");
      updateFunnelUI();
      renderMediaPreview();
      if (onToast) onToast("Step 2/3 completed! 1 final tap to unlock stream.");
    } else if (currentStep === 2) {
      targetAdUrl = activeVideo.customAdLinks?.[2] || globalSettings.adLink3 || globalSettings.adLink1 || smartLinkDefault;
      currentStep = 3;
      // Store unlock in sessionStorage
      sessionStorage.setItem(`unlocked_${activeVideo.id}`, "true");
      window.open(targetAdUrl, "_blank");
      updateFunnelUI();
      renderMediaPreview();
      if (onToast) onToast("🎉 Step 3 Completed! Full video unlocked!");
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
