// Multi-scene showcase shell for demo pages.
//
//   Showcase.run({ scenes: [
//     { id: "basic", title: "基本用法", api: "new Chart(el, cfg)", desc: "一句話說明", hint: "操作提示",
//       paper: false, kind: undefined | "stress",
//       mount(ctx) { ...; ctx.onCleanup(() => chart.destroy()); } },
//   ]});
//
// Each scene gets a fresh element (ctx.el) and an AbortSignal; everything registered through ctx
// (listeners, rAF loops, timers, ResizeObservers, cleanups) is torn down when the viewer switches scene.
// The page's <script id="demo-meta"> must list the scene titles in order: {"mode":"auto","scenes":["基本用法", ...]}.
(function () {
  "use strict";

  const NF = new Intl.NumberFormat("zh-TW");
  const fmt = (n, digits = 0) =>
    typeof n === "number" && isFinite(n) ? NF.format(Number(n.toFixed(digits))) : String(n);
  // Compact Chinese units: 12,000 -> "1.2 萬", 340,000,000 -> "3.4 億"
  const fmtCompact = (n) => {
    if (!isFinite(n)) return String(n);
    const a = Math.abs(n);
    if (a >= 1e8) return `${+(n / 1e8).toFixed(a >= 1e9 ? 0 : 1)} 億`;
    if (a >= 1e4) return `${+(n / 1e4).toFixed(a >= 1e5 ? 0 : 1)} 萬`;
    return fmt(n, a < 10 && n % 1 ? 1 : 0);
  };
  const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 2)} 秒` : `${ms.toFixed(ms < 10 ? 2 : ms < 100 ? 1 : 0)} ms`);

  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
  };
  const abortError = () => new DOMException("Scene unmounted", "AbortError");
  const isAbort = (e) => e && (e.name === "AbortError" || e === "scene-unmounted");

  // ---------- script / css loader (cached across scenes) ----------
  const loaded = new Map();
  function loadScript(src) {
    if (Array.isArray(src)) return src.reduce((p, s) => p.then(() => loadScript(s)), Promise.resolve());
    if (!loaded.has(src)) {
      loaded.set(src, new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => { loaded.delete(src); reject(new Error(`無法載入 ${src}`)); };
        document.head.append(s);
      }));
    }
    return loaded.get(src);
  }
  function loadCSS(href) {
    if (!loaded.has(href)) {
      loaded.set(href, new Promise((resolve, reject) => {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = href;
        l.onload = () => resolve();
        l.onerror = () => { loaded.delete(href); reject(new Error(`無法載入 ${href}`)); };
        document.head.append(l);
      }));
    }
    return loaded.get(href);
  }

  // ---------- device summary for the stress panels ----------
  let deviceInfo;
  function device() {
    if (deviceInfo) return deviceInfo;
    let gpu = "";
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (gl) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        gpu = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "";
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch { /* WebGL unavailable: leave gpu empty */ }
    const software = /swiftshader|llvmpipe|software|basic render/i.test(gpu);
    deviceInfo = {
      cores: navigator.hardwareConcurrency || 0,
      dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
      gpu: gpu.replace(/^ANGLE \((.*)\)$/, "$1").replace(/\s*\(0x[0-9a-f]+\)/gi, "").slice(0, 90),
      software,
      memory: navigator.deviceMemory || 0,
    };
    return deviceInfo;
  }
  function deviceLine() {
    const d = device();
    const parts = [];
    if (d.cores) parts.push(`${d.cores} 執行緒`);
    if (d.memory) parts.push(`記憶體約 ${d.memory} GB`);
    parts.push(`DPR ${d.dpr}`);
    if (d.gpu) parts.push(`GPU：${d.gpu}`);
    let s = `此裝置：${parts.join("・")}`;
    if (d.software) s += "（軟體繪圖，GPU 類數字會明顯偏低）";
    return s;
  }
  const heapMB = () => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null);

  // ---------- frame-rate sampler shared by fps() and ramp() ----------
  function frameSampler(ctx) {
    const times = [];
    let last = 0;
    ctx.raf((t) => {
      if (last) times.push(t - last);
      last = t;
      if (times.length > 240) times.splice(0, times.length - 240);
    });
    return {
      // Average FPS / frame time over the last `ms` milliseconds of frames
      read(ms = 500) {
        let sum = 0, n = 0;
        for (let i = times.length - 1; i >= 0 && sum < ms; i--) { sum += times[i]; n++; }
        return n ? { fps: (1000 * n) / sum, ms: sum / n } : { fps: 0, ms: 0 };
      },
      reset() { times.length = 0; last = 0; },
      get count() { return times.length; },
    };
  }
  const fpsClass = (fps, min = 30) => (fps >= Math.max(50, min) ? "good" : fps >= min ? "warn" : "bad");

  // ---------- scene context ----------
  function makeContext(shell, scene, el) {
    const ac = new AbortController();
    const cleanups = [];
    let active = true;
    let controlsEl;
    const ctx = {
      el,
      scene,
      signal: ac.signal,
      get active() { return active; },
      $: (sel) => el.querySelector(sel),
      $$: (sel) => [...el.querySelectorAll(sel)],
      html(str) { el.innerHTML = str; return el; },
      onCleanup(fn) { if (active) cleanups.push(fn); else fn(); return fn; },
      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        cleanups.push(() => target.removeEventListener(type, fn, opts));
      },
      raf(fn) {
        let id = 0, prev = 0, stopped = false;
        const loop = (t) => {
          if (stopped || !active) return;
          const dt = prev ? Math.min(t - prev, 100) : 16.7;
          prev = t;
          fn(t, dt);
          id = requestAnimationFrame(loop);
        };
        id = requestAnimationFrame(loop);
        const stop = () => { stopped = true; cancelAnimationFrame(id); };
        cleanups.push(stop);
        return stop;
      },
      timeout(fn, ms) { const id = setTimeout(() => active && fn(), ms); cleanups.push(() => clearTimeout(id)); return id; },
      interval(fn, ms) { const id = setInterval(() => active && fn(), ms); cleanups.push(() => clearInterval(id)); return id; },
      sleep(ms) {
        return new Promise((resolve, reject) => {
          if (!active) return reject(abortError());
          const id = setTimeout(resolve, ms);
          ac.signal.addEventListener("abort", () => { clearTimeout(id); reject(abortError()); }, { once: true });
        });
      },
      // Wait for the next animation frame(s); lets the browser paint between heavy steps.
      frame(n = 1) { return n <= 0 ? Promise.resolve() : new Promise((r) => requestAnimationFrame(() => r(ctx.frame(n - 1)))); },
      size() { return { width: el.clientWidth, height: el.clientHeight }; },
      onResize(fn) {
        let pending = 0, lw = el.clientWidth, lh = el.clientHeight;
        const ro = new ResizeObserver(() => {
          cancelAnimationFrame(pending);
          pending = requestAnimationFrame(() => {
            if (!active) return;
            const w = el.clientWidth, hh = el.clientHeight;
            if (w === lw && hh === lh) return;
            lw = w; lh = hh;
            fn({ width: w, height: hh });
          });
        });
        ro.observe(el);
        cleanups.push(() => { ro.disconnect(); cancelAnimationFrame(pending); });
      },
      hint(text) { shell.setHint(text); },
      load: loadScript,
      css: loadCSS,

      // ----- controls -----
      // Lazily created control cluster. Its height is published on the scene element as
      // --sc-ctl-h (top cluster) or --sc-ctl-b (.bottom cluster) so layouts can pad around it.
      get controls() {
        if (!controlsEl) {
          controlsEl = h("div", { class: "controls" });
          el.append(controlsEl);
          const ro = new ResizeObserver(() => {
            const used = controlsEl.offsetHeight ? controlsEl.offsetHeight + 10 : 0;
            const bottom = controlsEl.classList.contains("bottom");
            el.style.setProperty("--sc-ctl-h", `${bottom ? 0 : used}px`);
            el.style.setProperty("--sc-ctl-b", `${bottom ? used : 0}px`);
          });
          ro.observe(controlsEl);
          cleanups.push(() => ro.disconnect());
        }
        return controlsEl;
      },
      button(label, onClick, { primary = false, title } = {}) {
        const b = h("button", { class: `btn${primary ? " primary" : ""}`, type: "button", title }, label);
        b.addEventListener("click", onClick);
        ctx.controls.append(b);
        return b;
      },
      toggle(label, value, onChange) {
        const b = h("button", { class: "btn", type: "button", "aria-pressed": String(!!value) }, label);
        b.addEventListener("click", () => {
          const v = b.getAttribute("aria-pressed") !== "true";
          b.setAttribute("aria-pressed", String(v));
          onChange(v);
        });
        ctx.controls.append(b);
        return b;
      },
      group(labels, index, onChange) {
        const wrap = h("div", { class: "sc-seg", role: "group" });
        const btns = labels.map((l, i) => {
          const b = h("button", { class: "btn", type: "button", "aria-pressed": String(i === index) }, l);
          b.addEventListener("click", () => {
            btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            onChange(i, l);
          });
          return b;
        });
        wrap.append(...btns);
        ctx.controls.append(wrap);
        return wrap;
      },
      slider(label, { min = 0, max = 100, step = 1, value = min, format } = {}, onInput) {
        const out = h("output");
        const input = h("input", { type: "range", min, max, step, value });
        const show = () => (out.textContent = format ? format(+input.value) : fmt(+input.value, step < 1 ? 2 : 0));
        input.addEventListener("input", () => { show(); onInput(+input.value); });
        show();
        const wrap = h("label", { class: "sc-field" }, label, input, out);
        ctx.controls.append(wrap);
        return input;
      },
      select(label, options, value, onChange) {
        const sel = h("select");
        for (const o of options) {
          const opt = typeof o === "object" ? o : { value: o, label: o };
          sel.append(h("option", { value: opt.value }, opt.label));
        }
        if (value != null) sel.value = value;
        sel.addEventListener("change", () => onChange(sel.value));
        ctx.controls.append(label ? h("label", { class: "sc-field" }, label, sel) : h("label", { class: "sc-field" }, sel));
        return sel;
      },

      // ----- overlays -----
      status(text) {
        const label = h("div", { text });
        const fill = h("i");
        const bar = h("div", { class: "bar" }, fill);
        const box = h("div", { class: "status" }, label, bar);
        el.append(box);
        return {
          text(t) { label.textContent = t; },
          progress(p) { fill.style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`; },
          error(t) { label.textContent = t; box.style.borderColor = "#e5484d"; bar.remove(); },
          done() { box.remove(); },
        };
      },
      gate({ icon = "▶", title = "啟動示範", desc = "", tags = [], button = "開始" } = {}) {
        return new Promise((resolve, reject) => {
          if (!active) return reject(abortError());
          const btn = h("button", { class: "btn primary", type: "button", "data-demo-start": "" }, button);
          const card = h("div", { class: "card" },
            h("div", { class: "icon", text: icon }), h("h2", { text: title }),
            desc ? h("p", { text: desc }) : null,
            tags.length ? h("div", { class: "tags" }, tags.map((t) => h("span", { class: "tag", text: t }))) : null,
            btn);
          const gate = h("div", { class: "sc-gate" }, card);
          el.append(gate);
          btn.addEventListener("click", () => { gate.remove(); resolve(); }, { once: true });
          ac.signal.addEventListener("abort", () => reject(abortError()), { once: true });
        });
      },
      fps({ position = "", extra } = {}) {
        const box = h("div", { class: `sc-fps ${position}` });
        el.append(box);
        const s = frameSampler(ctx);
        const extras = {};
        const paint = () => {
          const { fps, ms } = s.read(500);
          const more = Object.entries({ ...extras, ...(extra ? extra() : {}) })
            .map(([k, v]) => `　${k} ${typeof v === "number" ? fmt(v) : v}`).join("");
          box.innerHTML = `FPS <b class="${fpsClass(fps) === "good" ? "" : fpsClass(fps) === "warn" ? "warn" : "bad"}">${fps ? fps.toFixed(0) : "…"}</b>　${ms ? ms.toFixed(1) : "…"} ms${more}`;
        };
        ctx.interval(paint, 500);
        paint();
        return { set(k, v) { extras[k] = v; }, read: (ms) => s.read(ms), el: box };
      },
      ramp: (opts) => ramp(ctx, opts),
      bench: (opts) => bench(ctx, opts),
    };
    return {
      ctx,
      destroy() {
        active = false;
        ac.abort();
        for (let i = cleanups.length - 1; i >= 0; i--) {
          try { cleanups[i](); } catch (e) { console.error("[showcase] cleanup failed:", e); }
        }
        cleanups.length = 0;
      },
    };
  }

  // ---------- lab panel shared by ramp() and bench() ----------
  function labPanel(ctx, title, { position = "", wide = false } = {}) {
    const minBtn = h("button", { class: "x", type: "button", title: "收合／展開", "aria-label": "收合／展開" }, "－");
    const body = h("div", { class: "body" });
    // One-line progress / verdict, only visible while the panel is collapsed.
    const st = h("small", { class: "st", "aria-live": "polite" });
    const panel = h("div", { class: `sc-lab ${position} ${wide ? "wide" : ""}` }, h("header", {}, h("b", { text: title }), minBtn, st), body);
    const setMin = (v) => {
      panel.classList.toggle("min", v);
      minBtn.textContent = v ? "＋" : "－";
    };
    minBtn.addEventListener("click", () => setMin(!panel.classList.contains("min")));
    ctx.el.append(panel);
    return {
      panel, body,
      status(text) { st.textContent = text; },
      // On small stages the expanded panel hides the scene; fold it while a run is in progress.
      autoCollapse() { if (ctx.el.clientWidth < 640 || ctx.el.clientHeight < 440) setMin(true); },
    };
  }

  // FPS ramp: raise the load step by step until the frame rate drops below minFps.
  function ramp(ctx, {
    label = "數量", unit = "", steps, apply, minFps = 30, warmup = 700, sample = 1500,
    initial = 0, metrics, title, note, position = "", format = fmtCompact,
  }) {
    if (!steps || !steps.length || typeof apply !== "function") throw new Error("ramp() needs steps[] and apply(n)");
    const sampler = frameSampler(ctx);
    const lab = labPanel(ctx, title || `極限測試：${label}`, { position });
    const { body } = lab;
    const runBtn = h("button", { class: "btn primary", type: "button", "data-sc-run": "" }, "自動加壓");
    const stopBtn = h("button", { class: "btn", type: "button", disabled: true }, "停止");
    const range = h("input", { type: "range", min: 0, max: steps.length - 1, step: 1, value: initial, "aria-label": `手動調整${label}` });
    const rangeOut = h("output");
    const cells = {};
    const cell = (k, name) => (cells[k] = h("span", { text: "…" }), h("div", {}, h("small", { text: name }), cells[k]));
    const live = h("div", { class: "live" }, cell("n", label), cell("fps", "FPS"), cell("ms", "每格耗時"));
    const extraLive = h("div", { class: "live" });
    const stepsEl = h("div", { class: "steps" });
    const verdict = h("div", { class: "verdict" });
    body.append(
      h("div", { class: "row" }, runBtn, stopBtn),
      h("div", { class: "manual" }, h("span", { class: "muted", text: "手動" }), range, rangeOut),
      live, extraLive, stepsEl, verdict,
      note ? h("div", { class: "note", text: note }) : null,
      h("div", { class: "dev", text: deviceLine() }),
    );

    let current = steps[initial];
    let running = false;
    let busy = Promise.resolve();
    const setN = (i) => {
      current = steps[i];
      range.value = i;
      rangeOut.textContent = `${format(current)}${unit ? " " + unit : ""}`;
      cells.n.textContent = format(current);
      busy = busy.then(() => ctx.active && apply(current)).catch((e) => { if (!isAbort(e)) { console.error(e); verdict.innerHTML = `<b>錯誤</b>：${e.message}`; } });
      return busy;
    };
    const rows = steps.map((n) => {
      const bar = h("i");
      const v = h("span", { class: "v", text: "未測" });
      const row = h("div", { class: "step skip" }, h("span", { class: "n", text: `${format(n)}${unit ? " " + unit : ""}` }), h("div", { class: "bar" }, bar), v);
      stepsEl.append(row);
      return { row, bar, v };
    });
    const extraCells = {};
    const paintLive = () => {
      const { fps, ms } = sampler.read(500);
      cells.fps.textContent = fps ? fps.toFixed(0) : "…";
      cells.fps.className = fps ? fpsClass(fps, minFps) : "";
      cells.ms.textContent = ms ? `${ms.toFixed(1)} ms` : "…";
      const m = { ...(metrics ? metrics() : {}) };
      const heap = heapMB();
      if (heap != null) m["JS 記憶體"] = `${heap.toFixed(0)} MB`;
      for (const [k, val] of Object.entries(m)) {
        if (!extraCells[k]) { extraCells[k] = h("span"); extraLive.append(h("div", {}, h("small", { text: k }), extraCells[k])); }
        extraCells[k].textContent = typeof val === "number" ? format(val) : val;
      }
    };
    ctx.interval(paintLive, 400);

    range.addEventListener("input", () => { if (!running) setN(+range.value); });

    async function run() {
      running = true;
      runBtn.disabled = true; stopBtn.disabled = false; range.disabled = true;
      verdict.textContent = "";
      rows.forEach((r) => { r.row.className = "step skip"; r.v.textContent = "未測"; r.bar.style.width = "0"; });
      lab.autoCollapse();
      let best = null, failedAt = null;
      try {
        for (let i = 0; i < steps.length && running; i++) {
          const r = rows[i];
          r.row.className = "step run"; r.v.textContent = "量測中…";
          lab.status(`量測中 ${i + 1}/${steps.length}：${format(steps[i])}${unit ? " " + unit : ""}`);
          await setN(i);
          await ctx.sleep(warmup);
          sampler.reset();
          const t0 = performance.now();
          await ctx.sleep(sample);
          if (document.hidden) throw new Error("分頁被切到背景，量測中止");
          const elapsed = performance.now() - t0;
          const frames = sampler.count;
          // A stalled main thread delivers almost no frames; count the whole window then.
          const fps = frames ? Math.min(frames / (elapsed / 1000), 240) : 0;
          const ms = frames ? sampler.read(sample + 1000).ms : elapsed;
          const cls = fpsClass(fps, minFps);
          r.row.className = `step ${cls}`;
          r.bar.style.width = `${Math.min(100, (fps / 60) * 100)}%`;
          r.v.textContent = `${fps.toFixed(0)} FPS・${ms.toFixed(1)}ms`;
          if (fps >= minFps) best = steps[i]; else { failedAt = steps[i]; break; }
        }
        const u = unit ? ` ${unit}` : "";
        if (!running && !failedAt) verdict.innerHTML = best != null ? `已停止。目前通過 <b>${format(best)}${u}</b>（≥ ${minFps} FPS）。` : "已停止。";
        else if (failedAt == null) verdict.innerHTML = `所有階段都維持 ≥ ${minFps} FPS，此裝置上限高於 <b>${format(steps[steps.length - 1])}${u}</b>。`;
        else if (best == null) verdict.innerHTML = `第一階段 <b>${format(failedAt)}${u}</b> 就低於 ${minFps} FPS。`;
        else verdict.innerHTML = `維持 ${minFps} FPS 的上限約 <b>${format(best)}${u}</b>，到 ${format(failedAt)}${u} 掉到 ${minFps} FPS 以下。`;
        // Fall back to the last smooth level so the page stays responsive.
        if (failedAt != null) await setN(Math.max(0, steps.indexOf(best ?? steps[0])));
      } catch (e) {
        if (isAbort(e)) return;
        console.error(e);
        verdict.innerHTML = `<b>中止</b>：${e.message}`;
      } finally {
        running = false;
        lab.status(verdict.textContent);
        if (ctx.active) { runBtn.disabled = false; stopBtn.disabled = true; range.disabled = false; }
      }
    }
    runBtn.addEventListener("click", run);
    stopBtn.addEventListener("click", () => { running = false; stopBtn.disabled = true; });
    setN(initial);
    paintLive();
    return { run, set: (n) => setN(Math.max(0, steps.indexOf(n))), get value() { return current; }, panel: body };
  }

  // Throughput benchmark: time run(n) for growing n until one run exceeds the budget.
  function bench(ctx, {
    label = "資料量", unit = "", sizes, prepare, run, budget = 2000, target = 1000,
    title, note, position = "", format = fmtCompact, auto = false, columns,
  }) {
    if (!sizes || !sizes.length || typeof run !== "function") throw new Error("bench() needs sizes[] and run(n)");
    const lab = labPanel(ctx, title || `極限測試：${label}`, { position, wide: !!columns });
    const { body } = lab;
    const runBtn = h("button", { class: "btn primary", type: "button", "data-sc-run": "" }, "開始測試");
    const stopBtn = h("button", { class: "btn", type: "button", disabled: true }, "停止");
    const stepsEl = h("div", { class: "steps" });
    const verdict = h("div", { class: "verdict" });
    body.append(
      h("div", { class: "row" }, runBtn, stopBtn),
      stepsEl, verdict,
      note ? h("div", { class: "note", text: note }) : null,
      h("div", { class: "dev", text: deviceLine() }),
    );
    const u = unit ? ` ${unit}` : "";
    const rows = sizes.map((n) => {
      const bar = h("i");
      const v = h("span", { class: "v", text: "未測" });
      const row = h("div", { class: "step skip", title: "" }, h("span", { class: "n", text: `${format(n)}${u}` }), h("div", { class: "bar" }, bar), v);
      stepsEl.append(row);
      return { row, bar, v };
    });
    let running = false;
    const results = [];
    async function go() {
      running = true;
      runBtn.disabled = true; stopBtn.disabled = false;
      verdict.textContent = "";
      results.length = 0;
      rows.forEach((r) => { r.row.className = "step skip"; r.v.textContent = "未測"; r.bar.style.width = "0"; r.row.title = ""; });
      lab.autoCollapse();
      try {
        for (let i = 0; i < sizes.length; i++) {
          const r = rows[i];
          if (!running) break;
          const n = sizes[i];
          r.row.className = "step run"; r.v.textContent = "準備中…";
          lab.status(`執行中 ${i + 1}/${sizes.length}：${format(n)}${u}`);
          await ctx.frame(2);
          const data = prepare ? await prepare(n) : undefined;
          if (!ctx.active) return;
          r.v.textContent = "執行中…";
          await ctx.frame(2);
          const heap0 = heapMB();
          const t0 = performance.now();
          const detail = await run(n, data);
          const ms = performance.now() - t0;
          if (!ctx.active) return;
          const heap1 = heapMB();
          results.push({ n, ms, detail });
          const cls = ms <= target ? "good" : ms <= budget ? "warn" : "bad";
          r.row.className = `step ${cls}`;
          // Log-scale bar: 1 ms -> ~0%, budget -> 100%
          r.bar.style.width = `${Math.max(4, Math.min(100, (Math.log10(Math.max(ms, 1)) / Math.log10(Math.max(budget, 10))) * 100))}%`;
          const rate = ms > 0 ? n / (ms / 1000) : Infinity;
          r.v.textContent = fmtMs(ms);
          r.row.title = [
            `每秒約 ${fmtCompact(rate)}${u}`,
            heap0 != null && heap1 != null ? `記憶體變化 ${(heap1 - heap0).toFixed(1)} MB` : "",
            detail ? String(detail) : "",
          ].filter(Boolean).join("\n");
          if (detail) r.v.textContent += `・${detail}`;
          if (ms > budget) {
            rows.slice(i + 1).forEach((x) => (x.v.textContent = "略過"));
            break;
          }
        }
        const ok = results.filter((x) => x.ms <= target);
        const last = results[results.length - 1];
        if (!results.length) verdict.textContent = "已停止。";
        else if (ok.length === results.length && results.length === sizes.length) {
          verdict.innerHTML = `最大測試量 <b>${format(last.n)}${u}</b> 只花 ${fmtMs(last.ms)}，換算每秒約 <b>${fmtCompact(last.n / (last.ms / 1000))}${u}</b>。`;
        } else if (ok.length) {
          const b = ok[ok.length - 1];
          verdict.innerHTML = `${fmtMs(target)} 內可完成的最大級距：<b>${format(b.n)}${u}</b>（${fmtMs(b.ms)}）。${last.ms > budget ? `到 ${format(last.n)}${u} 需要 ${fmtMs(last.ms)}，更大的級距已略過。` : ""}`;
        } else {
          verdict.innerHTML = `最小級距 <b>${format(results[0].n)}${u}</b> 就需要 ${fmtMs(results[0].ms)}。`;
        }
      } catch (e) {
        if (isAbort(e)) return;
        console.error(e);
        verdict.innerHTML = `<b>中止</b>：${e.message}`;
      } finally {
        running = false;
        lab.status(verdict.textContent);
        if (ctx.active) { runBtn.disabled = false; stopBtn.disabled = true; }
      }
    }
    runBtn.addEventListener("click", go);
    stopBtn.addEventListener("click", () => { running = false; stopBtn.disabled = true; });
    if (auto) ctx.timeout(go, 300);
    return { run: go, results, panel: body };
  }

  // ---------- shell ----------
  function run({ scenes, start } = {}) {
    if (!Array.isArray(scenes) || !scenes.length) throw new Error("Showcase.run needs scenes[]");
    const metaEl = document.getElementById("demo-meta");
    let meta = {};
    try { meta = metaEl ? JSON.parse(metaEl.textContent) : {}; } catch (e) { console.error("[showcase] demo-meta is not valid JSON", e); }
    const titles = scenes.map((s) => s.title);
    if (!Array.isArray(meta.scenes) || meta.scenes.join("|") !== titles.join("|")) {
      console.error(`[showcase] demo-meta "scenes" must equal ${JSON.stringify(titles)}`);
    }
    const ids = new Set();
    for (const s of scenes) {
      if (!s.id || ids.has(s.id)) console.error(`[showcase] scene id missing or duplicated: ${s.id}`);
      ids.add(s.id);
    }

    const tabs = h("nav", { class: "sc-tabs", role: "tablist", "aria-label": "示範場景" });
    const stage = h("main", { class: "sc-stage" });
    const apiEl = h("code", { class: "sc-api" });
    const descEl = h("span", { class: "sc-desc" });
    const hintEl = h("span", { class: "sc-hint" });
    const moreEl = h("span", { class: "sc-more", "aria-hidden": "true" }, "…");
    const foot = h("footer", { class: "sc-foot", title: "點一下展開完整說明" }, apiEl, descEl, hintEl, moreEl);
    foot.addEventListener("click", () => foot.classList.toggle("open"));
    document.body.prepend(tabs, stage, foot);

    const tabBtns = scenes.map((s, i) => {
      const b = h("button", {
        class: `sc-tab${s.kind === "stress" ? " stress" : ""}`, type: "button", role: "tab",
        id: `sc-tab-${s.id}`, "aria-selected": "false", tabindex: "-1",
      }, h("span", { class: "n", text: String(i + 1) }), s.title);
      b.addEventListener("click", () => go(i));
      tabs.append(b);
      return b;
    });
    tabs.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = (index + (e.key === "ArrowRight" ? 1 : -1) + scenes.length) % scenes.length;
      go(next);
      tabBtns[next].focus();
    });
    tabs.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tabs.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });

    let index = -1;
    let live = null;
    let token = 0;
    const shell = {
      setHint(text) {
        hintEl.textContent = text || "";
        stage.querySelector(".sc-toast")?.remove();
        if (text) stage.append(h("div", { class: "sc-toast", text }));
      },
    };

    function go(target) {
      const i = typeof target === "number" ? target : scenes.findIndex((s) => s.id === target);
      if (i < 0 || i >= scenes.length || i === index) return;
      const my = ++token;
      if (live) { live.destroy(); live = null; }
      stage.replaceChildren();
      document.body.classList.remove("paper");
      foot.classList.remove("open");
      index = i;
      const s = scenes[i];
      tabBtns.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      const tb = tabBtns[i];
      tabs.scrollTo({ left: tb.offsetLeft - (tabs.clientWidth - tb.offsetWidth) / 2, behavior: "smooth" });
      apiEl.textContent = s.api || "";
      apiEl.title = s.api || "";
      apiEl.hidden = !s.api;
      descEl.textContent = s.desc || "";
      if (s.paper) document.body.classList.add("paper");
      const el = h("section", { class: "sc-scene", role: "tabpanel", "aria-labelledby": tb.id, "data-scene": s.id });
      stage.append(el);
      live = makeContext(shell, s, el);
      shell.setHint(s.hint || "");
      try { history.replaceState(null, "", `#${s.id}`); } catch { /* sandboxed: ignore */ }
      try { window.parent !== window && window.parent.postMessage({ type: "showcase:scene", index: i, id: s.id }, "*"); } catch { /* ignore */ }
      Promise.resolve()
        .then(() => s.mount(live.ctx))
        .catch((e) => {
          if (isAbort(e) || my !== token) return;
          console.error(`[showcase] scene "${s.id}" failed:`, e);
          el.append(h("div", { class: "sc-error" }, h("div", {},
            h("b", { text: "這個場景載入失敗" }),
            h("p", { text: "可能是網路無法連到 CDN，或瀏覽器不支援此功能。" }),
            h("pre", { text: String(e && e.message || e) }))));
        });
    }

    window.addEventListener("unhandledrejection", (e) => { if (isAbort(e.reason)) e.preventDefault(); });
    window.__showcase = {
      scenes: scenes.map((s) => ({ id: s.id, title: s.title, kind: s.kind || "" })),
      get index() { return index; },
      go,
    };
    const fromHash = scenes.findIndex((s) => `#${s.id}` === location.hash);
    go(fromHash >= 0 ? fromHash : typeof start === "number" ? start : 0);
  }

  window.Showcase = { run, fmt, fmtCompact, fmtMs, h, load: loadScript, css: loadCSS, device, deviceLine };
})();
