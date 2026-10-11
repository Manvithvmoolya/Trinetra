/**
 * TRINETRA Tactical GPS Map Controller
 * Powered by Leaflet & OpenStreetMap
 * Supports live robot tracking, heading rotation, breadcrumb history,
 * distinction between Real GPS vs Simulated coordinates, and Interactive Location Pinning.
 */

class TrinetraMap {
  constructor(mapContainerId, options = {}) {
    this.containerId = mapContainerId;
    this.container = document.getElementById(mapContainerId);
    if (!this.container) return;

    this.options = Object.assign({
      zoom: 17,
      autoFollow: false,
      enablePinning: true
    }, options);

    this.map = null;
    this.robotMarker = null;
    this.breadcrumbPolyline = null;
    this.autoFollow = this.options.autoFollow;
    this.currentProvider = localStorage.getItem('trinetra_map_provider') || 'carto_dark';
    this.apiKey = localStorage.getItem('trinetra_map_api_key') || '';
    this.currentTileLayer = null;
    this.pinnedMarkers = new Map();

    this.initMap();
    this.initControls();
    this.loadPinnedLocations();
    this.subscribeTelemetry();
    this.initApiKeyModal();
  }

  initMap() {
    if (typeof L === 'undefined') {
      console.error("[TRINETRA MAP] Critical Error: Leaflet library 'L' is undefined!");
      if (this.container) {
        this.container.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ef4444;font-family:monospace;text-align:center;padding:2rem;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">⚠️</div>
            <div style="font-weight:bold;font-size:1.1rem;">LEAFLET ENGINE FAILED TO LOAD</div>
            <p style="color:#94a3b8;font-size:0.85rem;margin-top:0.5rem;">Please check local script assets or internet connectivity.</p>
          </div>
        `;
      }
      return;
    }

    // Default Mangalore/Udupi reference coordinates or last saved
    const initialCoords = [12.9141, 74.8560];

    this.map = L.map(this.containerId, {
      center: initialCoords,
      zoom: this.options.zoom,
      zoomControl: false,
      preferCanvas: false
    });

    // Zoom controls top-left
    L.control.zoom({ position: 'topleft' }).addTo(this.map);

    // Apply initial configured or default tile layer
    this.applyTileLayer(this.currentProvider, this.apiKey);

    // Breadcrumb polyline
    this.breadcrumbPolyline = L.polyline([], {
      color: '#00f0ff',
      weight: 3,
      opacity: 0.75,
      dashArray: '6, 6'
    }).addTo(this.map);

    // Robot Heading Icon
    const robotIcon = L.divIcon({
      className: 'trinetra-robot-map-icon',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          background: rgba(5, 8, 17, 0.9);
          border: 2px solid #00f0ff;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <svg id="robotHeadingArrow" viewBox="0 0 24 24" width="20" height="20" fill="#facc15" style="transform: rotate(0deg); transition: transform 0.3s ease;">
            <polygon points="12,2 22,22 12,17 2,22"/>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.robotMarker = L.marker(initialCoords, { icon: robotIcon }).addTo(this.map);
    this.robotMarker.bindPopup(`<b>TRINETRA MK-1</b><br>Landmine Detection Rover`);

    // Map Click for Pin Drop Mode
    this.map.on('click', (e) => {
      if (this.pinModeActive) {
        this.promptDropPinAt(e.latlng.lat, e.latlng.lng);
      }
    });

    // Invalidate map size multiple times to ensure proper rendering inside flex/grid containers
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 150);
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 500);
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 1200);
    window.addEventListener('resize', () => { if (this.map) this.map.invalidateSize(true); });
  }

  initControls() {
    // Center on robot button
    const btnCenter = document.getElementById('btnCenterMap');
    if (btnCenter) {
      btnCenter.addEventListener('click', () => this.centerOnRobot());
    }

    // Auto-follow toggle button
    const btnFollow = document.getElementById('btnToggleFollow');
    if (btnFollow) {
      btnFollow.addEventListener('click', () => {
        this.autoFollow = !this.autoFollow;
        btnFollow.classList.toggle('active', this.autoFollow);
      });
    }

    // Pin Current Robot Location button
    const btnPinCurrent = document.getElementById('btnPinCurrentLocation');
    if (btnPinCurrent) {
      btnPinCurrent.addEventListener('click', () => {
        if (this.currentLocation) {
          this.promptDropPinAt(this.currentLocation.latitude, this.currentLocation.longitude, "Robot Location Pin");
        } else {
          alert("Waiting for valid GPS coordinates before pinning location.");
        }
      });
    }

    // Toggle Drop-Pin Mode button
    const btnDropPin = document.getElementById('btnToggleDropPinMode');
    if (btnDropPin) {
      btnDropPin.addEventListener('click', () => {
        this.pinModeActive = !this.pinModeActive;
        btnDropPin.classList.toggle('active', this.pinModeActive);
        if (this.pinModeActive) {
          this.container.style.cursor = 'crosshair';
          btnDropPin.style.borderColor = 'var(--accent-yellow)';
        } else {
          this.container.style.cursor = '';
          btnDropPin.style.borderColor = '';
        }
      });
    }

    // Toggle Pinned Locations Drawer button
    const btnViewPins = document.getElementById('btnTogglePinnedList');
    const pinsDrawer = document.getElementById('pinnedLocationsDrawer');
    if (btnViewPins && pinsDrawer) {
      btnViewPins.addEventListener('click', () => {
        pinsDrawer.classList.toggle('show');
      });
    }

    // Open Map Settings / API Key modal button
    const btnOpenKeyModal = document.getElementById('btnOpenMapKeyModal');
    const keyModal = document.getElementById('mapApiKeyModal');
    if (btnOpenKeyModal && keyModal) {
      btnOpenKeyModal.addEventListener('click', () => {
        keyModal.classList.add('open');
        const inputKey = document.getElementById('inputMapApiKey');
        const selectProvider = document.getElementById('selectMapProvider');
        if (inputKey) inputKey.value = this.apiKey;
        if (selectProvider) selectProvider.value = this.currentProvider;
      });
    }

    // Direct Quick Switcher Buttons (OSM, Dark, Satellite)
    const btnQuickOsm = document.getElementById('btnQuickTileOsm');
    if (btnQuickOsm) {
      btnQuickOsm.addEventListener('click', () => this.applyTileLayer('osm_standard'));
    }
    const btnQuickDark = document.getElementById('btnQuickTileDark');
    if (btnQuickDark) {
      btnQuickDark.addEventListener('click', () => this.applyTileLayer('carto_dark'));
    }
    const btnQuickSat = document.getElementById('btnQuickTileSat');
    if (btnQuickSat) {
      btnQuickSat.addEventListener('click', () => this.applyTileLayer('google_hybrid'));
    }
  }

  applyTileLayer(provider, apiKey = '') {
    if (!this.map) return;

    if (this.currentTileLayer) {
      try {
        this.map.removeLayer(this.currentTileLayer);
      } catch (e) {}
    }

    // Guard: If provider requires a commercial API key but none is present, fallback gracefully!
    const keyRequiredProviders = ['mapbox_dark', 'mapbox_satellite', 'maptiler_dark', 'maptiler_satellite', 'stadia_dark'];
    if (keyRequiredProviders.includes(provider) && (!apiKey || apiKey.trim().length < 8)) {
      console.warn(`[TRINETRA MAP] Provider '${provider}' requires an API key. Falling back to OpenStreetMap.`);
      provider = 'osm_standard';
      apiKey = '';
    }

    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    let options = { maxZoom: 19, crossOrigin: true };

    switch (provider) {
      case 'carto_dark':
        // Reliable Carto CDN url without retina formatting issues
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        attribution = '&copy; OpenStreetMap &copy; CARTO';
        options = { maxZoom: 20, subdomains: 'abcd', crossOrigin: true };
        break;

      case 'google_hybrid':
        tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        attribution = '&copy; Google Maps';
        options = { maxZoom: 21, crossOrigin: true };
        break;

      case 'esri_satellite':
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        attribution = '&copy; Esri &copy; Maxar';
        options = { maxZoom: 19, crossOrigin: true };
        break;

      case 'mapbox_dark':
        tileUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${apiKey}`;
        attribution = '&copy; Mapbox &copy; OpenStreetMap';
        options = { tileSize: 512, zoomOffset: -1, maxZoom: 22, crossOrigin: true };
        break;

      case 'mapbox_satellite':
        tileUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${apiKey}`;
        attribution = '&copy; Mapbox &copy; Maxar';
        options = { tileSize: 512, zoomOffset: -1, maxZoom: 22, crossOrigin: true };
        break;

      case 'maptiler_dark':
        tileUrl = `https://api.maptiler.com/maps/backdrop-dark/{z}/{x}/{y}.png?key=${apiKey}`;
        attribution = '&copy; MapTiler &copy; OpenStreetMap';
        options = { tileSize: 512, zoomOffset: -1, maxZoom: 20, crossOrigin: true };
        break;

      case 'maptiler_satellite':
        tileUrl = `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${apiKey}`;
        attribution = '&copy; MapTiler &copy; Maxar';
        options = { tileSize: 512, zoomOffset: -1, maxZoom: 20, crossOrigin: true };
        break;

      case 'stadia_dark':
        tileUrl = `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png?api_key=${apiKey}`;
        attribution = '&copy; Stadia Maps &copy; OpenStreetMap';
        options = { maxZoom: 20, crossOrigin: true };
        break;

      case 'osm_standard':
      default:
        provider = 'osm_standard';
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        attribution = '&copy; OpenStreetMap contributors';
        options = { maxZoom: 19, crossOrigin: true };
        break;
    }

    options.attribution = attribution;
    
    try {
      this.currentTileLayer = L.tileLayer(tileUrl, options).addTo(this.map);

      // Auto-fallback listener if tiles fail on current provider
      let failCount = 0;
      this.currentTileLayer.on('tileerror', () => {
        failCount++;
        if (failCount === 4) {
          console.warn(`[TRINETRA MAP] Layer [${provider}] tile loading error. Auto-falling back to OpenStreetMap / Google.`);
          if (provider !== 'osm_standard') {
            this.applyTileLayer('osm_standard', '');
          } else {
            this.applyTileLayer('google_hybrid', '');
          }
        }
      });
    } catch (layerErr) {
      console.error("[TRINETRA MAP] Error adding tile layer:", layerErr);
    }

    this.currentProvider = provider;
    this.apiKey = apiKey;

    localStorage.setItem('trinetra_map_provider', provider);
    localStorage.setItem('trinetra_map_api_key', apiKey);

    // Update layer UI pills if present
    document.querySelectorAll('.btn-tile-quick').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.provider === provider);
    });

    const badge = document.getElementById('mapTileProviderBadge');
    if (badge) {
      badge.textContent = provider.toUpperCase().replace('_', ' ');
    }

    // Force map recalculation
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 80);
    setTimeout(() => { if (this.map) this.map.invalidateSize(true); }, 400);
  }

  initApiKeyModal() {
    const modal = document.getElementById('mapApiKeyModal');
    const form = document.getElementById('mapApiKeyForm');
    const btnClose = document.getElementById('btnCloseMapKeyModal');

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.remove('open'));
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const provider = document.getElementById('selectMapProvider').value;
        const key = document.getElementById('inputMapApiKey').value.trim();

        this.applyTileLayer(provider, key);
        if (modal) modal.classList.remove('open');
        alert(`Map tile provider updated to [${provider}]. Saved to settings!`);
      });
    }
  }

  subscribeTelemetry() {
    if (window.TrinetraApp) {
      window.TrinetraApp.onTelemetry((telemetry) => {
        if (telemetry.location) {
          this.updateLocation(telemetry.location);
        }
        if (telemetry.pins) {
          this.syncPins(telemetry.pins);
        }
      });
    }
  }

  updateLocation(loc) {
    this.currentLocation = loc;
    const latlng = [loc.latitude, loc.longitude];

    // Update marker position
    if (this.robotMarker) {
      this.robotMarker.setLatLng(latlng);

      // Rotate heading arrow
      const arrow = document.getElementById('robotHeadingArrow');
      if (arrow && loc.heading !== undefined && loc.heading !== null) {
        arrow.style.transform = `rotate(${loc.heading}deg)`;
      }
    }

    // Append to breadcrumb trail
    if (this.breadcrumbPolyline) {
      const latlngs = this.breadcrumbPolyline.getLatLngs();
      latlngs.push(latlng);
      if (latlngs.length > 250) latlngs.shift();
      this.breadcrumbPolyline.setLatLngs(latlngs);
    }

    // Auto-follow if enabled
    if (this.autoFollow) {
      this.map.panTo(latlng, { animate: true, duration: 0.5 });
    }

    // Update HUD labels
    this.updateHud(loc);
  }

  updateHud(loc) {
    const latEl = document.getElementById('mapHudLatitude');
    const lonEl = document.getElementById('mapHudLongitude');
    const speedEl = document.getElementById('mapHudSpeed');
    const badgeEl = document.getElementById('mapHudSourceBadge');
    const timeEl = document.getElementById('mapHudTimestamp');

    if (latEl) latEl.textContent = loc.latitude.toFixed(6);
    if (lonEl) lonEl.textContent = loc.longitude.toFixed(6);
    if (speedEl) speedEl.textContent = `${(loc.speed || 0).toFixed(1)} m/s`;
    
    if (timeEl && loc.timestamp) {
      const d = new Date(loc.timestamp);
      timeEl.textContent = d.toLocaleTimeString();
    }

    if (badgeEl) {
      if (loc.is_simulated) {
        badgeEl.textContent = 'DEMO / SIMULATED GPS';
        badgeEl.className = 'status-badge warning';
        badgeEl.style.color = 'var(--accent-yellow)';
      } else {
        badgeEl.textContent = 'REAL HARDWARE GPS';
        badgeEl.className = 'status-badge success';
        badgeEl.style.color = 'var(--accent-green)';
      }
    }
  }

  centerOnRobot() {
    if (this.currentLocation) {
      this.map.flyTo([this.currentLocation.latitude, this.currentLocation.longitude], this.options.zoom, {
        duration: 1.2
      });
    }
  }

  // =========================================================================
  // Interactive Location Pinning System
  // =========================================================================

  async promptDropPinAt(lat, lng, defaultLabel = "Tactical Waypoint") {
    const label = prompt("Enter label for pinned location:", defaultLabel);
    if (!label) return;

    const pinType = prompt("Type (waypoint, suspected_mine, rendezvous, obstacle):", "suspected_mine") || "waypoint";

    try {
      const res = await fetch('/api/location/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          label: label,
          pin_type: pinType
        })
      });

      if (res.ok) {
        const newPin = await res.json();
        this.addPinMarker(newPin);
        this.renderPinsDrawerList();
        // Deactivate drop pin mode after successful pin
        this.pinModeActive = false;
        const btnDropPin = document.getElementById('btnToggleDropPinMode');
        if (btnDropPin) btnDropPin.classList.remove('active');
        this.container.style.cursor = '';
      }
    } catch (err) {
      console.error("Failed to pin location:", err);
    }
  }

  async loadPinnedLocations() {
    try {
      const res = await fetch('/api/location/pins');
      if (res.ok) {
        const pins = await res.json();
        this.syncPins(pins);
      }
    } catch (err) {
      console.error("Error loading pins:", err);
    }
  }

  syncPins(pins) {
    if (!pins || !Array.isArray(pins)) return;
    if (!this.pinnedMarkers) this.pinnedMarkers = new Map();

    // Remove markers not in list
    const incomingIds = new Set(pins.map(p => p.id));
    for (const [id, marker] of this.pinnedMarkers.entries()) {
      if (!incomingIds.has(id)) {
        if (this.map && marker) {
          try { this.map.removeLayer(marker); } catch (e) {}
        }
        this.pinnedMarkers.delete(id);
      }
    }

    // Add or update markers
    pins.forEach(pin => {
      if (!this.pinnedMarkers.has(pin.id)) {
        this.addPinMarker(pin);
      }
    });

    this.renderPinsDrawerList(pins);
  }

  addPinMarker(pin) {
    const isMine = pin.pin_type === 'suspected_mine';
    const pinColor = isMine ? '#ef4444' : '#f59e0b';
    const pinGlyph = isMine ? '⚠️' : '📍';

    const customPinIcon = L.divIcon({
      className: 'custom-tactical-pin',
      html: `
        <div style="
          background: rgba(10, 15, 29, 0.92);
          border: 2px solid ${pinColor};
          color: #fff;
          border-radius: 8px;
          padding: 3px 6px;
          font-family: monospace;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 0 12px ${pinColor};
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>${pinGlyph}</span>
          <span>${pin.label}</span>
        </div>
      `,
      iconSize: [120, 26],
      iconAnchor: [60, 13]
    });

    const marker = L.marker([pin.latitude, pin.longitude], { icon: customPinIcon }).addTo(this.map);
    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; color: #000;">
        <b>${pin.label}</b><br>
        Type: ${pin.pin_type}<br>
        Lat: ${pin.latitude.toFixed(6)}<br>
        Lon: ${pin.longitude.toFixed(6)}<br>
        <button onclick="window.TrinetraActiveMap.deletePin('${pin.id}')" style="color: red; margin-top: 5px; cursor: pointer;">Delete Pin</button>
      </div>
    `);

    this.pinnedMarkers.set(pin.id, marker);
  }

  async deletePin(pinId) {
    try {
      const res = await fetch(`/api/location/pins/${pinId}`, { method: 'DELETE' });
      if (res.ok) {
        const marker = this.pinnedMarkers.get(pinId);
        if (marker) {
          this.map.removeLayer(marker);
          this.pinnedMarkers.delete(pinId);
        }
        this.loadPinnedLocations();
      }
    } catch (err) {
      console.error("Error deleting pin:", err);
    }
  }

  async renderPinsDrawerList(pinsList = null) {
    const listEl = document.getElementById('pinnedLocationsList');
    if (!listEl) return;

    if (!pinsList) {
      const res = await fetch('/api/location/pins');
      if (res.ok) pinsList = await res.json();
      else pinsList = [];
    }

    listEl.innerHTML = '';
    if (pinsList.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-dim); font-size: 12px; padding: 5px;">No tactical pins set yet. Click "Pin Current" or "Drop Pin" to bookmark spots.</div>';
      return;
    }

    pinsList.forEach(pin => {
      const item = document.createElement('div');
      item.className = 'pin-item';
      item.innerHTML = `
        <div>
          <div style="font-weight: 600; color: #fff;">${pin.label}</div>
          <div style="color: var(--text-dim); font-family: var(--font-mono); font-size: 10px;">
            ${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}
          </div>
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="btn-icon" title="Center" onclick="window.TrinetraActiveMap.map.flyTo([${pin.latitude}, ${pin.longitude}], 18)">🎯</button>
          <button class="pin-item-btn" title="Delete" onclick="window.TrinetraActiveMap.deletePin('${pin.id}')">✕</button>
        </div>
      `;
      listEl.appendChild(item);
    });
  }
}

window.TrinetraMap = TrinetraMap;
