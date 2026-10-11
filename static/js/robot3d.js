/**
 * TRINETRA 3D Interactive Procedural Robot Viewer
 * Powered by Three.js & OrbitControls
 * Reconstructs the Trinetra landmine detection robot faithfully from the visual reference image:
 * - 4 large off-road knobby wheels with distinct 5-spoke yellow rims
 * - Front metal detector boom arm with silver oscillator cylinder and circular spoked search coil
 * - Front camera assembly with central lens, 8-LED ring illuminator, and auxiliary LCD display
 * - Raised GPS mast with white GNSS puck antenna
 * - Electronics section with ESP32 board, blue/green PCBs, wiring harnesses, and rear whip antenna
 * - Chassis frame, battery pack, and drive motors
 */

class TrinetraRobot3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = Object.assign({
      autoRotate: true,
      enableExplode: true,
      onSelectModule: null
    }, options);

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.robotRoot = null;
    
    // Group references for the 5 interactive modules + sub-assemblies
    this.modules = {
      camera: null,
      gps: null,
      metaldetector: null,
      controller: null,
      battery_drive: null,
      chassis: null
    };

    // Sub-components mapped to their parent module for raycasting
    this.raycastMeshMap = new Map();
    this.selectedModuleKey = null;
    this.hoveredModuleKey = null;

    // Animation & Raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.clock = new THREE.Clock();
    this.cameraLights = [];

    this.initScene();
    this.buildRobot();
    this.initEvents();
    this.animate();
  }

  initScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 520;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.045);

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.defaultCameraPos = new THREE.Vector3(3.8, 2.6, 4.4);
    this.defaultTarget = new THREE.Vector3(0, 0.6, 0);
    this.camera.position.copy(this.defaultCameraPos);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underneath floor
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12.0;
    this.controls.target.copy(this.defaultTarget);
    this.controls.autoRotate = this.options.autoRotate;
    this.controls.autoRotateSpeed = 1.2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2639, 1.8);
    this.scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 2.4);
    mainSun.position.set(5, 8, 5);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 25;
    mainSun.shadow.camera.left = -3;
    mainSun.shadow.camera.right = 3;
    mainSun.shadow.camera.top = 3;
    mainSun.shadow.camera.bottom = -3;
    mainSun.shadow.bias = -0.0005;
    this.scene.add(mainSun);

    // Cyan Rim Light for dramatic cyber robotics feel
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.6);
    rimLight.position.set(-6, 4, -5);
    this.scene.add(rimLight);

    // Warm Fill Light
    const warmFill = new THREE.DirectionalLight(0xfacc15, 0.6);
    warmFill.position.set(4, 2, -4);
    this.scene.add(warmFill);

    // Ground Grid & Contact Shadow plane
    const gridHelper = new THREE.GridHelper(20, 40, 0x00f0ff, 0x111c33);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);

    const shadowPlaneGeo = new THREE.PlaneGeometry(16, 16);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.001;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    // Hide loader overlay if present
    const loader = this.container.querySelector('.viewport-loading-overlay');
    if (loader) {
      setTimeout(() => loader.classList.add('hidden'), 300);
    }
  }

  buildRobot() {
    this.robotRoot = new THREE.Group();
    this.scene.add(this.robotRoot);

    // Shared realistic materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1b1f28,
      roughness: 0.4,
      metalness: 0.8
    });

    const brushedSilverMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.25,
      metalness: 0.9
    });

    const yellowRimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Bright vibrant yellow matching user image wheels
      roughness: 0.35,
      metalness: 0.4
    });

    const rubberTireMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.9,
      metalness: 0.05
    });

    const cameraBodyMat = new THREE.MeshStandardMaterial({
      color: 0x16181f,
      roughness: 0.35,
      metalness: 0.7
    });

    const glassLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1128,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.52,
      reflectivity: 0.9
    });

    const ledGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    const pcbBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.3,
      metalness: 0.2
    });

    const pcbGreenMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      roughness: 0.3,
      metalness: 0.2
    });

    const wireRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const wireBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });

    // =========================================================================
    // 1. MODULE: CHASSIS (Structural Core)
    // =========================================================================
    const chassisGroup = new THREE.Group();
    chassisGroup.name = "module_chassis";

    // Lower dual steel chassis rails
    [-0.52, 0.52].forEach(xPos => {
      const railGeo = new THREE.BoxGeometry(0.08, 0.1, 1.8);
      const rail = new THREE.Mesh(railGeo, brushedSilverMat);
      rail.position.set(xPos, 0.42, 0);
      rail.castShadow = true;
      rail.receiveShadow = true;
      chassisGroup.add(rail);

      // Silver bolt details
      for (let z = -0.7; z <= 0.7; z += 0.35) {
        const boltGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.09, 8);
        const bolt = new THREE.Mesh(boltGeo, brushedSilverMat);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(xPos + (xPos > 0 ? 0.04 : -0.04), 0.42, z);
        chassisGroup.add(bolt);
      }
    });

    // Upper black equipment deck
    const deckGeo = new THREE.BoxGeometry(1.1, 0.08, 1.7);
    const deck = new THREE.Mesh(deckGeo, darkMetalMat);
    deck.position.set(0, 0.52, 0);
    deck.castShadow = true;
    chassisGroup.add(deck);

    // Front structural cross-brace & lower skid plate
    const skidGeo = new THREE.BoxGeometry(0.95, 0.04, 1.6);
    const skid = new THREE.Mesh(skidGeo, darkMetalMat);
    skid.position.set(0, 0.34, 0);
    chassisGroup.add(skid);

    this.registerMesh(chassisGroup, 'chassis');
    this.modules.chassis = chassisGroup;
    this.robotRoot.add(chassisGroup);

    // =========================================================================
    // 2. MODULE: BATTERY & 4WD DRIVE SYSTEM (Wheels, Motors, Power Pack)
    // =========================================================================
    const batteryDriveGroup = new THREE.Group();
    batteryDriveGroup.name = "module_battery_drive";

    // Heavy LiPo Battery Pack inside chassis center
    const battGeo = new THREE.BoxGeometry(0.85, 0.28, 0.95);
    const battMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6, metalness: 0.3 });
    const batt = new THREE.Mesh(battGeo, battMat);
    batt.position.set(0, 0.68, -0.05);
    batt.castShadow = true;
    batteryDriveGroup.add(batt);

    // Battery safety tie-down straps with purple accent ties
    [-0.3, 0.2].forEach(zPos => {
      const strapGeo = new THREE.BoxGeometry(0.87, 0.29, 0.06);
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.5 });
      const strap = new THREE.Mesh(strapGeo, strapMat);
      strap.position.set(0, 0.68, zPos);
      batteryDriveGroup.add(strap);
    });

    // 4 Heavy-duty Rugged Wheels with 5-Spoke Yellow Rims
    const wheelPositions = [
      { x: -0.82, z: 0.65, isLeft: true },  // Front Left
      { x: 0.82, z: 0.65, isLeft: false },  // Front Right
      { x: -0.82, z: -0.65, isLeft: true }, // Rear Left
      { x: 0.82, z: -0.65, isLeft: false }  // Rear Right
    ];

    wheelPositions.forEach((pos, idx) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, 0.38, pos.z);

      // Heavy knobby tire
      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 28);
      const tire = new THREE.Mesh(tireGeo, rubberTireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Deep off-road tread ridges around perimeter
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const treadGeo = new THREE.BoxGeometry(0.04, 0.26, 0.05);
        const tread = new THREE.Mesh(treadGeo, rubberTireMat);
        tread.position.set(0, Math.sin(angle) * 0.38, Math.cos(angle) * 0.38);
        tread.rotation.x = angle;
        wheelGroup.add(tread);
      }

      // Bright Yellow Rim
      const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.285, 24);
      const rim = new THREE.Mesh(rimGeo, yellowRimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // 5-Spoke Cutout Pattern
      for (let s = 0; s < 5; s++) {
        const spokeAngle = (s / 5) * Math.PI * 2;
        const spokeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12);
        const spoke = new THREE.Mesh(spokeGeo, darkMetalMat);
        spoke.position.set(pos.isLeft ? -0.14 : 0.14, Math.sin(spokeAngle) * 0.14, Math.cos(spokeAngle) * 0.14);
        wheelGroup.add(spoke);
      }

      // Center silver hex nut
      const nutGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.31, 6);
      const nut = new THREE.Mesh(nutGeo, brushedSilverMat);
      nut.rotation.z = Math.PI / 2;
      wheelGroup.add(nut);

      // Drive axle motor canister connecting to chassis
      const motorGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16);
      const motor = new THREE.Mesh(motorGeo, darkMetalMat);
      motor.rotation.z = Math.PI / 2;
      motor.position.set(pos.isLeft ? 0.16 : -0.16, 0, 0);
      wheelGroup.add(motor);

      batteryDriveGroup.add(wheelGroup);
    });

    this.registerMesh(batteryDriveGroup, 'battery_drive');
    this.modules.battery_drive = batteryDriveGroup;
    this.robotRoot.add(batteryDriveGroup);

    // =========================================================================
    // 3. MODULE: FRONT METAL DETECTOR (Boom, Oscillator, Circular Spoked Loop)
    // =========================================================================
    const metalDetectorGroup = new THREE.Group();
    metalDetectorGroup.name = "module_metaldetector";

    // Heavy-duty black angled boom arm
    const boomGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.95, 16);
    const boom = new THREE.Mesh(boomGeo, darkMetalMat);
    boom.rotation.x = Math.PI / 3.4;
    boom.position.set(0, 0.44, 1.25);
    boom.castShadow = true;
    metalDetectorGroup.add(boom);

    // Stepped aluminum oscillator cylinder / coil driver body
    const oscGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.42, 24);
    const osc = new THREE.Mesh(oscGeo, brushedSilverMat);
    osc.rotation.x = Math.PI / 2.8;
    osc.position.set(0, 0.28, 1.48);
    osc.castShadow = true;
    metalDetectorGroup.add(osc);

    // Oscillator ribs
    for (let r = -0.15; r <= 0.15; r += 0.08) {
      const ribGeo = new THREE.TorusGeometry(0.125, 0.012, 8, 24);
      const rib = new THREE.Mesh(ribGeo, darkMetalMat);
      rib.position.set(0, 0.28 + r * 0.5, 1.48 + r * 0.85);
      metalDetectorGroup.add(rib);
    }

    // Articulated coil hinge knuckle
    const knuckleGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const knuckle = new THREE.Mesh(knuckleGeo, darkMetalMat);
    knuckle.position.set(0, 0.14, 1.82);
    metalDetectorGroup.add(knuckle);

    // Circular Spoked Search Loop (Torus + Hub + 8 Spokes) hovering above ground
    const coilGroup = new THREE.Group();
    coilGroup.position.set(0, 0.08, 1.95);

    // Outer induction loop ring
    const ringGeo = new THREE.TorusGeometry(0.38, 0.035, 16, 36);
    const ring = new THREE.Mesh(ringGeo, darkMetalMat);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    coilGroup.add(ring);

    // Central hub
    const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 18);
    const hub = new THREE.Mesh(hubGeo, darkMetalMat);
    coilGroup.add(hub);

    // 8 Radial Spokes
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(0.03, 0.02, 0.34);
      const spoke = new THREE.Mesh(spokeGeo, darkMetalMat);
      spoke.position.set(Math.sin(angle) * 0.19, 0, Math.cos(angle) * 0.19);
      spoke.rotation.y = angle;
      coilGroup.add(spoke);
    }

    metalDetectorGroup.add(coilGroup);

    // Miniature detector OLED screen bracket on the boom
    const oledBracketGeo = new THREE.BoxGeometry(0.18, 0.14, 0.06);
    const oledBracket = new THREE.Mesh(oledBracketGeo, darkMetalMat);
    oledBracket.position.set(0, 0.52, 1.15);
    oledBracket.rotation.x = -Math.PI / 6;
    metalDetectorGroup.add(oledBracket);

    const oledScreenGeo = new THREE.PlaneGeometry(0.14, 0.09);
    const oledMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 }); // Vibrant lime screen
    const oledScreen = new THREE.Mesh(oledScreenGeo, oledMat);
    oledScreen.position.set(0, 0.53, 1.18);
    oledScreen.rotation.x = -Math.PI / 6;
    metalDetectorGroup.add(oledScreen);

    this.registerMesh(metalDetectorGroup, 'metaldetector');
    this.modules.metaldetector = metalDetectorGroup;
    this.robotRoot.add(metalDetectorGroup);

    // =========================================================================
    // 4. MODULE: CAMERA & LED ILLUMINATION (Front Vision Unit)
    // =========================================================================
    const cameraGroup = new THREE.Group();
    cameraGroup.name = "module_camera";

    // Elevated Camera Tower Cube Enclosure
    const camHousingGeo = new THREE.BoxGeometry(0.36, 0.36, 0.32);
    const camHousing = new THREE.Mesh(camHousingGeo, cameraBodyMat);
    camHousing.position.set(0, 1.28, 0.38);
    camHousing.castShadow = true;
    cameraGroup.add(camHousing);

    // Camera Bezel Ring & Optical Glass Lens
    const lensBezelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 24);
    const lensBezel = new THREE.Mesh(lensBezelGeo, darkMetalMat);
    lensBezel.rotation.x = Math.PI / 2;
    lensBezel.position.set(0, 1.28, 0.55);
    cameraGroup.add(lensBezel);

    const lensGlassGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.065, 24);
    const lensGlass = new THREE.Mesh(lensGlassGeo, glassLensMat);
    lensGlass.rotation.x = Math.PI / 2;
    lensGlass.position.set(0, 1.28, 0.56);
    cameraGroup.add(lensGlass);

    // 8 Bright White LED Illuminators surrounding the lens in a square/circle ring
    const ledPositions = [
      { x: -0.12, y: 0.12 }, { x: 0, y: 0.14 }, { x: 0.12, y: 0.12 },
      { x: -0.14, y: 0 },                       { x: 0.14, y: 0 },
      { x: -0.12, y: -0.12 }, { x: 0, y: -0.14 }, { x: 0.12, y: -0.12 }
    ];

    ledPositions.forEach(ledPos => {
      const ledGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12);
      const ledMesh = new THREE.Mesh(ledGeo, ledGlowMat);
      ledMesh.rotation.x = Math.PI / 2;
      ledMesh.position.set(ledPos.x, 1.28 + ledPos.y, 0.55);
      cameraGroup.add(ledMesh);
    });

    // Camera Point Light illuminating forward
    const camLight = new THREE.PointLight(0xffffff, 2.5, 8.0, 1.5);
    camLight.position.set(0, 1.28, 0.65);
    cameraGroup.add(camLight);
    this.cameraLights.push(camLight);

    // Lower Auxiliary 16x2 LCD Telemetry Display Screen Box
    const lcdBoxGeo = new THREE.BoxGeometry(0.42, 0.22, 0.18);
    const lcdBox = new THREE.Mesh(lcdBoxGeo, cameraBodyMat);
    lcdBox.position.set(0, 0.98, 0.42);
    cameraGroup.add(lcdBox);

    const lcdScreenGeo = new THREE.PlaneGeometry(0.24, 0.12);
    const lcdMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 }); // Lime-green backlit screen
    const lcdScreen = new THREE.Mesh(lcdScreenGeo, lcdMat);
    lcdScreen.position.set(-0.06, 0.98, 0.52);
    cameraGroup.add(lcdScreen);

    // Rotary knob beside screen
    const knobGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16);
    const knob = new THREE.Mesh(knobGeo, darkMetalMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.12, 0.98, 0.52);
    cameraGroup.add(knob);

    this.registerMesh(cameraGroup, 'camera');
    this.modules.camera = cameraGroup;
    this.robotRoot.add(cameraGroup);

    // =========================================================================
    // 5. MODULE: GPS RECEIVER & MAST (High-Precision GNSS Dome)
    // =========================================================================
    const gpsGroup = new THREE.Group();
    gpsGroup.name = "module_gps";

    // Raised vertical black mast post
    const mastGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.65, 16);
    const mast = new THREE.Mesh(mastGeo, darkMetalMat);
    mast.position.set(0.12, 1.35, -0.05);
    mast.castShadow = true;
    gpsGroup.add(mast);

    // Mast base clamp collar
    const clampGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16);
    const clamp = new THREE.Mesh(clampGeo, brushedSilverMat);
    clamp.position.set(0.12, 1.05, -0.05);
    gpsGroup.add(clamp);

    // White rounded squircle GNSS Antenna Puck Dome
    const puckBaseGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24);
    const puckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 });
    const puckBase = new THREE.Mesh(puckBaseGeo, puckMat);
    puckBase.position.set(0.12, 1.7, -0.05);
    puckBase.castShadow = true;
    gpsGroup.add(puckBase);

    const puckTopGeo = new THREE.SphereGeometry(0.175, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const puckTop = new THREE.Mesh(puckTopGeo, puckMat);
    puckTop.position.set(0.12, 1.73, -0.05);
    gpsGroup.add(puckTop);

    // GPS Status LED
    const gpsLedGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const gpsLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const gpsLed = new THREE.Mesh(gpsLedGeo, gpsLedMat);
    gpsLed.position.set(0.24, 1.71, -0.05);
    gpsGroup.add(gpsLed);

    this.registerMesh(gpsGroup, 'gps');
    this.modules.gps = gpsGroup;
    this.robotRoot.add(gpsGroup);

    // =========================================================================
    // 6. MODULE: CONTROLLER & ELECTRONICS (ESP32, PCBs, Wiring, Whip Antenna)
    // =========================================================================
    const controllerGroup = new THREE.Group();
    controllerGroup.name = "module_controller";

    // Rear elevated electronics junction box
    const jBoxGeo = new THREE.BoxGeometry(0.65, 0.22, 0.55);
    const jBox = new THREE.Mesh(jBoxGeo, darkMetalMat);
    jBox.position.set(0.1, 0.95, -0.6);
    jBox.castShadow = true;
    controllerGroup.add(jBox);

    // Stepped Microcontroller Board (ESP32 with silver RF shield)
    const esp32PcbGeo = new THREE.BoxGeometry(0.32, 0.04, 0.42);
    const esp32Pcb = new THREE.Mesh(esp32PcbGeo, pcbGreenMat);
    esp32Pcb.position.set(0.26, 1.08, -0.18);
    controllerGroup.add(esp32Pcb);

    const esp32ShieldGeo = new THREE.BoxGeometry(0.2, 0.03, 0.24);
    const esp32Shield = new THREE.Mesh(esp32ShieldGeo, brushedSilverMat);
    esp32Shield.position.set(0.26, 1.11, -0.22);
    controllerGroup.add(esp32Shield);

    // Blue Sensor Breakout PCB
    const sensorPcbGeo = new THREE.BoxGeometry(0.24, 0.04, 0.24);
    const sensorPcb = new THREE.Mesh(sensorPcbGeo, pcbBlueMat);
    sensorPcb.position.set(-0.25, 0.95, 0.02);
    controllerGroup.add(sensorPcb);

    // Bundled Power & Signal Wiring Harnesses (Red & Black)
    const curvePoints1 = [
      new THREE.Vector3(-0.2, 0.94, 0.1),
      new THREE.Vector3(-0.35, 0.88, 0.3),
      new THREE.Vector3(-0.3, 0.75, 0.6)
    ];
    const wireCurve1 = new THREE.CatmullRomCurve3(curvePoints1);
    const wireGeo1 = new THREE.TubeGeometry(wireCurve1, 12, 0.014, 6, false);
    const wire1 = new THREE.Mesh(wireGeo1, wireRedMat);
    controllerGroup.add(wire1);

    const curvePoints2 = [
      new THREE.Vector3(-0.22, 0.93, 0.1),
      new THREE.Vector3(-0.38, 0.87, 0.3),
      new THREE.Vector3(-0.32, 0.74, 0.6)
    ];
    const wireCurve2 = new THREE.CatmullRomCurve3(curvePoints2);
    const wireGeo2 = new THREE.TubeGeometry(wireCurve2, 12, 0.014, 6, false);
    const wire2 = new THREE.Mesh(wireGeo2, wireBlackMat);
    controllerGroup.add(wire2);

    // Tall Rear High-Gain Whip Antenna with knurled brass base
    const antBaseGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.12, 16);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 });
    const antBase = new THREE.Mesh(antBaseGeo, brassMat);
    antBase.position.set(0.38, 1.12, -0.72);
    controllerGroup.add(antBase);

    const whipGeo = new THREE.CylinderGeometry(0.015, 0.028, 0.85, 12);
    const whip = new THREE.Mesh(whipGeo, darkMetalMat);
    whip.position.set(0.38, 1.58, -0.72);
    whip.castShadow = true;
    controllerGroup.add(whip);

    this.registerMesh(controllerGroup, 'controller');
    this.modules.controller = controllerGroup;
    this.robotRoot.add(controllerGroup);
  }

  registerMesh(group, moduleKey) {
    group.traverse(child => {
      if (child.isMesh) {
        this.raycastMeshMap.set(child, moduleKey);
        child.userData.moduleKey = moduleKey;
      }
    });
  }

  initEvents() {
    window.addEventListener('resize', () => this.onWindowResize());

    // Raycast hover & click
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('click', (e) => this.onPointerClick(e));

    // Reset view button
    const btnReset = document.getElementById('btnResetCamera');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetCamera());
    }

    // Auto rotate toggle button
    const btnAutoRotate = document.getElementById('btnToggleAutoRotate');
    if (btnAutoRotate) {
      btnAutoRotate.addEventListener('click', () => {
        this.controls.autoRotate = !this.controls.autoRotate;
        btnAutoRotate.classList.toggle('active', this.controls.autoRotate);
      });
    }

    // Toggle camera headlights button
    const btnLights = document.getElementById('btnToggleHeadlights');
    if (btnLights) {
      btnLights.addEventListener('click', () => {
        this.toggleHeadlights();
        btnLights.classList.toggle('active');
      });
    }
  }

  onPointerMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.robotRoot.children, true);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const key = this.raycastMeshMap.get(hitMesh);
      if (key && key !== 'chassis') {
        this.renderer.domElement.style.cursor = 'pointer';
        this.highlightHoverModule(key);
        return;
      }
    }
    this.renderer.domElement.style.cursor = 'grab';
    this.highlightHoverModule(null);
  }

  onPointerClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.robotRoot.children, true);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const key = this.raycastMeshMap.get(hitMesh);
      if (key && key !== 'chassis') {
        this.selectModule(key);
      }
    }
  }

  highlightHoverModule(moduleKey) {
    if (this.hoveredModuleKey === moduleKey) return;
    this.hoveredModuleKey = moduleKey;

    const badge = document.getElementById('hudHoveredPartName');
    if (badge) {
      if (moduleKey) {
        badge.textContent = `TARGET: ${moduleKey.toUpperCase()}`;
        badge.style.borderColor = 'var(--accent-cyan)';
      } else {
        badge.textContent = 'TRINETRA MK-1 • READY';
        badge.style.borderColor = 'var(--border-glass)';
      }
    }
  }

  selectModule(moduleKey) {
    this.selectedModuleKey = moduleKey;
    if (typeof this.options.onSelectModule === 'function') {
      this.options.onSelectModule(moduleKey);
    }
  }

  toggleHeadlights() {
    this.cameraLights.forEach(light => {
      light.intensity = light.intensity > 0 ? 0 : 2.5;
    });
  }

  resetCamera() {
    if (window.gsap) {
      gsap.to(this.camera.position, {
        x: this.defaultCameraPos.x,
        y: this.defaultCameraPos.y,
        z: this.defaultCameraPos.z,
        duration: 1.2,
        ease: 'power2.out'
      });
      gsap.to(this.controls.target, {
        x: this.defaultTarget.x,
        y: this.defaultTarget.y,
        z: this.defaultTarget.z,
        duration: 1.2,
        ease: 'power2.out'
      });
    } else {
      this.camera.position.copy(this.defaultCameraPos);
      this.controls.target.copy(this.defaultTarget);
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.TrinetraRobot3D = TrinetraRobot3D;
