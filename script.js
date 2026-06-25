// --- Photo-Booth Kiosk App Controller (script.js) ---

// ==========================================
// 1. STATE & CONSTANTS DEFINITIONS
// ==========================================

const CONFIG = {
  DEFAULT_PASSCODE: "1234",
  IDLE_TIMEOUT_MS: 10000, // 10 seconds autostart on Welcome
  DEFAULT_PRINT_LIMIT: 5,
  DEFAULT_GALLERY_TTL: "24",
};

let appState = {
  currentScreen: "screen-welcome",
  language: "en",
  highContrast: false,
  textSize: "medium",
  soundEnabled: true,
  
  // Camera variables
  cameraStream: null,
  activeCameraMode: "user", // "user" or "environment"
  flashActive: true,
  cameraSimulatedInterval: null,
  cameraSimulatedAngle: 0,
  simulatedLightLevel: "normal",
  simulatedFaceTrack: "detected",
  
  // Active photo session variables
  selectedTemplate: "neon",
  countdownTimer: null,
  capturedImageBuffer: null, // Holds original ImageData
  adjustedImageBuffer: null, // Holds modified ImageData
  activeFilter: "none",
  adjustZoom: 100,
  adjustBrightness: 0,
  adjustSkinTone: 0,
  
  // Upgraded session variables
  captureMode: "single", // "single" or "gif"
  capturedFrames: [], // array of 4 ImageDatas
  currentPreviewFrameIndex: 0,
  gifPreviewInterval: null,
  brushColor: "#ff0000",
  brushSize: 6,
  stickers: [], // active emoji layers
  currentTheme: "cyber",
  
  // Print settings
  selectedPrintSize: "4x6",
  copyCount: 1,
  jobsQueue: [],
  currentJobToken: "",
  currentShortCode: "",
  
  // Operator Dashboard
  inkLevel: 68,
  paperLevel: 84, // out of 500 prints (420)
  maxPrintsAllowed: 5,
  galleryTTLHours: "24",
  authInputPin: "",
  
  // Auto Start welcome timer
  welcomeTimerInterval: null,
  welcomeTimeLeft: 10
};

// SVG Frame Templates Inline Definitions for dynamic canvas rendering
const FRAME_SVGS = {
  neon: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="neonCyanPink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f3ff" />
          <stop offset="50%" stop-color="#ff00ff" />
          <stop offset="100%" stop-color="#00f3ff" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="760" height="560" rx="16" fill="none" stroke="url(#neonCyanPink)" stroke-width="6" />
      <rect x="35" y="35" width="730" height="530" rx="10" fill="none" stroke="#00f3ff" stroke-width="2" stroke-dasharray="10 15" opacity="0.7" />
      <path d="M 15 60 L 15 15 L 60 15" fill="none" stroke="#ff00ff" stroke-width="4" />
      <rect x="25" y="25" width="8" height="8" fill="#00f3ff" />
      <path d="M 785 60 L 785 15 L 740 15" fill="none" stroke="#ff00ff" stroke-width="4" />
      <rect x="767" y="25" width="8" height="8" fill="#00f3ff" />
      <path d="M 15 540 L 15 585 L 60 585" fill="none" stroke="#ff00ff" stroke-width="4" />
      <rect x="25" y="567" width="8" height="8" fill="#00f3ff" />
      <path d="M 785 540 L 785 585 L 740 585" fill="none" stroke="#ff00ff" stroke-width="4" />
      <rect x="767" y="567" width="8" height="8" fill="#00f3ff" />
      <g transform="translate(400, 560)">
        <polygon points="-120,0 120,0 100,22 -100,22" fill="#0c0f1d" stroke="url(#neonCyanPink)" stroke-width="2" />
        <text x="0" y="15" fill="#00f3ff" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="4" text-anchor="middle">CYBER_BOOTH // SYS_ACTIVE</text>
      </g>
      <g transform="translate(400, 40)">
        <polygon points="-80,0 80,0 60,-22 -60,-22" fill="#0c0f1d" stroke="#ff00ff" stroke-width="2" />
        <text x="0" y="-7" fill="#ff00ff" font-family="monospace" font-size="12" font-weight="bold" letter-spacing="2" text-anchor="middle">LIVE PREVIEW</text>
      </g>
    </svg>`,
  retro: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect x="0" y="0" width="70" height="600" fill="#141414" />
      <rect x="730" y="0" width="70" height="600" fill="#141414" />
      <rect x="70" y="0" width="660" height="45" fill="#141414" />
      <rect x="70" y="555" width="660" height="45" fill="#141414" />
      <g fill="#0e0e0e" stroke="#2a2a2a" stroke-width="1">
        <rect x="25" y="25" width="20" height="35" rx="4" /><rect x="25" y="85" width="20" height="35" rx="4" />
        <rect x="25" y="145" width="20" height="35" rx="4" /><rect x="25" y="205" width="20" height="35" rx="4" />
        <rect x="25" y="265" width="20" height="35" rx="4" /><rect x="25" y="325" width="20" height="35" rx="4" />
        <rect x="25" y="385" width="20" height="35" rx="4" /><rect x="25" y="445" width="20" height="35" rx="4" />
        <rect x="25" y="505" width="20" height="35" rx="4" /><rect x="25" y="565" width="20" height="35" rx="4" />
      </g>
      <g fill="#0e0e0e" stroke="#2a2a2a" stroke-width="1">
        <rect x="755" y="25" width="20" height="35" rx="4" /><rect x="755" y="85" width="20" height="35" rx="4" />
        <rect x="755" y="145" width="20" height="35" rx="4" /><rect x="755" y="205" width="20" height="35" rx="4" />
        <rect x="755" y="265" width="20" height="35" rx="4" /><rect x="755" y="325" width="20" height="35" rx="4" />
        <rect x="755" y="385" width="20" height="35" rx="4" /><rect x="755" y="445" width="20" height="35" rx="4" />
        <rect x="755" y="505" width="20" height="35" rx="4" /><rect x="755" y="565" width="20" height="35" rx="4" />
      </g>
      <text x="400" y="30" fill="#cc8b3c" font-family="Courier New, monospace" font-size="14" font-weight="bold" letter-spacing="4" text-anchor="middle">KODAK RETRO 400</text>
      <text x="400" y="580" fill="#cc8b3c" font-family="Courier New, monospace" font-size="14" font-weight="bold" letter-spacing="4" text-anchor="middle">ISO 400 / 27 DIN</text>
      <text x="90" y="30" fill="#cc8b3c" font-family="monospace" font-size="14">► 21A</text>
      <text x="90" y="580" fill="#cc8b3c" font-family="monospace" font-size="14">21</text>
      <rect x="68" y="43" width="664" height="514" fill="none" stroke="#222" stroke-width="2" />
      <g transform="translate(620, 520)" opacity="0.85">
        <text x="0" y="0" fill="#ff4d00" font-family="Courier New, monospace" font-size="18" font-weight="900">26 6 25</text>
      </g>
    </svg>`,
  party: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="partyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff007f" /><stop offset="25%" stop-color="#ffaa00" />
          <stop offset="50%" stop-color="#33cc33" /><stop offset="75%" stop-color="#00aaff" />
          <stop offset="100%" stop-color="#aa00ff" />
        </linearGradient>
      </defs>
      <rect x="15" y="15" width="770" height="570" rx="20" fill="none" stroke="url(#partyGrad)" stroke-width="8" />
      <g opacity="0.85">
        <circle cx="100" cy="50" r="10" fill="#ff4081" /><circle cx="220" cy="40" r="8" fill="#ffd700" />
        <circle cx="350" cy="35" r="12" fill="#00e5ff" /><circle cx="480" cy="45" r="7" fill="#69f0ae" />
        <circle cx="600" cy="38" r="9" fill="#d500f9" /><circle cx="700" cy="55" r="11" fill="#ff6d00" />
        <circle cx="45" cy="150" r="8" fill="#ffd700" /><circle cx="50" cy="280" r="10" fill="#00e5ff" />
        <circle cx="40" cy="420" r="7" fill="#ff4081" /><circle cx="755" cy="160" r="9" fill="#d500f9" />
        <circle cx="750" cy="300" r="11" fill="#ff6d00" /><circle cx="760" cy="450" r="8" fill="#69f0ae" />
        <circle cx="120" cy="550" r="9" fill="#00e5ff" /><circle cx="260" cy="560" r="11" fill="#ff4081" />
        <circle cx="420" cy="555" r="8" fill="#ffd700" /><circle cx="580" cy="562" r="12" fill="#69f0ae" />
      </g>
      <g fill="#ffd700" stroke="#ffaa00" stroke-width="1">
        <polygon points="65,80 70,95 85,95 72,105 77,120 65,110 53,120 58,105 45,95 60,95" />
        <polygon points="735,80 740,95 755,95 742,105 747,120 735,110 723,120 728,105 715,95 730,95" />
      </g>
      <g transform="translate(60, 110)" stroke="#fff" stroke-width="1.5">
        <ellipse cx="20" cy="30" rx="15" ry="20" fill="#ff4081" />
        <path d="M 20 50 L 17 55 L 23 55 Z" fill="#ff4081" />
      </g>
      <g transform="translate(680, 110)" stroke="#fff" stroke-width="1.5">
        <ellipse cx="20" cy="30" rx="15" ry="20" fill="#00e5ff" />
        <path d="M 20 50 L 17 55 L 23 55 Z" fill="#00e5ff" />
      </g>
      <g transform="translate(400, 560)">
        <text x="2" y="2" fill="#000" font-family="Impact, sans-serif" font-size="28" letter-spacing="4" text-anchor="middle" opacity="0.5">★ PARTY TIME ★</text>
        <text x="0" y="0" fill="#ffd700" font-family="Impact, sans-serif" font-size="28" letter-spacing="4" text-anchor="middle" stroke="#000" stroke-width="1.5">★ PARTY TIME ★</text>
      </g>
    </svg>`,
};

// Offscreen doodle canvas
let doodleCanvas = document.createElement("canvas");
doodleCanvas.width = 800;
doodleCanvas.height = 600;
let doodleCtx = doodleCanvas.getContext("2d");

// ==========================================
// 2. INTERNATIONALIZATION (i18n) DICTIONARY
// ==========================================
const translations = {
  en: {
    welcomeTitle: "Welcome to GALA NIGHT",
    welcomeSubtitleText: "Capture memories instantly. Tap \"I Agree\" to begin your photo session!",
    learnMore: "Learn More",
    iAgree: "I AGREE",
    timeoutLabel: "Starting automatically...",
    perfectlyFramed: "Perfectly framed",
    lowLight: "Lighting low — move to brighter area",
    poseTipsTitle: "Pose Tips",
    poseTipsDesc: "Stand 1.5m from the camera. Keep your face centered in the frame. Press TAKE PHOTO!",
    selectTemplate: "Select Frame Template",
    switchCam: "Switch",
    flash: "Flash On",
    takePhoto: "TAKE PHOTO",
    processingTitle: "Processing Your Photo",
    processingDesc: "Please hold on while we build your masterpiece.",
    stepUpload: "Uploading to session gallery...",
    stepBg: "Performing AI background removal...",
    stepEnhance: "Enhancing face details & skin tone...",
    stepFinalize: "Applying final overlays & compression...",
    ttlFooter: "Auto-deletes from cloud in 24 hours.",
    adjustTitle: "Customize Photo",
    sliderZoom: "Crop / Zoom",
    sliderBrightness: "Brightness",
    sliderSkintone: "Skin Tone Smooth",
    filtersLabel: "Select Color Filter",
    filterOrig: "Original",
    filterVintage: "Vintage Film",
    filterCyber: "Cyber Neon",
    filterCartoon: "Pop Cartoon",
    retake: "RETAKE",
    print: "PRINT",
    shareQr: "SHARE QR",
    printOptions: "Print Options",
    printSize: "Photo Dimensions:",
    sizeStandard: "Standard Print",
    sizeLarge: "Large Premium",
    printCopies: "Number of Copies:",
    copyLimit: "(Limit: 5 copies per session)",
    printNowBtn: "PRINT NOW",
    printBack: "Back to Preview",
    printingKiosk: "Printing your high-gloss photo...",
    printComplete: "Print Successful!",
    pickupInstruction: "Pick up your photo at the physical slot below.",
    recJob: "Job Token:",
    recCode: "Short Code:",
    recCopies: "Quantity:",
    recFooter: "Use the Short Code on the sharing screen if QR link doesn't load.",
    done: "Done",
    scanTitle: "Scan to Download",
    scanDesc: "Scan with your smartphone camera to download the high-resolution photo instantly.",
    deletesIn: "Deletes from gallery in",
    altDelivery: "Or Send Electronically",
    smsBtn: "Send via SMS (Text Message)",
    emailBtn: "Send via Email",
    sendBtnSms: "Send SMS",
    sendBtnEmail: "Send Email",
    marketingOpt: "I agree to receive promotional updates and newsletter communications.",
    copyLinkBtn: "COPY PHOTO LINK",
    shareBack: "Back",
    shareDone: "Finish Session",
    
    // Upgraded translations keys
    tabAdjust: "Adjust",
    tabDecorate: "Decorate",
    doodleLabel: "Doodle Signature",
    brushSizeLabel: "Size:",
    clearDrawBtn: "Clear Signature",
    stickersLabel: "Tap to Place Props",
    stickerHelpText: "Tap a prop to place. Drag to move. Drag outside photo area to delete.",
    modeSingle: "Single Shot",
    modeGif: "4-Shot GIF",
    captureModeLabel: "Capture Mode",
    
    // JS Alerts
    smsSuccess: "SMS Sent Successfully!",
    smsError: "Please enter a valid phone number.",
    emailSuccess: "Email Sent Successfully!",
    emailError: "Please enter a valid email address.",
    linkCopied: "Link copied to clipboard!",
    authFailed: "Invalid passcode. Please try again.",
    jobAborted: "Job process was aborted by operator.",
    uploadedSuccess: "Custom overlay template loaded successfully!"
  },
  es: {
    welcomeTitle: "Bienvenido a la GALA NIGHT",
    welcomeSubtitleText: "Captura recuerdos al instante. ¡Toca \"De Acuerdo\" para comenzar tu sesión!",
    learnMore: "Saber Más",
    iAgree: "DE ACUERDO",
    timeoutLabel: "Iniciando automáticamente...",
    perfectlyFramed: "Perfectamente encuadrado",
    lowLight: "Iluminación baja — muévase a un área más brillante",
    poseTipsTitle: "Consejos de Pose",
    poseTipsDesc: "Párese a 1.5 m de la cámara. Mantenga su rostro centrado. Presione CAPTURAR.",
    selectTemplate: "Seleccionar Marco",
    switchCam: "Girar",
    flash: "Flash Activado",
    takePhoto: "CAPTURAR FOTO",
    processingTitle: "Procesando Tu Foto",
    processingDesc: "Por favor, espera mientras creamos tu obra maestra.",
    stepUpload: "Subiendo a la galería de la sesión...",
    stepBg: "Realizando eliminación de fondo por IA...",
    stepEnhance: "Mejorando detalles faciales y tono...",
    stepFinalize: "Aplicando capas finales y compresión...",
    ttlFooter: "Se elimina automáticamente de la nube en 24 horas.",
    adjustTitle: "Personalizar Foto",
    sliderZoom: "Recortar / Zoom",
    sliderBrightness: "Brillo",
    sliderSkintone: "Suavizar Piel",
    filtersLabel: "Seleccionar Filtro de Color",
    filterOrig: "Original",
    filterVintage: "Película Retro",
    filterCyber: "Neón Ciber",
    filterCartoon: "Dibujo Pop",
    retake: "REPETIR",
    print: "IMPRIMIR",
    shareQr: "COMPARTIR QR",
    printOptions: "Opciones de Impresión",
    printSize: "Dimensiones de la Foto:",
    sizeStandard: "Impresión Estándar",
    sizeLarge: "Premium Grande",
    printCopies: "Número de Copias:",
    copyLimit: "(Límite: 5 copias por sesión)",
    printNowBtn: "IMPRIMIR AHORA",
    printBack: "Volver a Vista Previa",
    printingKiosk: "Imprimiendo su foto de alto brillo...",
    printComplete: "¡Impresión Exitosa!",
    pickupInstruction: "Recoja su foto en la ranura física de abajo.",
    recJob: "Ficha de Trabajo:",
    recCode: "Código Corto:",
    recCopies: "Cantidad:",
    recFooter: "Use el Código Corto en la pantalla para compartir si no carga el enlace QR.",
    done: "Listo",
    scanTitle: "Escanear para Descargar",
    scanDesc: "Escanee con la cámara de su teléfono para descargar la foto de alta resolución al instante.",
    deletesIn: "Se elimina de la galería en",
    altDelivery: "O Enviar Electrónicamente",
    smsBtn: "Enviar por SMS (Mensaje de Texto)",
    emailBtn: "Enviar por Correo Electrónico",
    sendBtnSms: "Enviar SMS",
    sendBtnEmail: "Enviar Correo",
    marketingOpt: "Acepto recibir actualizaciones promocionales y comunicaciones de boletines.",
    copyLinkBtn: "COPIAR ENLACE DE FOTO",
    shareBack: "Atrás",
    shareDone: "Finalizar Sesión",
    
    // Upgraded translations keys
    tabAdjust: "Ajustar",
    tabDecorate: "Decorar",
    doodleLabel: "Firma / Garabato",
    brushSizeLabel: "Tamaño:",
    clearDrawBtn: "Borrar Firma",
    stickersLabel: "Toca para Colocar Props",
    stickerHelpText: "Toca un objeto para colocarlo. Arrastre para mover. Arrastre fuera de la foto para eliminar.",
    modeSingle: "Foto Única",
    modeGif: "GIF de 4 Fotos",
    captureModeLabel: "Modo de Captura",
    
    // JS Alerts
    smsSuccess: "¡SMS enviado con éxito!",
    smsError: "Por favor, introduzca un número de teléfono válido.",
    emailSuccess: "¡Correo electrónico enviado con éxito!",
    emailError: "Por favor, introduzca un correo electrónico válido.",
    linkCopied: "¡Enlace copiado al portapapeles!",
    authFailed: "Contraseña incorrecta. Inténtelo de nuevo.",
    jobAborted: "El trabajo fue abortado por el operador.",
    uploadedSuccess: "¡Plantilla superpuesta cargada correctamente!"
  }
};

// ==========================================
// 3. AUDIO SYNTHESIZER (Web Audio API)
// ==========================================
const AudioSynth = {
  ctx: null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playBeep(freq = 880, duration = 0.1) {
    if (!appState.soundEnabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  playShutter() {
    if (!appState.soundEnabled) return;
    this.init();
    
    // White noise buffer for shutter sound
    const bufferSize = this.ctx.sampleRate * 0.25; // 0.25s
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noiseNode.start();
    
    // Quick pop high beep immediately after shutter
    setTimeout(() => this.playBeep(1200, 0.05), 100);
  },

  playPrintHum() {
    if (!appState.soundEnabled) return null;
    this.init();
    
    // Create ongoing print oscillator mechanical hum
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    
    osc1.type = "sawtooth";
    osc1.frequency.value = 120; // low motor sound
    
    osc2.type = "triangle";
    osc2.frequency.value = 124; // slight phase beat
    
    filter.type = "lowpass";
    filter.frequency.value = 300;
    
    gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.5); // fade in
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc2.start();
    
    return {
      osc1, osc2, gain,
      stop: () => {
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        setTimeout(() => {
          osc1.stop();
          osc2.stop();
        }, 550);
      }
    };
  }
};

// Mobile Haptics Helper
const triggerHaptics = (pattern = [100]) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

// ==========================================
// 4. WEBCAM & SIMULATED VIEW VIEWPORT
// ==========================================

const CameraController = {
  video: null,
  canvas: null,
  ctx: null,
  stream: null,
  
  init(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    
    // Size Canvas matching viewport expectation
    this.canvas.width = 800;
    this.canvas.height = 600;
  },
  
  async start() {
    this.stop(); // reset any previous streams
    
    // Set low light / face parameters from settings
    appState.simulatedLightLevel = document.getElementById("set-ambient-light").value;
    appState.simulatedFaceTrack = document.getElementById("set-face-detect").value;
    
    try {
      // Prompt user webcam
      const constraints = {
        video: {
          width: { ideal: 800 },
          height: { ideal: 600 },
          facingMode: appState.activeCameraMode
        },
        audio: false
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.video.style.display = "block";
      this.canvas.style.display = "none";
      
      appState.cameraStream = this.stream;
      
      // Update operator UI
      document.getElementById("lbl-camera-connected").textContent = "ACTIVE (WEBCAM LIVE)";
      document.getElementById("lbl-camera-connected").className = "badge badge-success";
      
      // Keep loops for framing checks
      this.startFramingAnalyzer(true);
      
      operatorLog("Webcam stream started successfully.");
    } catch (err) {
      // User blocked camera or not available: fallback to full simulation canvas
      operatorLog("Webcam access failed/denied. Launching canvas simulation.", "warning");
      this.startSimulatedFeed();
    }
  },
  
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    if (appState.cameraSimulatedInterval) {
      clearInterval(appState.cameraSimulatedInterval);
      appState.cameraSimulatedInterval = null;
    }
    this.startFramingAnalyzer(false);
  },
  
  startSimulatedFeed() {
    this.video.style.display = "none";
    this.canvas.style.display = "block";
    
    // Update dashboard labels
    document.getElementById("lbl-camera-connected").textContent = "SIMULATED VIEWPORT";
    document.getElementById("lbl-camera-connected").className = "badge badge-online";
    
    appState.cameraSimulatedInterval = setInterval(() => {
      this.drawSimulatedFrame();
    }, 33); // ~30 fps
    
    this.startFramingAnalyzer(true);
  },
  
  drawSimulatedFrame() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    appState.cameraSimulatedAngle += 0.02;
    const angle = appState.cameraSimulatedAngle;
    
    // Dark room background color gradient
    let bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (appState.simulatedLightLevel === "low") {
      bgGrad.addColorStop(0, "#080912");
      bgGrad.addColorStop(1, "#181420");
    } else {
      bgGrad.addColorStop(0, "#1a1f38");
      bgGrad.addColorStop(1, "#0d1020");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = w/4; x < w; x += w/4) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = h/3; y < h; y += h/3) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
    
    // Draw a simulated face avatar in the center
    const faceX = w / 2 + Math.sin(angle) * 15;
    const faceY = h / 2 - 10 + Math.cos(angle * 1.5) * 8;
    
    // Draw body shoulders
    ctx.fillStyle = "#1e294b";
    ctx.beginPath();
    ctx.ellipse(faceX, faceY + 180, 110, 80, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.stroke();
    
    // Draw face head circle
    ctx.fillStyle = "#fbcfe8"; // Pinkish tone
    ctx.beginPath();
    ctx.ellipse(faceX, faceY, 65, 80, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Eyes
    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(faceX - 22, faceY - 12, 6, 0, 2 * Math.PI);
    ctx.arc(faceX + 22, faceY - 12, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Smiling mouth
    ctx.strokeStyle = "#be185d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(faceX, faceY + 20, 20, 0, Math.PI, false);
    ctx.stroke();
    
    // Hair
    ctx.fillStyle = "#1e1b4b";
    ctx.beginPath();
    ctx.arc(faceX - 35, faceY - 40, 25, 0, 2 * Math.PI);
    ctx.arc(faceX + 35, faceY - 40, 25, 0, 2 * Math.PI);
    ctx.arc(faceX, faceY - 55, 35, 0, 2 * Math.PI);
    ctx.fill();
  },
  
  // Real-time framing analyzer simulation
  analyzerTimer: null,
  startFramingAnalyzer(start) {
    if (!start) {
      if (this.analyzerTimer) clearInterval(this.analyzerTimer);
      document.getElementById("framing-indicator").classList.remove("active");
      document.getElementById("low-light-indicator").classList.remove("active");
      return;
    }
    
    this.analyzerTimer = setInterval(() => {
      const isLowLight = appState.simulatedLightLevel === "low";
      const isFaceDetected = appState.simulatedFaceTrack === "detected";
      
      const framingBadge = document.getElementById("framing-indicator");
      const lightingBadge = document.getElementById("low-light-indicator");
      
      if (isFaceDetected && !isLowLight) {
        framingBadge.classList.add("active");
      } else {
        framingBadge.classList.remove("active");
      }
      
      if (isLowLight) {
        lightingBadge.classList.add("active");
      } else {
        lightingBadge.classList.remove("active");
      }
    }, 500);
  },
  
  // Fetch current view frame image as dataURL/ImageData
  captureFrame() {
    const capCanvas = document.createElement("canvas");
    capCanvas.width = 800;
    capCanvas.height = 600;
    const capCtx = capCanvas.getContext("2d");
    
    if (this.stream) {
      // Draw webcam frame
      capCtx.drawImage(this.video, 0, 0, 800, 600);
    } else {
      // Draw current fallback canvas drawing
      capCtx.drawImage(this.canvas, 0, 0, 800, 600);
    }
    
    return capCtx.getImageData(0, 0, 800, 600);
  }
};

// ==========================================
// 5. CONFETTI ANIMATION ENGINE
// ==========================================
const ConfettiEngine = {
  canvas: null,
  ctx: null,
  particles: [],
  animFrameId: null,
  
  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  
  start() {
    this.stop();
    confettiActive = true;
    this.particles = [];
    
    const colors = ["#ff007f", "#00f3ff", "#ffaa00", "#33cc33", "#aa00ff", "#ffffff"];
    
    // Spawn 150 particles
    for (let i = 0; i < 150; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height - this.canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * this.canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2
      });
    }
    
    this.loop();
  },
  
  stop() {
    confettiActive = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
  
  loop() {
    if (!confettiActive) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let complete = true;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += p.speed;
      p.x += Math.sin(p.tiltAngle) * 0.5;
      p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;
      
      if (p.y < this.canvas.height + 20) {
        complete = false;
      }
      
      this.ctx.beginPath();
      this.ctx.lineWidth = p.r;
      this.ctx.strokeStyle = p.color;
      this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      this.ctx.stroke();
    }
    
    if (complete) {
      this.stop();
    } else {
      this.animFrameId = requestAnimationFrame(() => this.loop());
    }
  }
};
let confettiActive = false;

// ==========================================
// 6. IMAGE PROCESSING & CUSTOMIZER
// ==========================================

const ImageProcessor = {
  canvas: null,
  ctx: null,
  originalImage: null, // Holds original ImageData
  
  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = 800;
    this.canvas.height = 600;
  },
  
  loadImage(imageData) {
    if (appState.gifPreviewInterval) {
      clearInterval(appState.gifPreviewInterval);
      appState.gifPreviewInterval = null;
    }
    
    if (appState.captureMode === "gif" && appState.capturedFrames.length > 0) {
      this.originalImage = appState.capturedFrames[0];
      appState.currentPreviewFrameIndex = 0;
      
      appState.gifPreviewInterval = setInterval(() => {
        appState.currentPreviewFrameIndex = (appState.currentPreviewFrameIndex + 1) % appState.capturedFrames.length;
        this.originalImage = appState.capturedFrames[appState.currentPreviewFrameIndex];
        this.applyEffects();
      }, 350);
    } else {
      this.originalImage = imageData;
      this.applyEffects();
    }
  },
  
  applyEffects() {
    if (!this.originalImage) return;
    
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // 1. Clear Canvas
    this.ctx.clearRect(0, 0, w, h);
    
    // 2. Setup Offscreen Canvas for source modifiers
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.putImageData(this.originalImage, 0, 0);
    
    // 3. Draw image back with zoom/crop translations
    const scale = appState.adjustZoom / 100;
    const sw = w / scale;
    const sh = h / scale;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;
    
    this.ctx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, w, h);
    
    // 4. Extract pixel data for filters and adjustments
    let currentImgData = this.ctx.getImageData(0, 0, w, h);
    let pixels = currentImgData.data;
    
    // Quick Brightness Adjustment
    const br = appState.adjustBrightness * 2.5; // Scale to -125...125
    
    // Quick Skin Tone Smoothing parameter
    const stSmooth = appState.adjustSkinTone;
    
    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i+1];
      let b = pixels[i+2];
      
      // A. Apply Brightness
      if (br !== 0) {
        r = Math.min(255, Math.max(0, r + br));
        g = Math.min(255, Math.max(0, g + br));
        b = Math.min(255, Math.max(0, b + br));
      }
      
      // B. Skin tone softening simulation: detect skin colors and blend
      if (stSmooth > 0) {
        // Simple human skin threshold matching
        if (r > 60 && g > 40 && b > 20 && (Math.max(r,g,b) - Math.min(r,g,b) > 15) && Math.abs(r - g) > 15 && r > g && r > b) {
          // Soften skin tone by blending with a local average/median color (soft rose/peach)
          const weight = stSmooth / 250; // Max 40% blend
          r = r * (1 - weight) + 240 * weight;
          g = g * (1 - weight) + 190 * weight;
          b = b * (1 - weight) + 170 * weight;
        }
      }
      
      // C. Apply Filter Formulae
      if (appState.activeFilter === "vintage") {
        // Sepia recipe
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = Math.min(255, tr);
        g = Math.min(255, tg);
        b = Math.min(255, tb);
      } else if (appState.activeFilter === "cyber") {
        // High saturation + violet/cyan tint mapping
        const avg = (r + g + b) / 3;
        r = Math.min(255, Math.max(0, r * 0.4 + avg * 0.6 + 50));
        g = Math.min(255, Math.max(0, g * 0.7 + avg * 0.3));
        b = Math.min(255, Math.max(0, b * 0.5 + avg * 0.5 + 80));
      } else if (appState.activeFilter === "cartoon") {
        // High contrast posterization
        r = Math.floor(r / 32) * 32;
        g = Math.floor(g / 32) * 32;
        b = Math.floor(b / 32) * 32;
        
        // Boost contrast slightly
        const factor = (259 * (128 + 100)) / (255 * (259 - 100));
        r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
        g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
        b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
      }
      
      pixels[i] = r;
      pixels[i+1] = g;
      pixels[i+2] = b;
    }
    
    this.ctx.putImageData(currentImgData, 0, 0);
    
    // Draw doodles from offscreen canvas
    this.ctx.drawImage(doodleCanvas, 0, 0);
    
    // Draw stickers props
    appState.stickers.forEach((stk, index) => {
      this.ctx.save();
      this.ctx.translate(stk.x, stk.y);
      this.ctx.font = `${stk.scale * 45}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(stk.text, 0, 0);
      
      if (index === appState.activeStickerIndex) {
        this.ctx.strokeStyle = "rgba(0, 243, 255, 0.8)";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(-25, -25, 50, 50);
      }
      this.ctx.restore();
    });
    
    // 5. Draw SVG Graphic Frame Template Overlay on top of edited pixels
    const activeFrameSvg = FRAME_SVGS[appState.selectedTemplate];
    if (activeFrameSvg) {
      const img = new Image();
      // Load svg as image source data
      const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(activeFrameSvg);
      img.src = svgUrl;
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, w, h);
      };
    }
  },
  
  getCollageDataUrl() {
    if (appState.captureMode !== "gif" || appState.capturedFrames.length === 0) {
      return this.canvas.toDataURL();
    }
    
    const collCanvas = document.createElement("canvas");
    collCanvas.width = 800;
    collCanvas.height = 600;
    const collCtx = collCanvas.getContext("2d");
    
    const qw = 400;
    const qh = 300;
    
    for (let i = 0; i < 4; i++) {
      const imgData = appState.capturedFrames[i];
      const dx = (i % 2) * qw;
      const dy = Math.floor(i / 2) * qh;
      
      const qCanvas = document.createElement("canvas");
      qCanvas.width = qw;
      qCanvas.height = qh;
      const qCtx = qCanvas.getContext("2d");
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 800;
      tempCanvas.height = 600;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.putImageData(imgData, 0, 0);
      
      const scale = appState.adjustZoom / 100;
      const sw = 800 / scale;
      const sh = 600 / scale;
      const sx = (800 - sw) / 2;
      const sy = (600 - sh) / 2;
      
      qCtx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, qw, qh);
      
      let qImgData = qCtx.getImageData(0, 0, qw, qh);
      let pixels = qImgData.data;
      const br = appState.adjustBrightness * 2.5;
      const stSmooth = appState.adjustSkinTone;
      
      for (let p = 0; p < pixels.length; p += 4) {
        let r = pixels[p];
        let g = pixels[p+1];
        let b = pixels[p+2];
        
        if (br !== 0) {
          r = Math.min(255, Math.max(0, r + br));
          g = Math.min(255, Math.max(0, g + br));
          b = Math.min(255, Math.max(0, b + br));
        }
        
        if (stSmooth > 0) {
          if (r > 60 && g > 40 && b > 20 && (Math.max(r,g,b) - Math.min(r,g,b) > 15) && Math.abs(r - g) > 15 && r > g && r > b) {
            const weight = stSmooth / 250;
            r = r * (1 - weight) + 240 * weight;
            g = g * (1 - weight) + 190 * weight;
            b = b * (1 - weight) + 170 * weight;
          }
        }
        
        if (appState.activeFilter === "vintage") {
          const tr = 0.393 * r + 0.769 * g + 0.189 * b;
          const tg = 0.349 * r + 0.686 * g + 0.168 * b;
          const tb = 0.272 * r + 0.534 * g + 0.131 * b;
          r = Math.min(255, tr); g = Math.min(255, tg); b = Math.min(255, tb);
        } else if (appState.activeFilter === "cyber") {
          const avg = (r + g + b) / 3;
          r = Math.min(255, Math.max(0, r * 0.4 + avg * 0.6 + 50));
          g = Math.min(255, Math.max(0, g * 0.7 + avg * 0.3));
          b = Math.min(255, Math.max(0, b * 0.5 + avg * 0.5 + 80));
        } else if (appState.activeFilter === "cartoon") {
          r = Math.floor(r / 32) * 32; g = Math.floor(g / 32) * 32; b = Math.floor(b / 32) * 32;
          const factor = (259 * (128 + 100)) / (255 * (259 - 100));
          r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
        }
        
        pixels[p] = r;
        pixels[p+1] = g;
        pixels[p+2] = b;
      }
      
      qCtx.putImageData(qImgData, 0, 0);
      collCtx.drawImage(qCanvas, dx, dy);
      
      collCtx.strokeStyle = "rgba(0,0,0,0.4)";
      collCtx.lineWidth = 4;
      collCtx.strokeRect(dx, dy, qw, qh);
    }
    
    // Draw Doodles (overlayed once on whole collage)
    collCtx.drawImage(doodleCanvas, 0, 0);
    
    // Draw Stickers
    appState.stickers.forEach(stk => {
      collCtx.save();
      collCtx.translate(stk.x, stk.y);
      collCtx.font = `${stk.scale * 45}px Arial`;
      collCtx.textAlign = "center";
      collCtx.textBaseline = "middle";
      collCtx.fillText(stk.text, 0, 0);
      collCtx.restore();
    });
    
    // Draw SVG Frame Overlay on top of collage
    const activeFrameSvg = FRAME_SVGS[appState.selectedTemplate];
    if (activeFrameSvg) {
      const img = new Image();
      const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(activeFrameSvg);
      img.src = svgUrl;
      collCtx.drawImage(ImageProcessor.canvas, 0, 0);
    }
    
    return collCanvas.toDataURL();
  }
  }
};

// ==========================================
// 7. MOCK JOBS QUEUE ENGINE (Operator)
// ==========================================
const OperatorEngine = {
  init() {
    // Populate queue with three initial logs
    this.createJob("CYBER-991A", "neon", "Printed", "2026-06-25 15:30:12");
    this.createJob("RETRO-24B3", "retro", "Shared", "2026-06-25 15:42:08");
    this.createJob("PARTY-0112", "party", "Failed", "2026-06-25 16:01:45");
    this.renderQueueTable();
  },
  
  createJob(jobCode, template, status, time = null) {
    const timestamp = time || new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Make a dummy canvas visual for thumbnail representing the template
    const dummyThumbCanvas = document.createElement("canvas");
    dummyThumbCanvas.width = 44;
    dummyThumbCanvas.height = 33;
    const dtCtx = dummyThumbCanvas.getContext("2d");
    
    if (template === "neon") {
      dtCtx.fillStyle = "#101424"; dtCtx.fillRect(0,0,44,33);
      dtCtx.strokeStyle = "#00f3ff"; dtCtx.strokeRect(2,2,40,29);
    } else if (template === "retro") {
      dtCtx.fillStyle = "#141414"; dtCtx.fillRect(0,0,44,33);
      dtCtx.fillStyle = "#cc8b3c"; dtCtx.fillRect(5,2,3,29); dtCtx.fillRect(36,2,3,29);
    } else {
      dtCtx.fillStyle = "#0c0f1d"; dtCtx.fillRect(0,0,44,33);
      dtCtx.fillStyle = "#ff4081"; dtCtx.beginPath(); dtCtx.arc(12,16,6,0,2*Math.PI); dtCtx.fill();
      dtCtx.fillStyle = "#00e5ff"; dtCtx.beginPath(); dtCtx.arc(30,12,5,0,2*Math.PI); dtCtx.fill();
    }
    
    appState.jobsQueue.unshift({
      id: jobCode,
      template: template,
      status: status,
      time: timestamp,
      thumbnail: dummyThumbCanvas.toDataURL()
    });
  },
  
  renderQueueTable() {
    const tbody = document.getElementById("operator-queue-tbody");
    tbody.innerHTML = "";
    
    if (appState.jobsQueue.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-queue-cell">No jobs currently in print queue.</td></tr>`;
      return;
    }
    
    appState.jobsQueue.forEach((job) => {
      let statusClass = "q-completed";
      if (job.status === "Printing") statusClass = "q-printing";
      if (job.status === "Processing") statusClass = "q-processing";
      if (job.status === "Failed") statusClass = "q-failed";
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${job.id}</strong></td>
        <td><img src="${job.thumbnail}" class="queue-thumbnail" alt="thumbnail"></td>
        <td><span class="queue-status-badge ${statusClass}">${job.status}</span></td>
        <td>${job.time}</td>
        <td>
          <div class="row-actions" style="display: flex; gap: 4px;">
            <button class="btn btn-secondary btn-small op-reprocess-btn" data-id="${job.id}">Reprocess</button>
            <button class="btn btn-primary btn-small op-print-btn" data-id="${job.id}">Force Print</button>
            <button class="btn btn-danger btn-small op-delete-btn" data-id="${job.id}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // Attach dynamically generated action buttons
    document.querySelectorAll(".op-reprocess-btn").forEach(btn => {
      btn.onclick = () => this.reprocessJob(btn.getAttribute("data-id"));
    });
    document.querySelectorAll(".op-print-btn").forEach(btn => {
      btn.onclick = () => this.forcePrintJob(btn.getAttribute("data-id"));
    });
    document.querySelectorAll(".op-delete-btn").forEach(btn => {
      btn.onclick = () => this.deleteJob(btn.getAttribute("data-id"));
    });
  },
  
  reprocessJob(jobId) {
    operatorLog(`Reprocessing job ${jobId}...`);
    const job = appState.jobsQueue.find(j => j.id === jobId);
    if (job) {
      job.status = "Processing";
      this.renderQueueTable();
      
      // Go to processing screen for a simulated run
      showScreen("screen-processing");
      runProcessingPipeline(() => {
        job.status = "Completed";
        operatorLog(`Job ${jobId} reprocessed successfully.`, "success");
        showScreen("screen-operator");
        this.renderQueueTable();
      });
    }
  },
  
  forcePrintJob(jobId) {
    operatorLog(`Force printing job ${jobId}...`);
    const job = appState.jobsQueue.find(j => j.id === jobId);
    if (job) {
      job.status = "Printing";
      this.renderQueueTable();
      
      // Trigger short hum sound simulation
      const hum = AudioSynth.playPrintHum();
      setTimeout(() => {
        if (hum) hum.stop();
        job.status = "Printed";
        operatorLog(`Job ${jobId} print forced successfully.`, "success");
        this.renderQueueTable();
      }, 3000);
    }
  },
  
  deleteJob(jobId) {
    operatorLog(`Deleting job ${jobId} from queue.`, "warning");
    appState.jobsQueue = appState.jobsQueue.filter(j => j.id !== jobId);
    this.renderQueueTable();
  }
};

// Console logger function
function operatorLog(message, type = "info") {
  const consoleEl = document.getElementById("operator-console-log");
  const time = new Date().toTimeString().split(' ')[0];
  const div = document.createElement("div");
  
  let lineClass = "system-line";
  if (type === "warning") lineClass = "warning-line";
  if (type === "error") lineClass = "error-line";
  if (type === "success") lineClass = "success-line";
  
  div.className = `log-line ${lineClass}`;
  div.textContent = `[${time}] ${message}`;
  consoleEl.appendChild(div);
  consoleEl.scrollTop = consoleEl.scrollHeight; // Auto Scroll
}

// ==========================================
// 8. SCREEN NAVIGATION & TIMEOUTS
// ==========================================

function showScreen(screenId) {
  // Clear any existing active screen classes
  document.querySelectorAll(".kiosk-screen").forEach(screen => {
    screen.classList.remove("active");
  });
  
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add("active");
    appState.currentScreen = screenId;
    
    // Operator cancel visibility logic on processing screen
    if (screenId === "screen-processing") {
      document.getElementById("operator-cancel-container").style.display = "block";
    }
    
    // Trigger behaviors per screen enter
    if (screenId === "screen-welcome") {
      resetPhotoSession();
      startWelcomeTimeout();
    } else {
      clearWelcomeTimeout();
    }
    
    if (screenId === "screen-capture") {
      CameraController.start();
    } else {
      // Pause webcam streams when leaving capture
      if (screenId !== "screen-welcome") {
        CameraController.stop();
      }
    }
  }
}

// 10s Autostart timers
function startWelcomeTimeout() {
  clearWelcomeTimeout();
  appState.welcomeTimeLeft = 10;
  
  const display = document.getElementById("timeout-sec-display");
  const ring = document.getElementById("timeout-ring-bar");
  
  display.textContent = appState.welcomeTimeLeft;
  
  appState.welcomeTimerInterval = setInterval(() => {
    appState.welcomeTimeLeft--;
    display.textContent = appState.welcomeTimeLeft;
    
    // Scale ring progress dash offset
    const offset = (10 - appState.welcomeTimeLeft) * 10.05; // circle perimeter Math math
    ring.style.strokeDashoffset = offset;
    
    if (appState.welcomeTimeLeft <= 0) {
      clearWelcomeTimeout();
      operatorLog("Idle timeout on Welcome screen: starting capture session.");
      showScreen("screen-capture");
    }
  }, 1000);
}

function clearWelcomeTimeout() {
  if (appState.welcomeTimerInterval) {
    clearInterval(appState.welcomeTimerInterval);
    appState.welcomeTimerInterval = null;
  }
}

// ==========================================
// 9. PROCESSING PIPELINE RUNNER
// ==========================================
let currentPipelineTimeout = null;

function runProcessingPipeline(onComplete) {
  const steps = [
    { id: "step-upload", time: 2000 },
    { id: "step-bg", time: 3000 },
    { id: "step-enhance", time: 2000 },
    { id: "step-finalize", time: 1000 }
  ];
  
  // Reset steps classes to default pending
  steps.forEach(step => {
    const el = document.getElementById(step.id);
    el.className = "pipeline-step pending";
    el.querySelector(".step-icon").innerHTML = `<i class="fa-solid fa-hourglass"></i>`;
  });
  
  let currentIdx = 0;
  
  function processStep() {
    if (currentIdx >= steps.length) {
      onComplete();
      return;
    }
    
    const step = steps[currentIdx];
    const el = document.getElementById(step.id);
    el.className = "pipeline-step active";
    el.querySelector(".step-icon").innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    
    currentPipelineTimeout = setTimeout(() => {
      el.className = "pipeline-step completed";
      el.querySelector(".step-icon").innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
      
      currentIdx++;
      processStep();
    }, step.time);
  }
  
  processStep();
}

function abortProcessingPipeline() {
  if (currentPipelineTimeout) {
    clearTimeout(currentPipelineTimeout);
    currentPipelineTimeout = null;
    operatorLog("Image processing aborted by operator.", "error");
    alert(translations[appState.language].jobAborted);
    showScreen("screen-welcome");
  }
}

// ==========================================
// 10. ACCESSIBILITY & i18n MANAGERS
// ==========================================

function updateLanguage(lang) {
  appState.language = lang;
  document.getElementById("toggle-lang").querySelector("span").textContent = lang === "en" ? "ES" : "EN";
  
  const dict = translations[lang];
  
  // Translate Welcome
  document.getElementById("welcome-title").textContent = dict.welcomeTitle;
  document.getElementById("welcome-subtitle-text").textContent = dict.welcomeSubtitleText;
  document.getElementById("txt-learn-more").textContent = dict.learnMore;
  document.getElementById("txt-i-agree").textContent = dict.iAgree;
  document.getElementById("timeout-label").textContent = dict.timeoutLabel;
  
  // Translate Capture
  document.getElementById("txt-perfectly-framed").textContent = dict.perfectlyFramed;
  document.getElementById("txt-low-light").textContent = dict.lowLight;
  document.getElementById("txt-pose-tips-title").textContent = dict.poseTipsTitle;
  document.getElementById("tips-text").textContent = dict.poseTipsDesc;
  document.getElementById("txt-select-template").textContent = dict.selectTemplate;
  document.getElementById("txt-switch-cam").textContent = dict.switchCam;
  document.getElementById("txt-flash").textContent = appState.flashActive ? dict.flash : (lang === "en" ? "Flash Off" : "Flash Apagado");
  document.getElementById("txt-take-photo").textContent = dict.takePhoto;
  
  // Translate Processing
  document.getElementById("txt-processing-title").textContent = dict.processingTitle;
  document.getElementById("txt-processing-desc").textContent = dict.processingDesc;
  document.getElementById("txt-step-upload").textContent = dict.stepUpload;
  document.getElementById("txt-step-bg").textContent = dict.stepBg;
  document.getElementById("txt-step-enhance").textContent = dict.stepEnhance;
  document.getElementById("txt-step-finalize").textContent = dict.stepFinalize;
  
  // Translate Preview
  document.getElementById("txt-adjust-title").textContent = dict.adjustTitle;
  document.getElementById("txt-slider-zoom").innerHTML = `<i class="fa-solid fa-maximize"></i> ${dict.sliderZoom}`;
  document.getElementById("txt-slider-brightness").innerHTML = `<i class="fa-solid fa-sun"></i> ${dict.sliderBrightness}`;
  document.getElementById("txt-slider-skintone").innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${dict.sliderSkintone}`;
  document.getElementById("txt-filters-label").textContent = dict.filtersLabel;
  document.getElementById("txt-filter-orig").textContent = dict.filterOrig;
  document.getElementById("txt-filter-vintage").textContent = dict.filterVintage;
  document.getElementById("txt-filter-cyber").textContent = dict.filterCyber;
  document.getElementById("txt-filter-cartoon").textContent = dict.filterCartoon;
  document.getElementById("txt-retake").textContent = dict.retake;
  document.getElementById("txt-print").textContent = dict.print;
  document.getElementById("txt-share-qr").textContent = dict.shareQr;
  document.getElementById("txt-ttl-footer").textContent = dict.ttlFooter;
  
  // Translate Print
  document.getElementById("txt-print-options").innerHTML = `<i class="fa-solid fa-print"></i> ${dict.printOptions}`;
  document.getElementById("txt-print-size").textContent = dict.printSize;
  document.getElementById("txt-size-standard").textContent = dict.sizeStandard;
  document.getElementById("txt-size-large").textContent = dict.sizeLarge;
  document.getElementById("txt-print-copies").textContent = dict.printCopies;
  document.getElementById("txt-copy-limit").textContent = dict.copyLimit;
  document.getElementById("txt-print-now-btn").textContent = dict.printNowBtn;
  document.getElementById("txt-print-back").textContent = dict.printBack;
  document.getElementById("txt-printing-kiosk").textContent = dict.printingKiosk;
  document.getElementById("txt-print-complete").textContent = dict.printComplete;
  document.getElementById("txt-pickup-instruction").textContent = dict.pickupInstruction;
  document.getElementById("txt-rec-job").textContent = dict.recJob;
  document.getElementById("txt-rec-code").textContent = dict.recCode;
  document.getElementById("txt-rec-copies").textContent = dict.recCopies;
  document.getElementById("txt-rec-footer").textContent = dict.recFooter;
  document.getElementById("txt-done").textContent = dict.done;
  
  // Translate Share
  document.getElementById("txt-scan-title").innerHTML = `<i class="fa-solid fa-qrcode"></i> ${dict.scanTitle}`;
  document.getElementById("txt-scan-desc").textContent = dict.scanDesc;
  document.getElementById("txt-deletes-in").textContent = dict.deletesIn;
  document.getElementById("txt-alt-delivery").innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${dict.altDelivery}`;
  document.getElementById("txt-sms-btn").textContent = dict.smsBtn;
  document.getElementById("txt-email-btn").textContent = dict.emailBtn;
  document.getElementById("txt-send-btn-sms").textContent = dict.sendBtnSms;
  document.getElementById("txt-send-btn-email").textContent = dict.sendBtnEmail;
  document.getElementById("txt-marketing-opt").textContent = dict.marketingOpt;
  document.getElementById("txt-copy-link-btn").textContent = dict.copyLinkBtn;
  document.getElementById("txt-share-back").textContent = dict.shareBack;
  document.getElementById("txt-share-done").textContent = dict.shareDone;
  
  // Queue Table headers
  document.getElementById("th-id").textContent = dict.recJob;
  document.getElementById("th-status").textContent = "Status";
  document.getElementById("th-time").textContent = "Timestamp";
  
  // Translate Upgrades UI elements
  document.getElementById("txt-tab-adjust").textContent = dict.tabAdjust;
  document.getElementById("txt-tab-decorate").textContent = dict.tabDecorate;
  document.getElementById("txt-doodle-label").textContent = dict.doodleLabel;
  document.getElementById("txt-brush-size").textContent = dict.brushSizeLabel;
  document.getElementById("txt-clear-draw").textContent = dict.clearDrawBtn;
  document.getElementById("txt-stickers-label").textContent = dict.stickersLabel;
  document.getElementById("txt-sticker-help").textContent = dict.stickerHelpText;
  document.getElementById("txt-mode-single").textContent = dict.modeSingle;
  document.getElementById("txt-mode-gif").textContent = dict.modeGif;
  document.getElementById("txt-capture-mode").textContent = dict.captureModeLabel;
  
  operatorLog(`Language changed to: ${lang.toUpperCase()}`);
}

// ==========================================
// 11. BIND EVENT HANDLERS & INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  
  // A. Initializations
  CameraController.init("webcam-feed", "fallback-camera-canvas");
  ImageProcessor.init("photo-render-canvas");
  ConfettiEngine.init("confetti-canvas");
  OperatorEngine.init();
  
  // Start Welcome Idle Timer
  showScreen("screen-welcome");
  
  // Set real clock in header
  setInterval(() => {
    const now = new Date();
    document.getElementById("clock-display").textContent = now.toTimeString().split(' ')[0].substring(0, 5);
  }, 1000);
  
  // B. Accessibility Panel bindings
  document.getElementById("toggle-contrast").onclick = () => {
    appState.highContrast = !appState.highContrast;
    if (appState.highContrast) {
      document.body.classList.add("theme-high-contrast");
      document.getElementById("toggle-contrast").classList.add("active");
    } else {
      document.body.classList.remove("theme-high-contrast");
      document.getElementById("toggle-contrast").classList.remove("active");
    }
  };
  
  document.getElementById("toggle-text-size").onclick = () => {
    const sizes = ["small", "medium", "large"];
    let idx = sizes.indexOf(appState.textSize);
    idx = (idx + 1) % sizes.length;
    appState.textSize = sizes[idx];
    
    document.body.classList.remove("size-small", "size-medium", "size-large");
    document.body.classList.add(`size-${appState.textSize}`);
    
    operatorLog(`Text scaling cycle: ${appState.textSize.toUpperCase()}`);
  };

  document.getElementById("toggle-sound").onclick = () => {
    appState.soundEnabled = !appState.soundEnabled;
    const btn = document.getElementById("toggle-sound");
    if (appState.soundEnabled) {
      btn.classList.add("active");
      btn.querySelector("i").className = "fa-solid fa-volume-high";
    } else {
      btn.classList.remove("active");
      btn.querySelector("i").className = "fa-solid fa-volume-xmark";
    }
  };
  
  document.getElementById("toggle-lang").onclick = () => {
    const nextLang = appState.language === "en" ? "es" : "en";
    updateLanguage(nextLang);
  };
  
  // C. Screen 1: Welcome Screen Bindings
  document.getElementById("btn-agree").onclick = () => {
    AudioSynth.playBeep(600, 0.1);
    showScreen("screen-capture");
  };
  
  // Privacy Learn More Modal
  const modalLearn = document.getElementById("modal-learn-more");
  document.getElementById("btn-learn-more").onclick = () => {
    clearWelcomeTimeout();
    modalLearn.style.display = "flex";
  };
  document.getElementById("btn-close-modal").onclick = () => {
    modalLearn.style.display = "none";
    if (appState.currentScreen === "screen-welcome") startWelcomeTimeout();
  };
  document.getElementById("btn-modal-close-confirm").onclick = () => {
    modalLearn.style.display = "none";
    if (appState.currentScreen === "screen-welcome") startWelcomeTimeout();
  };
  
  // D. Screen 2: Capture Viewfinder Bindings
  // Switch Camera
  document.getElementById("btn-camera-switch").onclick = () => {
    appState.activeCameraMode = appState.activeCameraMode === "user" ? "environment" : "user";
    CameraController.start();
  };
  
  // Toggle Flash (UI styling update)
  document.getElementById("btn-camera-flash").onclick = () => {
    appState.flashActive = !appState.flashActive;
    const btn = document.getElementById("btn-camera-flash");
    if (appState.flashActive) {
      btn.classList.add("active");
      btn.querySelector("span").textContent = appState.language === "en" ? "Flash On" : "Flash Activado";
    } else {
      btn.classList.remove("active");
      btn.querySelector("span").textContent = appState.language === "en" ? "Flash Off" : "Flash Apagado";
    }
  };
  
  // Pose tips toggle
  const poseTipsBtn = document.getElementById("toggle-pose-tips");
  const poseTipsContent = document.getElementById("tips-dropdown-content");
  poseTipsBtn.onclick = () => {
    const expanded = poseTipsBtn.getAttribute("aria-expanded") === "true";
    poseTipsBtn.setAttribute("aria-expanded", !expanded);
    poseTipsContent.style.display = expanded ? "none" : "block";
  };
  
  // Template Selectors
  document.querySelectorAll(".template-item").forEach(item => {
    item.onclick = () => {
      document.querySelectorAll(".template-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      
      const tmpl = item.getAttribute("data-template");
      appState.selectedTemplate = tmpl;
      
      // Load current frame template as visual overlay
      const overlayEl = document.getElementById("active-frame-overlay");
      overlayEl.innerHTML = FRAME_SVGS[tmpl];
      
      operatorLog(`Template selected: ${tmpl.toUpperCase()}`);
    };
  });
  // Trigger initial overlay load
  document.getElementById("active-frame-overlay").innerHTML = FRAME_SVGS[appState.selectedTemplate];
  
  // Bind Theme Selector Dropdown
  document.getElementById("toggle-theme-select").onchange = (e) => {
    const nextTheme = e.target.value;
    document.body.classList.remove("theme-cyber", "theme-retro-warm", "theme-chic-minimal");
    document.body.classList.add(`theme-${nextTheme}`);
    appState.currentTheme = nextTheme;
    operatorLog(`System theme changed to: ${nextTheme.toUpperCase()}`);
  };
  
  // Bind Capture Mode Toggle buttons
  document.getElementById("btn-mode-single").onclick = () => {
    appState.captureMode = "single";
    document.getElementById("btn-mode-single").classList.add("active");
    document.getElementById("btn-mode-gif").classList.remove("active");
    operatorLog("Capture mode set to: SINGLE SHOT");
  };
  document.getElementById("btn-mode-gif").onclick = () => {
    appState.captureMode = "gif";
    document.getElementById("btn-mode-gif").classList.add("active");
    document.getElementById("btn-mode-single").classList.remove("active");
    operatorLog("Capture mode set to: 4-SHOT GIF");
  };
  
  // Bind Customizer Tabs Toggles
  document.getElementById("btn-tab-adjust").onclick = () => {
    document.getElementById("btn-tab-adjust").classList.add("active");
    document.getElementById("btn-tab-decorate").classList.remove("active");
    document.getElementById("tab-pane-adjust").style.display = "flex";
    document.getElementById("tab-pane-decorate").style.display = "none";
  };
  document.getElementById("btn-tab-decorate").onclick = () => {
    document.getElementById("btn-tab-decorate").classList.add("active");
    document.getElementById("btn-tab-adjust").classList.remove("active");
    document.getElementById("tab-pane-adjust").style.display = "none";
    document.getElementById("tab-pane-decorate").style.display = "flex";
  };
  
  // Bind Pen Brush Controls
  document.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.onclick = () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      appState.brushColor = swatch.getAttribute("data-color");
    };
  });
  
  document.getElementById("slider-brush-size").oninput = (e) => {
    appState.brushSize = parseInt(e.target.value);
  };
  
  document.getElementById("btn-clear-drawing").onclick = () => {
    doodleCtx.clearRect(0, 0, 800, 600);
    ImageProcessor.applyEffects();
    operatorLog("Cleared signature doodles.");
  };
  
  // Bind Drawing Touch/Mouse Drag Coordinates on Preview Canvas
  const renderCanvas = document.getElementById("photo-render-canvas");
  let isDrawingPen = false;
  let isDraggingStk = false;
  
  function getCanvasDrawCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  }
  
  renderCanvas.addEventListener("mousedown", (e) => startDrawOrDragPen(e));
  renderCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startDrawOrDragPen(e);
  });
  
  renderCanvas.addEventListener("mousemove", (e) => moveDrawOrDragPen(e));
  renderCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    moveDrawOrDragPen(e);
  });
  
  renderCanvas.addEventListener("mouseup", () => stopDrawOrDragPen());
  renderCanvas.addEventListener("touchend", () => stopDrawOrDragPen());
  renderCanvas.addEventListener("mouseleave", () => stopDrawOrDragPen());
  
  function startDrawOrDragPen(e) {
    const activeTab = document.getElementById("btn-tab-decorate").classList.contains("active");
    if (!activeTab) return;
    
    const pos = getCanvasDrawCoords(e, renderCanvas);
    
    let clickedStkIdx = -1;
    for (let i = appState.stickers.length - 1; i >= 0; i--) {
      const stk = appState.stickers[i];
      const dist = Math.hypot(pos.x - stk.x, pos.y - stk.y);
      if (dist < 40) {
        clickedStkIdx = i;
        break;
      }
    }
    
    if (clickedStkIdx !== -1) {
      isDraggingStk = true;
      appState.activeStickerIndex = clickedStkIdx;
      operatorLog(`Dragging sticker: ${appState.stickers[clickedStkIdx].text}`);
    } else {
      isDrawingPen = true;
      doodleCtx.beginPath();
      doodleCtx.moveTo(pos.x, pos.y);
      doodleCtx.lineCap = "round";
      doodleCtx.lineJoin = "round";
      doodleCtx.strokeStyle = appState.brushColor;
      doodleCtx.lineWidth = appState.brushSize;
    }
  }
  
  function moveDrawOrDragPen(e) {
    const pos = getCanvasDrawCoords(e, renderCanvas);
    
    if (isDraggingStk && appState.activeStickerIndex !== -1) {
      const stk = appState.stickers[appState.activeStickerIndex];
      stk.x = pos.x;
      stk.y = pos.y;
      ImageProcessor.applyEffects();
    } else if (isDrawingPen) {
      doodleCtx.lineTo(pos.x, pos.y);
      doodleCtx.stroke();
      ImageProcessor.applyEffects();
    }
  }
  
  function stopDrawOrDragPen() {
    if (isDraggingStk && appState.activeStickerIndex !== -1) {
      const stk = appState.stickers[appState.activeStickerIndex];
      if (stk.x < 30 || stk.x > 770 || stk.y < 30 || stk.y > 570) {
        operatorLog(`Removed sticker prop: ${stk.text}`);
        appState.stickers.splice(appState.activeStickerIndex, 1);
      }
      isDraggingStk = false;
      appState.activeStickerIndex = -1;
      ImageProcessor.applyEffects();
    }
    isDrawingPen = false;
  }
  
  // Bind Stickers Grid Items Clicks
  document.querySelectorAll(".sticker-item").forEach(item => {
    item.onclick = () => {
      const emoji = item.getAttribute("data-sticker");
      appState.stickers.push({
        text: emoji,
        x: 400,
        y: 300,
        scale: 1.0,
        angle: 0
      });
      ImageProcessor.applyEffects();
      operatorLog(`Placed sticker prop: ${emoji}`);
    };
  });
  
  // Gigantic Take Photo Trigger
  document.getElementById("btn-take-photo").onclick = () => {
    triggerPhotoCountdown();
  };
  
  function triggerPhotoCountdown() {
    // Hide controls during countdown
    const takePhotoBtn = document.getElementById("btn-take-photo");
    takePhotoBtn.disabled = true;
    
    const countOverlay = document.getElementById("countdown-overlay");
    const countText = document.getElementById("countdown-text");
    
    countOverlay.classList.add("active");
    countText.style.display = "block";
    
    let secondsLeft = 3;
    countText.textContent = secondsLeft;
    countText.className = "countdown-number animate";
    AudioSynth.playBeep(880, 0.1);
    
    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        countText.textContent = secondsLeft;
        countText.classList.remove("animate");
        void countText.offsetWidth; // Trigger reflow
        countText.classList.add("animate");
        AudioSynth.playBeep(880, 0.1);
      } else {
        clearInterval(interval);
        
        // Take photo action
        countOverlay.classList.remove("active");
        countText.style.display = "none";
        takePhotoBtn.disabled = false;
        
        captureInstantPhoto();
      }
    }, 1000);
  }
  
  function captureInstantPhoto() {
    if (appState.captureMode === "gif") {
      runGifCaptureSequence();
    } else {
      runSingleCaptureSequence();
    }
  }

  function runSingleCaptureSequence() {
    triggerFlashEffect();
    AudioSynth.playShutter();
    triggerHaptics([80, 50, 80]);
    
    const snapPixels = CameraController.captureFrame();
    appState.capturedImageBuffer = snapPixels;
    appState.capturedFrames = [];
    
    operatorLog("Single photo captured successfully. Dispatching processing.");
    showScreen("screen-processing");
    
    runProcessingPipeline(() => {
      operatorLog("Image processing completed.");
      ImageProcessor.loadImage(appState.capturedImageBuffer);
      showScreen("screen-preview");
    });
  }

  function triggerFlashEffect() {
    const flashEl = document.getElementById("flash-effect");
    if (flashEl && appState.flashActive) {
      flashEl.style.opacity = 1;
      setTimeout(() => {
        flashEl.style.opacity = 0;
      }, 150);
    }
  }

  function runGifCaptureSequence() {
    appState.capturedFrames = [];
    let shotCount = 0;
    
    function captureNextShot() {
      if (shotCount >= 4) {
        operatorLog("4-Shot GIF capture sequence complete. Dispatching processing.");
        appState.capturedImageBuffer = appState.capturedFrames[0];
        showScreen("screen-processing");
        
        runProcessingPipeline(() => {
          operatorLog("GIF loops compilation completed.");
          ImageProcessor.loadImage(appState.capturedFrames[0]);
          showScreen("screen-preview");
        });
        return;
      }
      
      operatorLog(`Capturing frame ${shotCount + 1} of 4...`);
      triggerFlashEffect();
      AudioSynth.playShutter();
      triggerHaptics([60, 40, 60]);
      
      const snapPixels = CameraController.captureFrame();
      appState.capturedFrames.push(snapPixels);
      
      shotCount++;
      
      if (shotCount < 4) {
        setTimeout(() => {
          AudioSynth.playBeep(600, 0.08);
          setTimeout(() => captureNextShot(), 400);
        }, 800);
      } else {
        captureNextShot();
      }
    }
    
    captureNextShot();
  }
  
  // Abort processing
  document.getElementById("btn-operator-abort").onclick = () => {
    abortProcessingPipeline();
  };
  
  // E. Screen 4: Preview & Edit Screen Bindings
  // Sliders
  const zoomSlider = document.getElementById("slider-zoom");
  zoomSlider.oninput = () => {
    appState.adjustZoom = parseInt(zoomSlider.value);
    document.getElementById("val-zoom").textContent = `${appState.adjustZoom}%`;
    ImageProcessor.applyEffects();
  };
  
  const brightnessSlider = document.getElementById("slider-brightness");
  brightnessSlider.oninput = () => {
    appState.adjustBrightness = parseInt(brightnessSlider.value);
    document.getElementById("val-brightness").textContent = appState.adjustBrightness > 0 ? `+${appState.adjustBrightness}` : appState.adjustBrightness;
    ImageProcessor.applyEffects();
  };

  const skintoneSlider = document.getElementById("slider-skintone");
  skintoneSlider.oninput = () => {
    appState.adjustSkinTone = parseInt(skintoneSlider.value);
    document.getElementById("val-skintone").textContent = appState.adjustSkinTone;
    ImageProcessor.applyEffects();
  };
  
  // Filters Selection
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      appState.activeFilter = btn.getAttribute("data-filter");
      ImageProcessor.applyEffects();
      
      operatorLog(`Filter applied: ${appState.activeFilter.toUpperCase()}`);
    };
  });
  
  // Actions
  document.getElementById("btn-retake").onclick = () => {
    AudioSynth.playBeep(500, 0.1);
    showScreen("screen-capture");
  };
  
  document.getElementById("btn-goto-print").onclick = () => {
    // Reset copies count display
    appState.copyCount = 1;
    document.getElementById("copies-count-display").textContent = 1;
    
    // Hide printing screen panels
    document.getElementById("printing-in-progress-display").style.display = "none";
    document.getElementById("print-receipt-card").style.display = "none";
    document.getElementById("printer-device-mock").style.display = "flex";
    document.getElementById("printer-slide-photo-img").classList.remove("animate-print");
    
    showScreen("screen-print");
  };
  
  document.getElementById("btn-goto-share").onclick = () => {
    generateSessionSharingCodes();
    showScreen("screen-share");
  };
  
  // F. Screen 5: Print Screen Bindings
  // Dimensions Selector
  document.querySelectorAll(".size-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.selectedPrintSize = btn.getAttribute("data-size");
    };
  });
  
  // Copies Steppers
  document.getElementById("btn-copy-minus").onclick = () => {
    if (appState.copyCount > 1) {
      appState.copyCount--;
      document.getElementById("copies-count-display").textContent = appState.copyCount;
    }
  };
  document.getElementById("btn-copy-plus").onclick = () => {
    if (appState.copyCount < appState.maxPrintsAllowed) {
      appState.copyCount++;
      document.getElementById("copies-count-display").textContent = appState.copyCount;
    }
  };
  
  document.getElementById("btn-print-back").onclick = () => {
    showScreen("screen-preview");
  };
  
  // Run Print Process
  document.getElementById("btn-print-now").onclick = () => {
    runPhysicalPrinting();
  };
  
  function runPhysicalPrinting() {
    generateSessionSharingCodes(); // setup receipt values
    
    const printProgress = document.getElementById("printing-in-progress-display");
    const printBar = document.getElementById("print-progress-bar");
    const printEta = document.getElementById("print-eta-label");
    
    printProgress.style.display = "flex";
    printBar.style.width = "0%";
    
    // Start hum sound
    const hum = AudioSynth.playPrintHum();
    triggerHaptics([100, 100, 100, 100]);
    
    let printSec = 0;
    const totalPrintSec = 8;
    printEta.textContent = appState.language === "en" 
      ? `Estimated: ${totalPrintSec} seconds remaining`
      : `Estimado: ${totalPrintSec} segundos restantes`;
      
    // Create new Operator Job
    OperatorEngine.createJob(appState.currentJobToken, appState.selectedTemplate, "Printing");
    OperatorEngine.renderQueueTable();
    
    const printInterval = setInterval(() => {
      printSec++;
      const progress = (printSec / totalPrintSec) * 100;
      printBar.style.width = `${progress}%`;
      
      const timeLeft = totalPrintSec - printSec;
      printEta.textContent = appState.language === "en"
        ? `Estimated: ${timeLeft} seconds remaining`
        : `Estimado: ${timeLeft} segundos restantes`;
      
      if (printSec >= totalPrintSec) {
        clearInterval(printInterval);
        
        // Stop mechanical hum
        if (hum) hum.stop();
        
        // Adjust printer levels
        appState.paperLevel = Math.max(0, appState.paperLevel - 1);
        appState.inkLevel = Math.max(0, appState.inkLevel - 2);
        updateHardwareDashboardStats();
        
        // Hide print overlay, trigger photo slide out animation
        printProgress.style.display = "none";
        
        const printedImg = document.getElementById("printer-slide-photo-img");
        printedImg.style.backgroundImage = `url(${ImageProcessor.getCollageDataUrl()})`;
        printedImg.classList.add("animate-print");
        
        // Update operator job status
        const job = appState.jobsQueue.find(j => j.id === appState.currentJobToken);
        if (job) job.status = "Printed";
        OperatorEngine.renderQueueTable();
        
        setTimeout(() => {
          // Play success chime
          AudioSynth.playBeep(523.25, 0.15); // C5
          setTimeout(() => AudioSynth.playBeep(659.25, 0.15), 100); // E5
          setTimeout(() => AudioSynth.playBeep(783.99, 0.25), 200); // G5
          
          ConfettiEngine.start();
          
          // Populate Receipt Ticket fields
          document.getElementById("receipt-datetime").textContent = new Date().toISOString().slice(0, 19).replace('T', ' ');
          document.getElementById("receipt-job-token").textContent = appState.currentJobToken;
          document.getElementById("receipt-short-code").textContent = appState.currentShortCode;
          document.getElementById("receipt-copies").textContent = `${appState.copyCount} ${appState.language === "en" ? "Copy" : "Copia"}(s) (${appState.selectedPrintSize})`;
          
          document.getElementById("printer-device-mock").style.display = "none";
          document.getElementById("print-receipt-card").style.display = "block";
          
          operatorLog(`Printed Job ${appState.currentJobToken} successfully.`, "success");
        }, 3000); // Wait for sliding print animation to complete
      }
    }, 1000);
  }
  
  function updateHardwareDashboardStats() {
    document.getElementById("status-paper-fill").style.width = `${appState.paperLevel}%`;
    document.getElementById("lbl-paper-level").textContent = `${appState.paperLevel}% (${Math.round(appState.paperLevel * 5)} / 500 prints)`;
    
    document.getElementById("status-ink-fill").style.width = `${appState.inkLevel}%`;
    document.getElementById("lbl-ink-level").textContent = `${appState.inkLevel}%`;
    
    if (appState.paperLevel < 10) {
      document.getElementById("status-paper-fill").style.background = "#ff3333";
      operatorLog("CRITICAL: Printer paper levels extremely low!", "error");
    }
  }
  
  // Finish Print flow
  document.getElementById("btn-print-done").onclick = () => {
    ConfettiEngine.stop();
    showScreen("screen-welcome");
  };
  
  // G. Screen 6: Share Screen Bindings
  document.querySelectorAll(".delivery-collapse-trigger").forEach(trigger => {
    trigger.onclick = () => {
      const targetId = trigger.getAttribute("data-target");
      const content = document.getElementById(targetId);
      const isOpen = content.classList.contains("active");
      
      document.querySelectorAll(".delivery-collapse-content").forEach(c => c.classList.remove("active"));
      
      if (!isOpen) {
        content.classList.add("active");
      }
    };
  });
  
  // Submit SMS Send
  document.getElementById("btn-send-sms").onclick = () => {
    const input = document.getElementById("input-sms-number").value.trim();
    const feedback = document.getElementById("sms-feedback-msg");
    
    // Simple phone regex validation
    if (/^\+?[0-9\s\-()]{7,16}$/.test(input)) {
      feedback.textContent = translations[appState.language].smsSuccess;
      feedback.className = "delivery-feedback success";
      operatorLog(`Simulated SMS photo sharing to ${input}.`);
    } else {
      feedback.textContent = translations[appState.language].smsError;
      feedback.className = "delivery-feedback error";
    }
  };

  // Submit Email Send
  document.getElementById("btn-send-email").onclick = () => {
    const input = document.getElementById("input-email-address").value.trim();
    const feedback = document.getElementById("email-feedback-msg");
    
    // Simple email regex validation
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      feedback.textContent = translations[appState.language].emailSuccess;
      feedback.className = "delivery-feedback success";
      operatorLog(`Simulated Email photo sharing to ${input}.`);
    } else {
      feedback.textContent = translations[appState.language].emailError;
      feedback.className = "delivery-feedback error";
    }
  };
  
  // Copy link
  document.getElementById("btn-copy-link").onclick = () => {
    const mockLink = `https://booth.event.com/share/${appState.currentJobToken}`;
    navigator.clipboard.writeText(mockLink).then(() => {
      const feedback = document.getElementById("copy-link-feedback-msg");
      feedback.textContent = translations[appState.language].linkCopied;
      feedback.className = "delivery-feedback success";
      setTimeout(() => feedback.textContent = "", 3000);
      operatorLog(`Job sharing URL copied to clipboard.`);
    });
  };
  
  document.getElementById("btn-share-back").onclick = () => {
    showScreen("screen-preview");
  };
  
  document.getElementById("btn-share-done").onclick = () => {
    // Save job status share completed
    const job = appState.jobsQueue.find(j => j.id === appState.currentJobToken);
    if (job) job.status = "Shared";
    OperatorEngine.renderQueueTable();
    
    showScreen("screen-welcome");
  };
  
  function generateSessionSharingCodes() {
    if (!appState.currentJobToken) {
      const randToken = Math.floor(Math.random() * 90000) + 10000;
      const hexChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let short = "";
      for (let i = 0; i < 4; i++) {
        short += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
      }
      
      appState.currentJobToken = `JB-${randToken}-A`;
      appState.currentShortCode = short;
      
      // Update QR Code image source URL utilizing public API QR Server
      const shareUrl = encodeURIComponent(`https://booth.event.com/share/${appState.currentJobToken}`);
      const qrImg = document.getElementById("qr-code-image");
      const qrPlaceholder = document.getElementById("qr-image-placeholder");
      
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${shareUrl}`;
      qrImg.style.display = "block";
      qrPlaceholder.style.display = "none";
      
      // Setup backup image onerror trigger if offline
      qrImg.onerror = () => {
        qrImg.style.display = "none";
        qrPlaceholder.style.display = "block";
      };
      
      // Reset delivery inputs
      document.getElementById("input-sms-number").value = "";
      document.getElementById("input-email-address").value = "";
      document.getElementById("sms-feedback-msg").textContent = "";
      document.getElementById("email-feedback-msg").textContent = "";
    }
  }
  
  // H. Operator Password Authentication Keypad bindings
  const operatorAuthModal = document.getElementById("modal-operator-auth");
  
  document.getElementById("operator-login-btn").onclick = () => {
    clearWelcomeTimeout();
    appState.authInputPin = "";
    document.getElementById("pin-field").value = "";
    document.getElementById("pin-error-feedback").textContent = "";
    operatorAuthModal.style.display = "flex";
  };
  
  document.getElementById("btn-close-auth-modal").onclick = () => {
    operatorAuthModal.style.display = "none";
    if (appState.currentScreen === "screen-welcome") startWelcomeTimeout();
  };
  
  document.querySelectorAll(".pin-key").forEach(key => {
    key.onclick = () => {
      const val = key.getAttribute("data-val");
      const pinField = document.getElementById("pin-field");
      
      if (val === "clear") {
        appState.authInputPin = "";
        pinField.value = "";
      } else if (val === null) {
        // Submit button triggers check
        verifyPasscode();
      } else {
        if (appState.authInputPin.length < 4) {
          appState.authInputPin += val;
          pinField.value = "●".repeat(appState.authInputPin.length);
        }
      }
    };
  });
  
  // Submit code passcode
  document.getElementById("btn-submit-pin").onclick = () => {
    verifyPasscode();
  };
  
  function verifyPasscode() {
    if (appState.authInputPin === CONFIG.DEFAULT_PASSCODE) {
      operatorAuthModal.style.display = "none";
      operatorLog("Staff authentication successful.", "success");
      showScreen("screen-operator");
    } else {
      AudioSynth.playBeep(330, 0.3); // Low buzzer sound
      appState.authInputPin = "";
      document.getElementById("pin-field").value = "";
      document.getElementById("pin-error-feedback").textContent = translations[appState.language].authFailed;
    }
  }
  
  // Operator Screen exit button
  document.getElementById("btn-operator-exit").onclick = () => {
    operatorLog("Staff logged out. Returning to Welcome screen.");
    showScreen("screen-welcome");
  };
  
  // Sync Operator inputs with state variables
  document.getElementById("set-print-limit").onchange = (e) => {
    appState.maxPrintsAllowed = parseInt(e.target.value);
    operatorLog(`System settings: Print limit changed to ${appState.maxPrintsAllowed}.`);
  };
  
  document.getElementById("set-gallery-ttl").onchange = (e) => {
    appState.galleryTTLHours = e.target.value;
    document.getElementById("share-timer-countdown").textContent = `${appState.galleryTTLHours}h 00m`;
    operatorLog(`System settings: Photo TTL changed to ${appState.galleryTTLHours} hours.`);
  };

  document.getElementById("set-ambient-light").onchange = (e) => {
    appState.simulatedLightLevel = e.target.value;
    operatorLog(`Simulation settings: Ambient light changed to ${appState.simulatedLightLevel}.`);
  };
  
  document.getElementById("set-face-detect").onchange = (e) => {
    appState.simulatedFaceTrack = e.target.value;
    operatorLog(`Simulation settings: Face tracking changed to ${appState.simulatedFaceTrack}.`);
  };
  
  // Operator Clear Completed Queue
  document.getElementById("btn-clear-queue").onclick = () => {
    appState.jobsQueue = appState.jobsQueue.filter(j => j.status === "Printing" || j.status === "Processing");
    OperatorEngine.renderQueueTable();
    operatorLog("Cleared completed/failed logs from active queue.");
  };
  
  // Handle custom template overlay uploads (Simulated)
  document.getElementById("btn-operator-upload").onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      document.getElementById("lbl-uploaded-file").textContent = file.name;
      operatorLog(`Custom template upload detected: ${file.name}`);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        // Register new frame template overlay
        const content = event.target.result;
        
        // If file is SVG, inject directly. Else if image, build standard rect overlay.
        if (file.name.endsWith(".svg")) {
          FRAME_SVGS.custom = content;
        } else {
          FRAME_SVGS.custom = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
              <image href="${content}" x="0" y="0" width="800" height="600" />
            </svg>`;
        }
        
        // Add custom template button option dynamically in template sidebar if not exists
        const templatesGrid = document.querySelector(".templates-grid");
        let customBtn = document.querySelector('[data-template="custom"]');
        if (!customBtn) {
          customBtn = document.createElement("button");
          customBtn.className = "template-item";
          customBtn.setAttribute("data-template", "custom");
          customBtn.innerHTML = `
            <span class="template-thumb" style="background-image: url(${event.target.result}); background-size: cover;"></span>
            <span class="template-name">${file.name.substring(0, 10)}...</span>
          `;
          templatesGrid.appendChild(customBtn);
          
          // Re-bind click handler
          customBtn.onclick = () => {
            document.querySelectorAll(".template-item").forEach(i => i.classList.remove("active"));
            customBtn.classList.add("active");
            appState.selectedTemplate = "custom";
            document.getElementById("active-frame-overlay").innerHTML = FRAME_SVGS.custom;
            operatorLog(`Template selected: CUSTOM OVERLAY`);
          };
        } else {
          // Update thumbnail
          customBtn.querySelector(".template-thumb").style.backgroundImage = `url(${event.target.result})`;
        }
        
        alert(translations[appState.language].uploadedSuccess);
      };
      
      if (file.name.endsWith(".svg")) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };
});

// Clear photo session details for new run
function resetPhotoSession() {
  appState.currentJobToken = "";
  appState.currentShortCode = "";
  appState.capturedImageBuffer = null;
  appState.adjustedImageBuffer = null;
  appState.activeFilter = "none";
  appState.adjustZoom = 100;
  appState.adjustBrightness = 0;
  appState.adjustSkinTone = 0;
  
  // Upgraded resets
  appState.captureMode = "single";
  appState.capturedFrames = [];
  appState.stickers = [];
  
  if (doodleCanvas) {
    doodleCtx.clearRect(0, 0, 800, 600);
  }
  if (appState.gifPreviewInterval) {
    clearInterval(appState.gifPreviewInterval);
    appState.gifPreviewInterval = null;
  }
  
  // Reset active tabs in UI
  const tabAdjust = document.getElementById("btn-tab-adjust");
  if (tabAdjust) tabAdjust.click();
  
  const singleModeBtn = document.getElementById("btn-mode-single");
  const gifModeBtn = document.getElementById("btn-mode-gif");
  if (singleModeBtn) singleModeBtn.classList.add("active");
  if (gifModeBtn) gifModeBtn.classList.remove("active");
  
  // Reset preview panel controls
  document.getElementById("slider-zoom").value = 100;
  document.getElementById("val-zoom").textContent = "100%";
  document.getElementById("slider-brightness").value = 0;
  document.getElementById("val-brightness").textContent = "0";
  document.getElementById("slider-skintone").value = 0;
  document.getElementById("val-skintone").textContent = "0";
  
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('[data-filter="none"]').classList.add("active");
}
