/**
 * TRINETRA Exploded-View & 3D Component Labels Controller
 * Powered by GSAP Timelines & Three.js Projection
 * Delivers real-time 3D bill-boarded component name badges, interactive part isolation,
 * smooth 8-module engineering disassembly, and telemetry spec cards from the official architecture poster.
 */

class TrinetraExplodedView {
  constructor(robot3D) {
    this.robot3D = robot3D;
    this.isExploded = false;
    this.labelsVisible = true;
    this.labels = [];

    // Official 8-Component Hardware Metadata from System Specification Poster
    this.moduleMetadata = {
      camera: {
        id: "MOD-01",
        name: "Camera Module (V3 80 Pro)",
        badge: "OPTICAL & AUDIO",
        purpose: "1080P HD wide-angle reconnaissance camera with 8-LED ring lighting, built-in microphone for two-way audio communication, and live RTSP/WebRTC uplink via Sutrovich integration.",
        route: "/camera",
        status: "OPERATIONAL",
        specs: [
          { label: "Camera Model", value: "V3 80 Pro (1080P Full HD)" },
          { label: "Night Illumination", value: "8-LED Ring Illuminator Array" },
          { label: "Audio Receiver", value: "Built-in Microphone (Two-Way)" },
          { label: "App Integration", value: "Connected to Sutrovich App" },
          { label: "Operating Power", value: "5V Regulated Supply" },
          { label: "Tactical Role", value: "Visual Reconnaissance & Comms" }
        ]
      },
      gps: {
        id: "MOD-02",
        name: "GPS Module (Neo-6M)",
        badge: "SATELLITE NAVIGATION",
        purpose: "High-sensitivity satellite GNSS positioning module providing real-time latitude, longitude, and altitude for tracking the rover and geo-tagging detected landmines.",
        route: "/gps",
        status: "LOCKED (3D FIX)",
        specs: [
          { label: "Receiver Model", value: "u-blox Neo-6M GNSS" },
          { label: "Antenna Type", value: "Raised Mast Ceramic Puck Dome" },
          { label: "Hardware Link", value: "ESP32 Jumper Wires (TX2/RX2)" },
          { label: "Power Source", value: "5V Dedicated Power Bank" },
          { label: "Telemetry Stream", value: "Latitude, Longitude, Altitude" },
          { label: "Operational Mission", value: "Geo-Tagging Detected Mines" }
        ]
      },
      metaldetector: {
        id: "MOD-03",
        name: "Metal Detector (Electromagnetic Induction)",
        badge: "INDUCTION CORE",
        purpose: "Electromagnetic induction search coil system with onboard OLED display for identifying buried ferrous and non-ferrous metals and measuring anomaly signal strength.",
        route: "/sensors",
        status: "ACTIVE SCANNING",
        specs: [
          { label: "Detection Tech", value: "Electromagnetic Induction" },
          { label: "Search Loop", value: "8-Spoke Torus Copper Induction Coil" },
          { label: "Console Display", value: "OLED Metal ID & Signal Meter" },
          { label: "Target Detection", value: "Ferrous & Non-Ferrous Metals" },
          { label: "Controller Link", value: "Arduino Uno (I2C / Digital Pins)" },
          { label: "Sensitivity", value: "Continuous 0-100% Flux Scale" }
        ]
      },
      rcbot: {
        id: "MOD-04",
        name: "RC Bot Mobile Platform (4 Motors + L298N)",
        badge: "4WD MOBILITY PLATFORM",
        purpose: "All-terrain 4-wheel drive robotic mobility platform powered by 4x 12V 500 RPM DC gear motors, an L298N dual H-bridge motor driver, Arduino Uno microcontroller, and HC-05 Bluetooth.",
        route: "/system",
        status: "NOMINAL",
        specs: [
          { label: "Drive Motors", value: "4 x 12V DC Motors (500 RPM)" },
          { label: "Motor Driver", value: "L298N Dual H-Bridge Module" },
          { label: "Microcontroller", value: "Arduino Uno (Bot & Sensors)" },
          { label: "Wireless Control", value: "HC-05 Bluetooth Module" },
          { label: "Wheels & Rims", value: "4 Rubber Tires / Yellow 5-Spoke" },
          { label: "Chassis Frame", value: "Anodized Dual-Deck Aluminum" }
        ]
      },
      nqr: {
        id: "MOD-05",
        name: "NQR Structure (Silencer + Mesh + Cotton)",
        badge: "EXPLOSIVE SENSING",
        purpose: "Non-Coherent Resonance Structure featuring a silencer housing with wire mesh and absorbent cotton core, motorized mechanism for explosive vapor and particulate sampling.",
        route: "/sensors",
        status: "STANDBY / READY",
        specs: [
          { label: "Structure Assembly", value: "Silencer + Wire Mesh + Cotton" },
          { label: "Detection Objective", value: "Extracting / Detecting Explosives" },
          { label: "Actuation Type", value: "Motorized Sampling Mechanism" },
          { label: "Power Supply", value: "12V Battery Pack Link" },
          { label: "Filtration Layer", value: "Fine Mesh Particulate Separation" },
          { label: "Verification Role", value: "Secondary Explosive Validation" }
        ]
      },
      microphone: {
        id: "MOD-06",
        name: "Microphone (For Buzzer Audio Identification)",
        badge: "AUDIO TELEMETRY",
        purpose: "Dedicated acoustic pickup sensor tuned to detect metal detector buzzer alarms and stream real-time audio confirmation directly to the operator's mobile application.",
        route: "/camera",
        status: "MONITORING",
        specs: [
          { label: "Sensor Type", value: "High-Sensitivity Acoustic Pickup" },
          { label: "Target Sound", value: "Metal Detector Piezo Buzzer Tone" },
          { label: "Transmission", value: "Sent to Phone via Camera App" },
          { label: "Connection", value: "Camera Module (Internal/External)" },
          { label: "Tactical Benefit", value: "Audible Remote Mine Confirmation" },
          { label: "Redundancy Channel", value: "Dual Audible & Visual Alarm" }
        ]
      },
      esp32: {
        id: "MOD-07",
        name: "ESP32 Microcontroller Unit",
        badge: "CENTRAL COMPUTE & WI-FI",
        purpose: "Central 32-bit dual-core wireless microcontroller running FreeRTOS, managing GPS NMEA decoding, multi-sensor data aggregation, WebSocket streaming, and hardware heartbeats.",
        route: "/system",
        status: "WI-FI LINK ACTIVE",
        specs: [
          { label: "Processor Core", value: "ESP32 Dual-Core Tensilica 240MHz" },
          { label: "Wireless Protocols", value: "Wi-Fi 802.11 b/g/n + BLE 4.2" },
          { label: "RF Antenna", value: "High-Gain Brass-Mounted Whip" },
          { label: "Sensors Handled", value: "Neo-6M GPS & System Telemetry" },
          { label: "Heartbeat Timer", value: "10s Hardware Timeout Monitor" },
          { label: "Telemetry Stream", value: "WebSocket Broadcast (/ws/telemetry)" }
        ]
      },
      battery: {
        id: "MOD-08",
        name: "Battery (12V LiPo Power Source)",
        badge: "PRIMARY POWER SOURCE",
        purpose: "High-discharge 3S 12V Lithium-Polymer rechargeable battery powering the 4WD drive motors, L298N driver, NQR motorized structure, and onboard electronics.",
        route: "/system",
        status: "CHARGED (12.4V)",
        specs: [
          { label: "Cell Chemistry", value: "12V 3S Lithium Polymer (LiPo)" },
          { label: "Primary Loads", value: "4x 500 RPM DC Motors + L298N" },
          { label: "Auxiliary Loads", value: "NQR Motorized Structure" },
          { label: "Secondary Source", value: "5V Power Bank (ESP32 & GPS)" },
          { label: "Safety System", value: "Deck Secured / Purple Straps" },
          { label: "Mission Endurance", value: "3+ Hours Continuous Operation" }
        ]
      }
    };

    // Backward-compatibility aliases
    this.moduleMetadata.controller = this.moduleMetadata.esp32;
    this.moduleMetadata.battery_drive = this.moduleMetadata.rcbot;

    // 3D Anchor Definitions for Interactive Bill-boarded Labels
    this.labelDefs = [
      {
        key: "camera",
        idx: "01",
        name: "Camera Module (V3 80 Pro)",
        badgeClass: "",
        localAnchor: new THREE.Vector3(0, 1.55, 0.45)
      },
      {
        key: "gps",
        idx: "02",
        name: "GPS Module (Neo-6M)",
        badgeClass: "label-yellow",
        localAnchor: new THREE.Vector3(0.12, 1.95, -0.05)
      },
      {
        key: "metaldetector",
        idx: "03",
        name: "Metal Detector (Induction Coil + Display)",
        badgeClass: "label-red",
        localAnchor: new THREE.Vector3(0, 0.35, 1.95)
      },
      {
        key: "rcbot",
        idx: "04",
        name: "RC Bot Platform (4 Motors + L298N)",
        badgeClass: "label-yellow",
        localAnchor: new THREE.Vector3(-0.85, 0.55, 0.65)
      },
      {
        key: "nqr",
        idx: "05",
        name: "NQR Structure (Silencer + Mesh + Cotton)",
        badgeClass: "",
        localAnchor: new THREE.Vector3(0, 0.6, 1.45)
      },
      {
        key: "microphone",
        idx: "06",
        name: "Microphone (For Buzzer Audio)",
        badgeClass: "label-green",
        localAnchor: new THREE.Vector3(-0.35, 0.55, 0.72)
      },
      {
        key: "esp32",
        idx: "07",
        name: "ESP32 Microcontroller Unit",
        badgeClass: "",
        localAnchor: new THREE.Vector3(0.26, 1.35, -0.2)
      },
      {
        key: "battery",
        idx: "08",
        name: "Battery (12V LiPo Power Source)",
        badgeClass: "label-yellow",
        localAnchor: new THREE.Vector3(0.12, 0.95, -0.05)
      }
    ];

    this.initUI();

    // Hook frame-synchronized label position tracking directly into the Three.js render loop
    if (this.robot3D) {
      this.robot3D.onPostRender = () => this.updateLabelPositions();
      this.create3DLabels();
    }
  }

  initUI() {
    // Explode toggle button
    const btnExplode = document.getElementById('btnExplodeComponents');
    if (btnExplode) {
      btnExplode.addEventListener('click', () => this.toggleExplode());
    }

    // Component labels toggle button
    const btnToggleLabels = document.getElementById('btnToggleLabels');
    if (btnToggleLabels) {
      btnToggleLabels.addEventListener('click', () => {
        this.labelsVisible = !this.labelsVisible;
        btnToggleLabels.classList.toggle('active', this.labelsVisible);
        btnToggleLabels.innerHTML = this.labelsVisible ? '🏷️ Labels: ON' : '🏷️ Labels: OFF';
        if (this.labelsVisible) {
          this.create3DLabels();
        } else {
          this.remove3DLabels();
        }
      });
    }

    // Connect selection callback to 3D robot
    if (this.robot3D) {
      this.robot3D.options.onSelectModule = (key) => this.showModuleCard(key);
    }

    // Close drawer button
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');
    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', () => {
        const drawer = document.getElementById('moduleInspectorDrawer');
        if (drawer) drawer.classList.remove('open');
      });
    }
  }

  toggleExplode() {
    if (!this.robot3D || !this.robot3D.modules) return;

    if (this.isExploded) {
      this.assemble();
    } else {
      this.explode();
    }
  }

  explode() {
    this.isExploded = true;
    const btn = document.getElementById('btnExplodeComponents');
    if (btn) {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 13H5v-2h14v2z"/>
        </svg> Assemble Robot
      `;
      btn.classList.add('btn-amber');
    }

    // Smooth camera transition to optimal exploded inspection angle
    if (window.gsap) {
      gsap.to(this.robot3D.camera.position, {
        x: 4.8,
        y: 3.5,
        z: 5.0,
        duration: 1.4,
        ease: "power2.out"
      });
      gsap.to(this.robot3D.controls.target, {
        x: 0,
        y: 0.85,
        z: 0.35,
        duration: 1.4,
        ease: "power2.out"
      });

      // Disassemble all 8 operational modules cleanly
      const m = this.robot3D.modules;

      // 01: Camera moves forward and elevates
      if (m.camera) {
        gsap.to(m.camera.position, { x: 0, y: 0.85, z: 1.1, duration: 1.2, ease: "back.out(1.2)" });
      }

      // 02: GPS mast elevates higher
      if (m.gps) {
        gsap.to(m.gps.position, { x: 0.15, y: 1.15, z: -0.25, duration: 1.2, ease: "back.out(1.2)", delay: 0.08 });
      }

      // 03: Metal detector extends forward and downward
      if (m.metaldetector) {
        gsap.to(m.metaldetector.position, { x: 0, y: -0.22, z: 1.35, duration: 1.2, ease: "back.out(1.2)" });
      }

      // 04: RC Bot mobile platform lowers and shifts backward
      if (m.rcbot) {
        gsap.to(m.rcbot.position, { x: 0, y: -0.28, z: -0.5, duration: 1.2, ease: "back.out(1.2)" });
      }

      // 05: NQR Structure elevates and tilts forward
      if (m.nqr) {
        gsap.to(m.nqr.position, { x: 0.45, y: 0.55, z: 1.15, duration: 1.2, ease: "back.out(1.2)", delay: 0.1 });
      }

      // 06: Microphone floats leftward
      if (m.microphone) {
        gsap.to(m.microphone.position, { x: -0.75, y: 0.4, z: 0.8, duration: 1.2, ease: "back.out(1.2)", delay: 0.12 });
      }

      // 07: ESP32 lifts upward-right
      if (m.esp32) {
        gsap.to(m.esp32.position, { x: 0.4, y: 0.95, z: -0.6, duration: 1.2, ease: "back.out(1.2)", delay: 0.15 });
      }

      // 08: Battery lifts upward-left
      if (m.battery) {
        gsap.to(m.battery.position, { x: -0.4, y: 0.7, z: -0.15, duration: 1.2, ease: "back.out(1.2)", delay: 0.14 });
      }
    }
  }

  assemble() {
    this.isExploded = false;
    const btn = document.getElementById('btnExplodeComponents');
    if (btn) {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg> Explore Components
      `;
      btn.classList.remove('btn-amber');
    }

    // Close drawer
    const drawer = document.getElementById('moduleInspectorDrawer');
    if (drawer) drawer.classList.remove('open');

    // Smoothly restore all components to zero offsets
    if (window.gsap) {
      const m = this.robot3D.modules;
      [m.camera, m.gps, m.metaldetector, m.rcbot, m.nqr, m.microphone, m.esp32, m.battery].forEach(mod => {
        if (mod) {
          gsap.to(mod.position, { x: 0, y: 0, z: 0, duration: 1.0, ease: "power2.inOut" });
        }
      });

      // Restore camera
      this.robot3D.resetCamera();
    }
  }

  create3DLabels() {
    this.remove3DLabels();
    if (!this.labelsVisible || !this.robot3D || !this.robot3D.container) return;

    const container = this.robot3D.container;

    this.labelDefs.forEach(def => {
      const el = document.createElement('div');
      el.className = `component-3d-label ${def.badgeClass || ''}`;
      el.setAttribute('data-module', def.key);
      el.innerHTML = `
        <span class="label-idx">${def.idx}</span>
        <span class="label-text">${def.name}</span>
      `;
      el.title = `Click to inspect ${def.name}`;

      el.addEventListener('mouseenter', () => {
        this.robot3D.highlightHoverModule(def.key);
        el.classList.add('highlighted');
      });

      el.addEventListener('mouseleave', () => {
        this.robot3D.highlightHoverModule(null);
        el.classList.remove('highlighted');
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showModuleCard(def.key);
        this.robot3D.selectModule(def.key);
      });

      container.appendChild(el);
      this.labels.push({ element: el, def: def });
    });

    this.updateLabelPositions();
  }

  updateLabelPositions() {
    if (!this.labelsVisible || !this.robot3D || !this.robot3D.camera || !this.robot3D.container) return;

    const camera = this.robot3D.camera;
    const width = this.robot3D.container.clientWidth;
    const height = this.robot3D.container.clientHeight;

    this.labels.forEach(lbl => {
      const def = lbl.def;
      const modGroup = this.robot3D.modules[def.key];

      // If module is absent or hidden by part isolation, hide label
      if (!modGroup || modGroup.visible === false) {
        lbl.element.style.display = 'none';
        return;
      }

      // Compute exact 3D world position taking module translation into account
      const worldPos = def.localAnchor.clone();
      modGroup.localToWorld(worldPos);

      // Project into NDC coordinates (-1 to 1)
      const p = worldPos.clone().project(camera);

      // Check if behind camera near/far clipping plane
      if (p.z > 1.0) {
        lbl.element.style.display = 'none';
        return;
      }

      // Convert NDC to container pixel coordinates
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-(p.y * 0.5) + 0.5) * height;

      lbl.element.style.display = 'flex';
      lbl.element.style.left = `${x}px`;
      lbl.element.style.top = `${y}px`;
    });
  }

  remove3DLabels() {
    this.labels.forEach(l => l.element.remove());
    this.labels = [];
  }

  showModuleCard(moduleKey) {
    const meta = this.moduleMetadata[moduleKey];
    if (!meta) return;

    const drawer = document.getElementById('moduleInspectorDrawer');
    if (!drawer) return;

    document.getElementById('drawerTag').textContent = `${meta.id} • ${meta.badge}`;
    document.getElementById('drawerTitle').textContent = meta.name;
    document.getElementById('drawerDesc').textContent = meta.purpose;

    const listEl = document.getElementById('drawerSpecsList');
    listEl.innerHTML = '';
    meta.specs.forEach(spec => {
      const row = document.createElement('div');
      row.className = 'drawer-telemetry-row';
      row.innerHTML = `<span>${spec.label}</span><span>${spec.value}</span>`;
      listEl.appendChild(row);
    });

    const linkBtn = document.getElementById('drawerInspectLink');
    if (linkBtn) {
      linkBtn.href = meta.route;
      linkBtn.textContent = `Open ${meta.badge} Console →`;
    }

    drawer.classList.add('open');

    // Highlight corresponding item in side-panel directory list if present
    document.querySelectorAll('.component-directory-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-module') === moduleKey);
    });
  }
}

window.TrinetraExplodedView = TrinetraExplodedView;
