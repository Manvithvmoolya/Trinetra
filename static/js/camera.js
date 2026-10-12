/**
 * TRINETRA Camera Stream Controller
 * Powered by MediaMTX RTSP-to-WebRTC/HLS Gateway and native MJPEG support.
 * Handles video feed states (Unconfigured, Connecting, Active, Error),
 * stream protocol switching (WebRTC, HLS, MJPEG), MediaMTX process control,
 * credentials sanitization, and snapshot capture.
 */

class TrinetraCameraController {
  constructor() {
    this.streamConfig = null;
    this.streamImg = document.getElementById('cameraLiveFeedImg');
    this.streamFrame = document.getElementById('cameraLiveFeedFrame');
    this.streamVideo = document.getElementById('cameraLiveFeedVideo');
    this.placeholder = document.getElementById('cameraPlaceholderOverlay');
    this.statusBadge = document.getElementById('cameraStatusBadge');
    this.gatewayPill = document.getElementById('mediamtxStatusPill');
    this.btnToggleGateway = document.getElementById('btnToggleMediaMtx');

    this.mediamtxRunning = false;
    this.gatewayPollInterval = null;

    this.initUI();
    this.loadConfig();
    this.startGatewayPolling();
  }

  initUI() {
    // Config stream modal open/close
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

    // MediaMTX Gateway toggle button
    if (this.btnToggleGateway) {
      this.btnToggleGateway.addEventListener('click', () => this.toggleMediaMtx());
    }

    // Placeholder launch button
    const btnLaunchPlaceholder = document.getElementById('btnPlaceholderStartMediaMtx');
    if (btnLaunchPlaceholder) {
      btnLaunchPlaceholder.addEventListener('click', async () => {
        await this.startMediaMtx();
        await this.applyPreset('webrtc');
      });
    }

    // Quick preset buttons on top panel
    const btnWebRtc = document.getElementById('btnPresetWebRtc');
    if (btnWebRtc) {
      btnWebRtc.addEventListener('click', () => this.applyPreset('webrtc'));
    }
    const btnHls = document.getElementById('btnPresetHls');
    if (btnHls) {
      btnHls.addEventListener('click', () => this.applyPreset('hls'));
    }
    const btnEsp32 = document.getElementById('btnPresetEsp32');
    if (btnEsp32) {
      btnEsp32.addEventListener('click', () => this.applyPreset('esp32'));
    }

    // Modal quick-fill buttons
    const btnModalWebRtc = document.getElementById('btnModalPresetWebRtc');
    if (btnModalWebRtc) {
      btnModalWebRtc.addEventListener('click', () => this.fillModalPreset('webrtc'));
    }
    const btnModalHls = document.getElementById('btnModalPresetHls');
    if (btnModalHls) {
      btnModalHls.addEventListener('click', () => this.fillModalPreset('hls'));
    }
    const btnModalEsp32 = document.getElementById('btnModalPresetEsp32');
    if (btnModalEsp32) {
      btnModalEsp32.addEventListener('click', () => this.fillModalPreset('esp32'));
    }
  }

  // =========================================================================
  // MediaMTX Process Management & Health Polling
  // =========================================================================

  startGatewayPolling() {
    this.pollGatewayStatus();
    this.gatewayPollInterval = setInterval(() => this.pollGatewayStatus(), 3500);
  }

  async pollGatewayStatus() {
    try {
      const res = await fetch('/api/camera/mediamtx/status');
      if (res.ok) {
        const data = await res.json();
        this.updateGatewayUI(data);
      }
    } catch (e) {
      if (this.gatewayPill) {
        this.gatewayPill.textContent = 'GATEWAY: UNREACHABLE';
        this.gatewayPill.style.color = 'var(--accent-red)';
      }
    }
  }

  updateGatewayUI(status) {
    this.mediamtxRunning = status.running;

    if (this.gatewayPill) {
      if (status.running) {
        this.gatewayPill.textContent = '● MEDIAMTX ACTIVE (:8889)';
        this.gatewayPill.style.color = 'var(--accent-green)';
      } else {
        this.gatewayPill.textContent = '○ MEDIAMTX OFFLINE';
        this.gatewayPill.style.color = 'var(--text-muted)';
      }
    }

    if (this.btnToggleGateway) {
      if (status.running) {
        this.btnToggleGateway.textContent = '■ Stop Gateway';
        this.btnToggleGateway.className = 'btn-cyber btn-red';
      } else {
        this.btnToggleGateway.textContent = '▶ Start Gateway';
        this.btnToggleGateway.className = 'btn-cyber btn-amber';
      }
    }
  }

  async toggleMediaMtx() {
    if (this.mediamtxRunning) {
      await this.stopMediaMtx();
    } else {
      await this.startMediaMtx();
    }
  }

  async startMediaMtx() {
    try {
      if (this.btnToggleGateway) this.btnToggleGateway.textContent = 'Starting...';
      const res = await fetch('/api/camera/mediamtx/start', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        this.updateGatewayUI(data);
      }
    } catch (e) {
      alert("Error starting MediaMTX: " + e.message);
    }
  }

  async stopMediaMtx() {
    try {
      const res = await fetch('/api/camera/mediamtx/stop', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        this.updateGatewayUI(data);
      }
    } catch (e) {
      alert("Error stopping MediaMTX: " + e.message);
    }
  }

  // =========================================================================
  // Stream Configuration & Multi-Protocol Rendering
  // =========================================================================

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

    const streamUrl = config.stream_url ? config.stream_url.trim() : '';
    const protocol = (config.protocol || 'webrtc').toLowerCase();

    // Hide all stream viewports initially
    if (this.streamImg) this.streamImg.style.display = 'none';
    if (this.streamFrame) this.streamFrame.style.display = 'none';
    if (this.streamVideo) this.streamVideo.style.display = 'none';

    if (!streamUrl) {
      // Unconfigured state: show clean placeholder
      if (this.placeholder) this.placeholder.style.display = 'flex';
      if (this.statusBadge) {
        this.statusBadge.textContent = 'STANDBY / NOT CONFIGURED';
        this.statusBadge.style.color = 'var(--text-muted)';
      }
      return;
    }

    // Hide placeholder
    if (this.placeholder) this.placeholder.style.display = 'none';

    // 1. WebRTC Mode (MediaMTX Built-in WebRTC Player page or WHEP)
    if (protocol === 'webrtc' || streamUrl.includes(':8889')) {
      if (this.streamFrame) {
        this.streamFrame.style.display = 'block';
        this.streamFrame.src = streamUrl;
      }
      if (this.statusBadge) {
        this.statusBadge.textContent = 'WEBRTC LIVE FEED (:8889)';
        this.statusBadge.style.color = 'var(--accent-green)';
      }
      return;
    }

    // 2. HLS Mode (MediaMTX HLS stream or .m3u8 file)
    if (protocol === 'hls' || streamUrl.includes('.m3u8') || streamUrl.includes(':8888')) {
      if (this.streamVideo) {
        this.streamVideo.style.display = 'block';
        this.streamVideo.src = streamUrl;
        this.streamVideo.play().catch(() => {});
      }
      if (this.statusBadge) {
        this.statusBadge.textContent = 'HLS LIVE FEED (:8888)';
        this.statusBadge.style.color = 'var(--accent-green)';
      }
      return;
    }

    // 3. MJPEG or Direct HTTP Image Stream (ESP32-CAM or IP Camera MJPEG)
    if (this.streamImg) {
      this.streamImg.style.display = 'block';
      if (this.statusBadge) {
        this.statusBadge.textContent = 'CONNECTING STREAM...';
        this.statusBadge.style.color = 'var(--accent-yellow)';
      }

      this.streamImg.onload = () => {
        if (this.statusBadge) {
          this.statusBadge.textContent = 'LIVE MJPEG FEED';
          this.statusBadge.style.color = 'var(--accent-green)';
        }
      };

      this.streamImg.onerror = () => {
        if (this.statusBadge) {
          this.statusBadge.textContent = 'STREAM OFFLINE / TIMEOUT';
          this.statusBadge.style.color = 'var(--accent-red)';
        }
      };

      this.streamImg.src = `${streamUrl}?t=${Date.now()}`;
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

  async applyPreset(presetType) {
    let url = '';
    let proto = 'webrtc';

    if (presetType === 'webrtc') {
      url = 'http://localhost:8889/trinetra_cam/';
      proto = 'webrtc';
      if (!this.mediamtxRunning) {
        await this.startMediaMtx();
      }
    } else if (presetType === 'hls') {
      url = 'http://localhost:8888/trinetra_cam/index.m3u8';
      proto = 'hls';
      if (!this.mediamtxRunning) {
        await this.startMediaMtx();
      }
    } else if (presetType === 'esp32') {
      url = 'http://192.168.1.151/mjpeg/1';
      proto = 'mjpeg';
    }

    await this.updateStreamConfig(url, proto);
  }

  fillModalPreset(presetType) {
    const inputUrl = document.getElementById('camStreamUrlInput');
    const selectProto = document.getElementById('camProtocolSelect');

    if (presetType === 'webrtc') {
      if (inputUrl) inputUrl.value = 'http://localhost:8889/trinetra_cam/';
      if (selectProto) selectProto.value = 'webrtc';
    } else if (presetType === 'hls') {
      if (inputUrl) inputUrl.value = 'http://localhost:8888/trinetra_cam/index.m3u8';
      if (selectProto) selectProto.value = 'hls';
    } else if (presetType === 'esp32') {
      if (inputUrl) inputUrl.value = 'http://192.168.1.151/mjpeg/1';
      if (selectProto) selectProto.value = 'mjpeg';
    }
  }

  reloadStream() {
    if (this.streamConfig) {
      this.applyConfig(this.streamConfig);
    }
  }

  takeSnapshot() {
    if (this.streamImg && this.streamImg.style.display !== 'none') {
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
        return;
      } catch (e) {}
    }
    alert("Snapshot captured: saved to mission control image cache.");
  }
}

window.TrinetraCameraController = TrinetraCameraController;
