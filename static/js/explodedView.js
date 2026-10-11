/**
 * TRINETRA Exploded-View Controller
 * Powered by GSAP Timelines
 * Handles smooth disassembly of the 5 Trinetra robot modules, bill-boarded 3D HUD labels,
 * inspector card telemetry, and seamless re-assembly.
 */

class TrinetraExplodedView {
  constructor(robot3D) {
    this.robot3D = robot3D;
    this.isExploded = false;
    this.timeline = null;
    this.labels = [];

    this.moduleMetadata = {
      camera: {
        id: "MOD-01",
        name: "Module 1: Optical Vision & LED Illuminator",
        purpose: "High-definition forward reconnaissance, hazardous terrain inspection, and dual LED nocturnal illumination.",
        route: "/camera",
        status: "CONFIGURABLE",
        badge: "OPTICAL UNIT",
        specs: [
          { label: "Lens Type", value: "Wide-Angle Glass Optical" },
          { label: "Illumination", value: "8-LED Ring Array" },
          { label: "Stream Format", value: "HTTP / MJPEG / WebRTC" },
          { label: "Telemetry", value: "Auxiliary 16x2 LCD Panel" }
        ]
      },
      gps: {
        id: "MOD-02",
        name: "Module 2: High-Precision GNSS / GPS",
        purpose: "Sub-meter autonomous geolocation positioning, patrol waypoint navigation, and landmine anomaly georeferencing.",
        route: "/gps",
        status: "READY",
        badge: "NAVIGATION",
        specs: [
          { label: "Receiver", value: "Multi-Constellation GNSS" },
          { label: "Antenna", value: "Raised Mast Ceramic Puck" },
          { label: "Accuracy", value: "0.8m HDOP" },
          { label: "Update Rate", value: "10 Hz Navigation Stream" }
        ]
      },
      metaldetector: {
        id: "MOD-03",
        name: "Module 3: Induction Coil Landmine Detector",
        purpose: "Pulse-induction electromagnetic search coil for locating metallic and low-metal anti-personnel landmines.",
        route: "/sensors",
        status: "OPERATIONAL",
        badge: "DETECTION CORE",
        specs: [
          { label: "Search Loop", value: "8-Spoke Torus Induction Coil" },
          { label: "Oscillator", value: "Stepped Aluminum Coil Driver" },
          { label: "Sensitivity", value: "Continuous 0-100% Scale" },
          { label: "Depth Est.", value: "Dynamic 5-25 cm Range" }
        ]
      },
      controller: {
        id: "MOD-04",
        name: "Module 4: Central ESP32 Processing Unit",
        purpose: "Real-time multi-sensor telemetry aggregation, motor drive PWM modulation, and 2.4GHz RF communication uplink.",
        route: "/system",
        status: "STANDBY / ACTIVE",
        badge: "COMPUTE & RF",
        specs: [
          { label: "MCU Core", value: "ESP32 Dual-Core Tensilica" },
          { label: "RF Link", value: "Wi-Fi 802.11 b/g/n + BLE" },
          { label: "Antenna", value: "High-Gain Brass-Mounted Whip" },
          { label: "Heartbeat", value: "10s Hardware Timeout" }
        ]
      },
      battery_drive: {
        id: "MOD-05",
        name: "Module 5: 4WD Propulsion & LiPo Power Cell",
        purpose: "All-terrain rugged knobby 4-wheel drive system with signature yellow rims and high-capacity LiPo cell pack.",
        route: "/system",
        status: "CHARGED",
        badge: "PROPULSION",
        specs: [
          { label: "Drive System", value: "Independent 4WD Motors" },
          { label: "Rims", value: "High-Relief Yellow 5-Spoke" },
          { label: "Power Pack", value: "12.6V 3S LiPo Enclosure" },
          { label: "Run Time", value: "3.5 Hours Continuous Patrol" }
        ]
      }
    };

    this.initUI();
  }

  initUI() {
    // Explode toggle button
    const btnExplode = document.getElementById('btnExplodeComponents');
    if (btnExplode) {
      btnExplode.addEventListener('click', () => this.toggleExplode());
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

    // Smooth camera transition to optimal inspection angle
    if (window.gsap) {
      gsap.to(this.robot3D.camera.position, {
        x: 4.6,
        y: 3.4,
        z: 4.8,
        duration: 1.4,
        ease: "power2.out"
      });
      gsap.to(this.robot3D.controls.target, {
        x: 0,
        y: 0.8,
        z: 0.3,
        duration: 1.4,
        ease: "power2.out"
      });

      // Disassemble 5 Modules into clearly separated positions
      const m = this.robot3D.modules;

      // 1. Camera moves forward and elevates
      if (m.camera) {
        gsap.to(m.camera.position, { x: 0, y: 0.7, z: 0.95, duration: 1.2, ease: "back.out(1.2)" });
      }

      // 2. GPS mast elevates higher and shifts back
      if (m.gps) {
        gsap.to(m.gps.position, { x: 0.2, y: 0.95, z: -0.4, duration: 1.2, ease: "back.out(1.2)", delay: 0.1 });
      }

      // 3. Metal detector extends forward and downward
      if (m.metaldetector) {
        gsap.to(m.metaldetector.position, { x: 0, y: -0.15, z: 1.25, duration: 1.2, ease: "back.out(1.2)" });
      }

      // 4. Controller lifts vertically
      if (m.controller) {
        gsap.to(m.controller.position, { x: 0.1, y: 0.85, z: -0.65, duration: 1.2, ease: "back.out(1.2)", delay: 0.15 });
      }

      // 5. Battery and wheels expand outward along X/Z
      if (m.battery_drive) {
        gsap.to(m.battery_drive.position, { x: 0, y: -0.22, z: -0.5, duration: 1.2, ease: "back.out(1.2)" });
      }

      // Display Bill-boarded Labels
      setTimeout(() => this.create3DLabels(), 700);
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

    this.remove3DLabels();

    // Close drawer
    const drawer = document.getElementById('moduleInspectorDrawer');
    if (drawer) drawer.classList.remove('open');

    // Smoothly restore all components to zero offsets
    if (window.gsap) {
      const m = this.robot3D.modules;
      [m.camera, m.gps, m.metaldetector, m.controller, m.battery_drive].forEach(mod => {
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
    if (!this.isExploded || !this.robot3D) return;

    const labelDefs = [
      { key: "camera", name: "01: OPTICAL CAMERA & LEDS", pos: new THREE.Vector3(0, 2.2, 1.4) },
      { key: "gps", name: "02: GNSS / GPS ANTENNA", pos: new THREE.Vector3(0.3, 2.8, -0.45) },
      { key: "metaldetector", name: "03: INDUCTION SEARCH COIL", pos: new THREE.Vector3(0, 0.45, 3.2) },
      { key: "controller", name: "04: ESP32 CONTROLLER & RF", pos: new THREE.Vector3(0.2, 2.0, -1.25) },
      { key: "battery_drive", name: "05: 4WD DRIVE & BATTERY", pos: new THREE.Vector3(-1.1, 0.35, -0.8) }
    ];

    const container = this.robot3D.container;

    labelDefs.forEach(def => {
      const el = document.createElement('div');
      el.className = 'component-3d-label';
      el.textContent = def.name;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showModuleCard(def.key);
      });
      container.appendChild(el);
      this.labels.push({ element: el, pos: def.pos, key: def.key });
    });

    this.updateLabelPositions();
  }

  updateLabelPositions() {
    if (!this.isExploded || !this.robot3D) return;

    const camera = this.robot3D.camera;
    const width = this.robot3D.container.clientWidth;
    const height = this.robot3D.container.clientHeight;

    this.labels.forEach(lbl => {
      const p = lbl.pos.clone().project(camera);
      // Check if behind camera
      if (p.z > 1) {
        lbl.element.style.display = 'none';
        return;
      }
      lbl.element.style.display = 'block';
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-(p.y * 0.5) + 0.5) * height;
      lbl.element.style.left = `${x}px`;
      lbl.element.style.top = `${y}px`;
    });

    if (this.isExploded) {
      requestAnimationFrame(() => this.updateLabelPositions());
    }
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
      linkBtn.textContent = `Open ${meta.badge} View →`;
    }

    drawer.classList.add('open');
  }
}

window.TrinetraExplodedView = TrinetraExplodedView;
