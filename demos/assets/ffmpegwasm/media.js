// Page-side media helpers for demos/ffmpegwasm.html: the test pattern, a MediaRecorder capture of it,
// WebAudio synthesis rendered to a WAV file and waveform drawing. No FFmpeg calls in here.
const css = getComputedStyle(document.documentElement);
const MONO = css.getPropertyValue("--mono").trim() || "ui-monospace, monospace";
const BARS = ["#f7df1e", "#4cc9f0", "#f72585", "#7bd389", "#ff8c42", "#9b5de5", "#e8e6df"];

// Animated test card: moving ball, spinning bar and a big timestamp, so crops, flips and seeks are obvious.
export function pattern(g, w, h, t) {
  const hue = (t * 70) % 360;
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${hue} 55% 20%)`);
  bg.addColorStop(1, `hsl(${(hue + 140) % 360} 60% 9%)`);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255, 255, 255, 0.09)";
  g.lineWidth = 1;
  for (let i = 1; i < 16; i++) {
    g.beginPath(); g.moveTo((i * w) / 16, 0); g.lineTo((i * w) / 16, h * 0.86); g.stroke();
  }
  BARS.forEach((c, i) => { g.fillStyle = c; g.fillRect((i * w) / BARS.length, h * 0.86, w / BARS.length + 1, h * 0.14); });
  const bx = w * (0.08 + 0.84 * Math.abs(((t * 0.5) % 2) - 1));
  const by = h * (0.3 + 0.38 * Math.abs(Math.sin(t * 3.2)));
  g.fillStyle = "#f7df1e";
  g.beginPath(); g.arc(bx, by, h * 0.075, 0, Math.PI * 2); g.fill();
  g.save();
  g.translate(w * 0.8, h * 0.42);
  g.rotate(t * 2.2);
  g.fillStyle = "#f72585";
  g.fillRect(-h * 0.17, -h * 0.03, h * 0.34, h * 0.06);
  g.restore();
  g.fillStyle = "#4cc9f0";
  g.fillRect(0, 0, h * 0.09, h * 0.09);
  g.fillStyle = "#fff";
  g.font = `700 ${Math.round(h * 0.17)}px ${MONO}`;
  g.textBaseline = "alphabetic";
  g.fillText(`${t.toFixed(2)}s`, w * 0.06, h * 0.3);
  g.font = `600 ${Math.round(h * 0.06)}px ${MONO}`;
  g.fillText(`frame ${Math.floor(t * 30)}`, w * 0.06, h * 0.78);
}

// Record the test pattern in real time with the browser's own MediaRecorder (shared by every scene).
const REC_SEC = 3;
let recJob = null;
let recDone = 0;
export const recProgress = () => recDone;
export function recording() {
  if (recJob) return recJob;
  recJob = new Promise((resolve, reject) => {
    const mime = ["video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    if (!mime) { reject(new Error("此瀏覽器不支援 MediaRecorder 錄影")); return; }
    const cv = document.createElement("canvas");
    cv.width = 640; cv.height = 360;
    const g = cv.getContext("2d");
    pattern(g, 640, 360, 0);
    const rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 2e6 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onerror = (e) => reject(e.error || new Error("MediaRecorder 失敗"));
    rec.onstop = () => {
      const type = rec.mimeType.split(";")[0] || "video/webm";
      resolve({ blob: new Blob(chunks, { type }), ext: type.includes("mp4") ? "mp4" : "webm", mime: rec.mimeType });
    };
    rec.start(250);
    const t0 = performance.now();
    (function loop() {
      const t = (performance.now() - t0) / 1000;
      recDone = Math.min(1, t / REC_SEC);
      pattern(g, 640, 360, Math.min(t, REC_SEC));
      if (t < REC_SEC) setTimeout(loop, 1000 / 60);
      else rec.stop();
    })();
  });
  recJob.catch(() => { recJob = null; recDone = 0; });
  return recJob;
}

// A short stereo arpeggio over a bass drone, rendered offline (no audio device needed).
export async function melody(sec = 3, sr = 44100) {
  const ac = new OfflineAudioContext(2, Math.round(sr * sec), sr);
  const master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
  const notes = [0, 4, 7, 12, 7, 4, 2, 5, 9, 14, 9, 5];
  const step = 0.25;
  for (let i = 0; i * step < sec; i++) {
    const t = i * step;
    const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner();
    o.type = "triangle";
    o.frequency.value = 330 * 2 ** (notes[i % notes.length] / 12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.7, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + step * 0.95);
    p.pan.value = i % 2 ? 0.6 : -0.6;
    o.connect(g).connect(p).connect(master);
    o.start(t);
    o.stop(t + step);
  }
  const bass = ac.createOscillator(), bg = ac.createGain();
  bass.frequency.value = 82.41;
  bg.gain.value = 0.22;
  bass.connect(bg).connect(master);
  bass.start();
  return ac.startRendering();
}

// 16-bit PCM WAV file from an AudioBuffer.
export function wav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, bytes = n * ch * 2;
  const v = new DataView(new ArrayBuffer(44 + bytes));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + bytes, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, bytes, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < n; i++) {
    for (let c = 0; c < ch; c++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 0x7fff, true);
  }
  return new Uint8Array(v.buffer);
}

// Min/max waveform of one channel, sized to the canvas's CSS box.
export function drawWave(cv, data, label) {
  const r = cv.getBoundingClientRect();
  const W = (cv.width = Math.max(200, Math.round(r.width * devicePixelRatio)));
  const H = (cv.height = Math.max(60, Math.round(r.height * devicePixelRatio)));
  const g = cv.getContext("2d");
  const step = data.length / W, mid = H / 2;
  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#f7df1e");
  grad.addColorStop(1, "#4cc9f0");
  g.fillStyle = grad;
  for (let x = 0; x < W; x++) {
    let lo = 1, hi = -1;
    for (let i = Math.floor(x * step), e = Math.floor((x + 1) * step); i < e; i++) {
      const s = data[i];
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
    if (hi < lo) continue;
    g.fillRect(x, mid - hi * mid * 0.9, 1, Math.max(1, (hi - lo) * mid * 0.9));
  }
  if (label) {
    g.fillStyle = "rgba(255, 255, 255, 0.6)";
    g.font = `${11 * devicePixelRatio}px ${MONO}`;
    g.fillText(label, W - g.measureText(label).width - 8 * devicePixelRatio, H - 8 * devicePixelRatio);
  }
}
