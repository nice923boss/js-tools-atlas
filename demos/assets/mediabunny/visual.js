// Drawing and audio-synthesis helpers for demos/mediabunny.html (no Mediabunny calls in here).
const css = getComputedStyle(document.documentElement);
const FONT = css.getPropertyValue("--font").trim() || "system-ui, sans-serif";
const MONO = css.getPropertyValue("--mono").trim() || "ui-monospace, monospace";
const COLORS = ["#f7df1e", "#4cc9f0", "#f72585", "#7bd389", "#ff8c42"];
const FPS = 30;

// Test pattern shared by the synthetic sources: sweep dial with the frame number, bouncing balls, grid.
export function pattern(cv, t, label = "") {
  const g = cv.getContext("2d"), s = cv.width / 640;
  g.setTransform(s, 0, 0, s, 0, 0);
  const bg = g.createLinearGradient(0, 0, 640, 360);
  bg.addColorStop(0, "#0f1424");
  bg.addColorStop(1, "#271238");
  g.fillStyle = bg;
  g.fillRect(0, 0, 640, 360);
  g.strokeStyle = "rgba(255, 255, 255, .07)";
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 40; x < 640; x += 40) { g.moveTo(x, 0); g.lineTo(x, 360); }
  for (let y = 40; y < 360; y += 40) { g.moveTo(0, y); g.lineTo(640, y); }
  g.stroke();
  const cx = 150, cy = 195, R = 100, a = -Math.PI / 2 + (t % 1) * Math.PI * 2;
  g.fillStyle = "rgba(76, 201, 240, .14)";
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(247, 223, 30, .45)";
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2, a); g.closePath(); g.fill();
  g.strokeStyle = "#f7df1e"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
  for (let i = 0; i < 4; i++) {
    const p = t * (0.5 + i * 0.22) + i * 0.37, x = 300 + Math.abs((p % 2) - 1) * 300;
    g.fillStyle = COLORS[i + 1];
    g.beginPath(); g.arc(x, 85 + i * 62 + Math.sin(t * 3 + i) * 16, 17, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = "#fff";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 40px ${MONO}`;
  g.fillText(String(Math.round(t * FPS)).padStart(3, "0"), cx, cy);
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.font = `600 16px ${FONT}`; g.fillStyle = "#e8e6df";
  g.fillText(label, 20, 32);
  g.font = `14px ${MONO}`; g.fillStyle = "#9b998f";
  g.fillText(`t = ${t.toFixed(3)} s`, 500, 340);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// Short synthesized arpeggio + bass (stereo, 44.1 kHz), cached per length.
const melodies = new Map();
export function melody(sec) {
  if (!melodies.has(sec)) melodies.set(sec, (async () => {
    const sr = 44100, oac = new OfflineAudioContext(2, sr * sec, sr);
    const master = oac.createGain();
    master.gain.value = 0.45;
    master.connect(oac.destination);
    const notes = [0, 4, 7, 12, 7, 4, 2, 5, 9, 14, 9, 5];
    for (let i = 0; i * 0.25 < sec - 0.05; i++) {
      const t = i * 0.25, o = oac.createOscillator(), env = oac.createGain(), pan = oac.createStereoPanner();
      o.type = "triangle";
      o.frequency.value = 330 * 2 ** (notes[i % notes.length] / 12);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.6, t + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      pan.pan.value = i % 2 ? 0.6 : -0.6;
      o.connect(env).connect(pan).connect(master);
      o.start(t); o.stop(t + 0.25);
    }
    for (let b = 0; b < sec; b++) {
      const o = oac.createOscillator(), env = oac.createGain();
      o.frequency.value = [110, 87.31, 98, 82.41][b % 4];
      env.gain.setValueAtTime(0.55, b);
      env.gain.exponentialRampToValueAtTime(0.001, b + 0.95);
      o.connect(env).connect(master);
      o.start(b); o.stop(b + 1);
    }
    return oac.startRendering();
  })());
  return melodies.get(sec);
}

// ---------- scene 1: the original music visualizer --------------------------------------
const FFT_SIZE = 2048, BANDS = 64;
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}
const hann = Float32Array.from({ length: FFT_SIZE }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
export const smooth = new Float32Array(BANDS);
function analyse(mono, sr, t) {
  const re = new Float32Array(FFT_SIZE), im = new Float32Array(FFT_SIZE);
  const start = Math.max(0, Math.floor(t * sr) - FFT_SIZE / 2);
  let energy = 0;
  for (let i = 0; i < FFT_SIZE; i++) {
    const v = mono[start + i] || 0;
    re[i] = v * hann[i];
    energy += v * v;
  }
  fft(re, im);
  const lo = Math.log(40), hi = Math.log(12000);
  for (let b = 0; b < BANDS; b++) {
    const f0 = Math.exp(lo + ((hi - lo) * b) / BANDS), f1 = Math.exp(lo + ((hi - lo) * (b + 1)) / BANDS);
    const i0 = Math.max(1, Math.floor((f0 / sr) * FFT_SIZE)), i1 = Math.max(i0 + 1, Math.ceil((f1 / sr) * FFT_SIZE));
    let m = 0;
    for (let i = i0; i < i1; i++) m = Math.max(m, Math.hypot(re[i], im[i]));
    const db = 20 * Math.log10((m * 4) / FFT_SIZE + 1e-9);
    smooth[b] = Math.max(Math.min(1, Math.max(0, (db + 62) / 56)), smooth[b] * 0.86);
  }
  return { bands: smooth, energy: Math.sqrt(energy / FFT_SIZE), start };
}
export function visualize(cv, t, dur, mono, sr) {
  const g = cv.getContext("2d"), W = cv.width, H = cv.height, k = H / 360;
  const { bands, energy, start } = analyse(mono, sr, t);
  const pulse = Math.min(1, energy * 3.2), hue = 220 + Math.sin(t * 0.6) * 40;
  const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, `hsl(${hue} 60% ${12 + pulse * 10}%)`);
  bg.addColorStop(1, "#050508");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.46, R = H * (0.2 + pulse * 0.04);
  g.lineCap = "round";
  g.lineWidth = Math.max(2, 4 * k);
  for (let s = -1; s <= 1; s += 2) {
    for (let b = 0; b < BANDS; b++) {
      const a = -Math.PI / 2 + s * (b + 0.5) * (Math.PI / BANDS), len = 4 * k + bands[b] * H * 0.2;
      g.strokeStyle = `hsl(${(hue + 120 + b * 2.6) % 360} 90% ${55 + bands[b] * 20}%)`;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
      g.stroke();
    }
  }
  g.fillStyle = "rgba(5, 5, 10, 0.85)";
  g.beginPath(); g.arc(cx, cy, R - 6 * k, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f7df1e";
  g.font = `800 ${20 * k}px ${FONT}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("Mediabunny", cx, cy - 8 * k);
  g.fillStyle = "#cfd2d8";
  g.font = `${12 * k}px ${MONO}`;
  g.fillText(`${t.toFixed(1)} / ${dur.toFixed(1)} s`, cx, cy + 14 * k);
  const baseY = H * 0.88;
  g.strokeStyle = "rgba(76, 201, 240, 0.85)";
  g.lineWidth = 1.5 * k;
  g.beginPath();
  for (let x = 0; x <= W; x += 2) {
    const y = baseY + (mono[start + Math.floor((x / W) * FFT_SIZE)] || 0) * H * 0.12;
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.fillStyle = "rgba(255, 255, 255, 0.12)";
  g.fillRect(0, H - 4 * k, W, 4 * k);
  g.fillStyle = "#f7df1e";
  g.fillRect(0, H - 4 * k, (W * t) / dur, 4 * k);
  g.textAlign = "left"; g.textBaseline = "alphabetic";
}
export function sliceBuffer(buf, from, to) {
  const sr = buf.sampleRate, a = Math.floor(from * sr), b = Math.min(buf.length, Math.floor(to * sr));
  const out = new AudioBuffer({ length: Math.max(1, b - a), numberOfChannels: buf.numberOfChannels, sampleRate: sr });
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(a, b), c);
  return out;
}
export function cutWithFade(buf, dur) {
  const out = sliceBuffer(buf, 0, dur);
  if (dur < buf.duration - 0.05) {
    const n = Math.floor(0.6 * out.sampleRate);
    for (let c = 0; c < out.numberOfChannels; c++) {
      const d = out.getChannelData(c);
      for (let i = 0; i < n; i++) d[d.length - 1 - i] *= i / n;
    }
  }
  return out;
}

// ---------- scene 5 helper: min/max waveform ----------------------------------------------
export function drawWave(cv, chans, color) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(50, cv.clientWidth * dpr), H = Math.max(30, cv.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext("2d");
  g.fillStyle = "#0d0f14";
  g.fillRect(0, 0, W, H);
  chans.forEach(({ data, col }) => {
    const step = data.length / W;
    g.fillStyle = col || color;
    for (let x = 0; x < W; x++) {
      let lo = 1, hi = -1;
      for (let i = Math.floor(x * step), e = Math.floor((x + 1) * step); i < e; i++) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi >= lo) g.fillRect(x, H / 2 - hi * H * 0.45, 1, Math.max(1, (hi - lo) * H * 0.45));
    }
  });
}
