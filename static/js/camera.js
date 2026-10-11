/**
 * TRINETRA Camera Stream Controller
 * Handles video feed states (Unconfigured, Connecting, Active, Error),
 * stream URL configuration modal, credentials security, and snapshot capture.
 */

class TrinetraCameraController {
  constructor() {
    this.streamConfig = null;
    this.streamImg = document.getElementById('cameraLiveFeedImg');
    this.placeholder = document.getElementById('cameraPlaceholderOverlay');
    this.statusBadge = document.getElementById('cameraStatusBadge');

    this.initUI();
    this.loadConfig();
  }

  initUI() {
    // Config stream button
    const btnOpenConfig = document.getElementById('btnOpenCamConfigModal');
    const modal = document.getElementById('cameraConfigModal');
    const btnCloseModal = document.getElementById('btnCloseCamConfigModal');
    const formConfig = document.getElementById('cameraConfigForm');

    if (btnOpenConfig && modal) {
      btnOpenConfig.addEventListener('click', () => modal.classList.add('open'));
    }
    if (btnCloseModal && modal) {
      btnCloseModal.addEventListener('click', () => modal.classList.remove('open'));
    }

    if (formConfig) {
      formConfig.addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlInput = document.getElementById('camStreamUrlInput').value;
        const protoSelect = document.getElementById('camProtocolSelect').value;
        await this.updateStreamConfig(urlInput, protoSelect);
        if (modal) modal.classList.remove('open');
      });
    }

    // Refresh stream button
    const btnReload = document.getElementById('btnReloadCamStream');
    if (btnReload) {
      btnReload.addEventListener('click', () => this.reloadStream());
    }

    // Snapshot capture button
    const btnSnapshot = document.getElementById('btnCaptureSnapshot');
    if (btnSnapshot) {
      btnSnapshot.addEventListener('click', () => this.takeSnapshot());
    }

    // Setup guide modal
    const btnGuide = document.getElementById('btnOpenRtspGuideModal');
    const guideModal = document.getElementById('rtspGatewayGuideModal');
    const btnCloseGuide = document.getElementById('btnCloseRtspGuideModal');
    if (btnGuide && guideModal) {
      btnGuide.addEventListener('click', () => guideModal.classList.add('open'));
    }
    if (btnCloseGuide && guideModal) {
      btnCloseGuide.addEventListener('click', () => guideModal.classList.remove('open'));
    }
  }

  async loadConfig() {
    try {
      const res = await fetch('/api/camera/config');
      if (res.ok) {
        this.streamConfig = await res.json();
        this.applyConfig(this.streamConfig);
      }
    } catch (e) {
      console.error("Failed to load camera config", e);
    }
  }

  applyConfig(config) {
    const urlDisplay = document.getElementById('cameraActiveUrlDisplay');
    if (urlDisplay) {
      urlDisplay.textContent = config.stream_url ? `STREAM: ${config.stream_url}` : 'STATUS: No stream URL configured';
    }

    if (!config.stream_url) {
      // Unconfigured state: show clean placeholder
      if (this.streamImg) this.streamImg.style.display = 'none';
      if (this.placeholder) this.placeholder.style.display = 'flex';
      if (this.statusBadge) {
        this.statusBadge.textContent = 'STANDBY / NOT CONFIGURED';
        this.statusBadge.style.color = 'var(--text-muted)';
      }
      return;
    }

    // Attempting connection
    if (this.statusBadge) {
      this.statusBadge.textContent = 'CONNECTING STREAM...';
      this.statusBadge.style.color = 'var(--accent-yellow)';
    }

    if (this.streamImg) {
      this.streamImg.style.display = 'block';
      if (this.placeholder) this.placeholder.style.display = 'none';

      this.streamImg.onload = () => {
        if (this.statusBadge) {
          this.statusBadge.textContent = 'LIVE FEED ACTIVE';
          this.statusBadge.style.color = 'var(--accent-green)';
        }
      };

      this.streamImg.onerror = () => {
        if (this.statusBadge) {
          this.statusBadge.textContent = 'STREAM OFFLINE / TIMEOUT';
          this.statusBadge.style.color = 'var(--accent-red)';
        }
      };

      // Set src with cache buster
      this.streamImg.src = `${config.stream_url}?t=${Date.now()}`;
    }
  }

  async updateStreamConfig(streamUrl, protocol) {
    try {
      const res = await fetch('/api/camera/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_url: streamUrl,
          protocol: protocol
        })
      });
      if (res.ok) {
        this.streamConfig = await res.json();
        this.applyConfig(this.streamConfig);
      }
    } catch (e) {
      alert("Error updating stream settings: " + e.message);
    }
  }

  reloadStream() {
    if (this.streamConfig) {
      this.applyConfig(this.streamConfig);
    }
  }

  takeSnapshot() {
    if (!this.streamImg || this.streamImg.style.display === 'none') {
      alert("Cannot capture snapshot: No active camera feed configured.");
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = this.streamImg.naturalWidth || 640;
    canvas.height = this.streamImg.naturalHeight || 480;
    const ctx = canvas.getContext('2d');
    try {
      ctx.drawImage(this.streamImg, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `trinetra-snapshot-${Date.now()}.jpg`;
      a.click();
    } catch (e) {
      alert("Snapshot failed (cross-origin restrictions on direct camera stream).");
    }
  }
}

window.TrinetraCameraController = TrinetraCameraController;
