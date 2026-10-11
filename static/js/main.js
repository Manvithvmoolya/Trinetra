/**
 * TRINETRA Mission Control - Global App Core
 * Manages WebSocket telemetry stream, fallback polling, global status badges, and navigation.
 */

class TrinetraAppCore {
  constructor() {
    this.ws = null;
    this.wsConnected = false;
    this.pollingInterval = null;
    this.telemetryListeners = [];
    this.latestTelemetry = null;

    this.initNavigation();
    this.initWebSocket();
  }

  initNavigation() {
    // Mobile navigation toggle
    const toggleBtn = document.getElementById('mobileNavToggle');
    const navLinks = document.getElementById('navLinks');
    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
    }

    // Highlight current page nav item
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(item => {
      const link = item.querySelector('a');
      if (link) {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/') || (currentPath !== '/' && href !== '/' && currentPath.startsWith(href))) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.wsConnected = true;
        this.updateConnectionBadge('connected', 'WS LIVE');
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleTelemetryUpdate(data);
        } catch (e) {
          console.error("Error parsing telemetry WebSocket data", e);
        }
      };

      this.ws.onerror = () => {
        this.handleConnectionLoss();
      };

      this.ws.onclose = () => {
        this.handleConnectionLoss();
      };
    } catch (err) {
      this.handleConnectionLoss();
    }
  }

  handleConnectionLoss() {
    this.wsConnected = false;
    this.updateConnectionBadge('polling', 'HTTP POLL');
    if (!this.pollingInterval) {
      this.startPollingFallback();
    }
  }

  startPollingFallback() {
    const poll = async () => {
      try {
        const res = await fetch('/api/telemetry');
        if (res.ok) {
          const data = await res.json();
          this.handleTelemetryUpdate(data);
        } else {
          this.updateConnectionBadge('offline', 'OFFLINE');
        }
      } catch (err) {
        this.updateConnectionBadge('offline', 'OFFLINE');
      }
    };
    poll();
    this.pollingInterval = setInterval(poll, 1500);
  }

  handleTelemetryUpdate(data) {
    this.latestTelemetry = data;
    
    // Update global status dot
    const status = data.status || {};
    const dot = document.getElementById('globalStatusDot');
    const text = document.getElementById('globalStatusText');
    
    if (dot && text) {
      if (status.simulation_active) {
        dot.className = 'status-dot simulation pulse';
        text.textContent = 'SIMULATION ACTIVE';
      } else if (status.esp32_connected) {
        dot.className = 'status-dot pulse';
        text.textContent = 'ESP32 ONLINE';
      } else {
        dot.className = 'status-dot offline';
        text.textContent = 'HARDWARE OFFLINE';
      }
    }

    // Notify registered page listeners
    this.telemetryListeners.forEach(callback => callback(data));
  }

  updateConnectionBadge(state, label) {
    const linkBadge = document.getElementById('backendLinkBadge');
    if (linkBadge) {
      linkBadge.textContent = label;
      linkBadge.style.color = state === 'connected' ? 'var(--accent-cyan)' : (state === 'polling' ? 'var(--accent-yellow)' : 'var(--accent-red)');
    }
  }

  onTelemetry(callback) {
    this.telemetryListeners.push(callback);
    if (this.latestTelemetry) {
      callback(this.latestTelemetry);
    }
  }
}

// Global instance
window.TrinetraApp = new TrinetraAppCore();
