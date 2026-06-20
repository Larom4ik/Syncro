export interface Particle {
  x: number;
  y: number;
  ox: number; // origin x (home position)
  oy: number; // origin y
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  hue: number; // 200–280 cool blue-purple range
}

export interface ParticleConfig {
  repelRadius: number;
  repelStrength: number;
  friction: number;
  returnSpeed: number;
  baseAlpha: number;
}

export const defaultConfig: ParticleConfig = {
  repelRadius: 120,
  repelStrength: 6,
  friction: 0.82,
  returnSpeed: 0.045,
  baseAlpha: 0.22,
};

export function buildGrid(
  w: number,
  h: number,
  spacing: number
): Particle[] {
  const particles: Particle[] = [];
  const cols = Math.floor(w / spacing);
  const rows = Math.floor(h / spacing);
  const padX = (w - cols * spacing) / 2;
  const padY = (h - rows * spacing) / 2;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const ox = padX + c * spacing + spacing / 2;
      const oy = padY + r * spacing + spacing / 2;
      // scatter on init
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 200;
      particles.push({
        x: ox + Math.cos(angle) * dist,
        y: oy + Math.sin(angle) * dist,
        ox,
        oy,
        vx: 0,
        vy: 0,
        size: 0.8 + Math.random() * 1.2,
        alpha: 0,
        targetAlpha: defaultConfig.baseAlpha + Math.random() * 0.08,
        hue: 200 + Math.floor(Math.random() * 80), // 200–280
      });
    }
  }
  return particles;
}

export function tickParticles(
  particles: Particle[],
  mx: number,
  my: number,
  cfg: ParticleConfig,
  elapsed: number // seconds since start, for fade-in
): void {
  const fadeInDone = elapsed > 1.2;

  for (const p of particles) {
    // fade in during first 1.2s
    const targetA = fadeInDone ? p.targetAlpha : p.targetAlpha * Math.min(1, elapsed / 1.2);
    p.alpha += (targetA - p.alpha) * 0.04;

    // repel from cursor
    const dx = p.ox - mx;
    const dy = p.oy - my;
    const d2 = dx * dx + dy * dy;
    const r2 = cfg.repelRadius * cfg.repelRadius;

    if (d2 < r2) {
      const d = Math.sqrt(d2);
      const t = 1 - d / cfg.repelRadius;
      const ease = t * t;
      // push away
      const nx = dx / d;
      const ny = dy / d;
      p.vx -= nx * ease * cfg.repelStrength;
      p.vy -= ny * ease * cfg.repelStrength;
      p.alpha = Math.min(1, p.alpha + ease * 0.5);
    }

    // spring back to origin
    p.vx += (p.ox - p.x) * cfg.returnSpeed;
    p.vy += (p.oy - p.y) * cfg.returnSpeed;

    // friction
    p.vx *= cfg.friction;
    p.vy *= cfg.friction;

    p.x += p.vx;
    p.y += p.vy;
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  for (const p of particles) {
    if (p.alpha < 0.005) continue;
    const l = 60 + (p.hue - 200) / 80 * 20; // lightness 60–80
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue},70%,${l}%,${p.alpha})`;
    ctx.fill();
  }
}