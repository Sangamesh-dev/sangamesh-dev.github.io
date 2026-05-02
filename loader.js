// Threat Scan Loader — Host Discovery Animation
// Concept: NMAP-style network scan that "discovers" Sangamesh

window.addEventListener('DOMContentLoaded', () => {
  const lineDelay = 170;
  const lineDoneDelay = 120;
  const charDelay = 25;
  const initialDelay = 80;
  const nameDelay = 120;
  const hostDelay = 420;
  const fadeBuffer = 650;
  const minDuration = 1600;
  const fadeDuration = 350;

  const overlay = document.createElement('div');
  overlay.id = 'boot-overlay';
  document.body.appendChild(overlay);

  const style = document.createElement('style');
  style.innerHTML = `
    #boot-overlay {
      position: fixed;
      inset: 0;
      background: #050508;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'DM Mono', 'Courier New', monospace;
      overflow: hidden;
    }

    /* Subtle radial pulse from center */
    #boot-overlay::before {
      content: '';
      position: absolute;
      width: 600px; height: 600px;
      border-radius: 50%;
      border: 1px solid rgba(200, 80, 42, 0.12);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0);
      animation: radarPulse 1.4s ease-out infinite;
    }
    #boot-overlay::after {
      content: '';
      position: absolute;
      width: 600px; height: 600px;
      border-radius: 50%;
      border: 1px solid rgba(200, 80, 42, 0.06);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0);
      animation: radarPulse 1.4s ease-out 0.45s infinite;
    }
    @keyframes radarPulse {
      0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
      100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
    }

    .loader-inner {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      text-align: center;
    }

    /* Scan log lines */
    .scan-log {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      width: 340px;
    }
    .scan-line {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.18);
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity 0.2s ease, transform 0.2s ease, color 0.18s ease;
    }
    .scan-line.active {
      opacity: 1;
      transform: translateX(0);
      color: rgba(255,255,255,0.45);
    }
    .scan-line.done {
      color: rgba(200, 80, 42, 0.7);
    }
    .scan-line .dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      flex-shrink: 0;
      transition: background 0.3s ease;
    }
    .scan-line.done .dot {
      background: #c8502a;
      box-shadow: 0 0 6px rgba(200,80,42,0.6);
    }
    .scan-line .label { flex: 1; text-align: left; }
    .scan-line .status {
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .scan-line.done .status { opacity: 1; color: #c8502a; }

    /* Progress bar */
    .scan-progress {
      width: 340px;
      height: 1px;
      background: rgba(255,255,255,0.06);
      position: relative;
      overflow: hidden;
    }
    .scan-progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, transparent, #c8502a, #e8854a);
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 8px rgba(200,80,42,0.4);
    }

    /* Name reveal */
    .scan-name {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: clamp(2rem, 5vw, 3.2rem);
      letter-spacing: -0.02em;
      color: transparent;
      position: relative;
      overflow: hidden;
      height: 0;
      opacity: 0;
      transition: height 0.25s ease, opacity 0.25s ease;
    }
    .scan-name.visible {
      height: 4.5rem;
      opacity: 1;
    }
    .scan-name-char {
      display: inline-block;
      color: #fafaf8;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.18s ease, transform 0.18s ease, color 0.12s ease;
    }
    .scan-name-char.space { width: 0.4em; }
    .scan-name-char.shown { opacity: 1; transform: translateY(0); }
    .scan-name-char.glitch {
      color: #c8502a;
      opacity: 1;
      transform: translateY(0);
    }

    /* HOST FOUND badge */
    .host-found {
      font-size: 0.68rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #c8502a;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      border: 1px solid rgba(200,80,42,0.3);
      padding: 0.3rem 1rem;
      border-radius: 2rem;
    }
    .host-found.visible { opacity: 1; transform: translateY(0); }

    /* Scanline overlay */
    .scanlines {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.15) 2px,
        rgba(0,0,0,0.15) 4px
      );
      pointer-events: none;
      z-index: 1;
    }
  `;
  document.head.appendChild(style);

  const steps = [
    { label: 'INITIATING RECON', status: 'DONE' },
    { label: 'MAPPING ATTACK SURFACE', status: 'DONE' },
    { label: 'RESOLVING TARGET HOST', status: 'DONE' },
    { label: 'ANALYSING THREAT MODEL', status: 'DONE' },
    { label: 'ESTABLISHING CHANNEL', status: 'OPEN' },
  ];

  const name = 'Sangamesh Dandin';

  overlay.innerHTML = `
    <div class="scanlines"></div>
    <div class="loader-inner">
      <div class="host-found" id="hostFound">● HOST IDENTIFIED</div>
      <div class="scan-name" id="scanName">
        ${name.split('').map(c =>
    c === ' '
      ? `<span class="scan-name-char space"> </span>`
      : `<span class="scan-name-char">${c}</span>`
  ).join('')}
      </div>
      <div class="scan-progress"><div class="scan-progress-fill" id="progressFill"></div></div>
      <div class="scan-log" id="scanLog">
        ${steps.map((s, i) => `
          <div class="scan-line" id="line${i}">
            <span class="dot"></span>
            <span class="label">${s.label}</span>
            <span class="status">${s.status}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const progressFill = document.getElementById('progressFill');
  const scanName = document.getElementById('scanName');
  const hostFound = document.getElementById('hostFound');
  const nameChars = scanName.querySelectorAll('.scan-name-char');

  // Animate scan lines sequentially
  function animateLines() {
    steps.forEach((_, i) => {
      setTimeout(() => {
        const line = document.getElementById(`line${i}`);
        line.classList.add('active');
        // progress bar
        progressFill.style.width = `${((i + 1) / steps.length) * 100}%`;
        setTimeout(() => line.classList.add('done'), lineDoneDelay);
      }, i * lineDelay);
    });
  }

  // Glitch-reveal name: chars appear one by one with a brief random char first
  function revealName() {
    const glitchChars = '!@#$%^&*<>?/\\|{}[]~';
    nameChars.forEach((el, i) => {
      if (el.classList.contains('space')) {
        setTimeout(() => el.classList.add('shown'), i * charDelay);
        return;
      }
      const finalChar = el.textContent;
      setTimeout(() => {
        // Brief glitch char
        el.textContent = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        el.classList.add('glitch');
        setTimeout(() => {
          el.textContent = finalChar;
          el.classList.remove('glitch');
          el.classList.add('shown');
        }, 45);
      }, i * charDelay);
    });
  }

  // Sequence
  setTimeout(() => animateLines(), initialDelay);
  setTimeout(() => {
    scanName.classList.add('visible');
    revealName();
  }, steps.length * lineDelay + nameDelay);
  setTimeout(() => hostFound.classList.add('visible'), steps.length * lineDelay + hostDelay);

  // Fade out
  window.addEventListener('load', () => {
    const totalDuration = steps.length * lineDelay + fadeBuffer;
    setTimeout(() => {
      overlay.style.transition = `opacity ${fadeDuration}ms ease`;
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), fadeDuration);
    }, Math.max(totalDuration, minDuration));
  });

});
