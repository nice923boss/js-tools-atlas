// Click-to-start gate for heavy demos or demos needing permissions / audio.
// Usage:
//   await demoGate({ icon: "🎤", title: "麥克風頻譜", desc: "按下後會請求麥克風權限", tags: ["需要麥克風", "約 2 MB"] });
//   startDemo();
// The start button carries [data-demo-start] so automated checks can click it.
window.demoGate = function demoGate({ icon = "▶", title = "啟動示範", desc = "", tags = [], button = "開始" } = {}) {
  return new Promise((resolve) => {
    const gate = document.createElement("div");
    gate.className = "demo-gate";
    const card = document.createElement("div");
    card.className = "card";

    const iconEl = document.createElement("div");
    iconEl.className = "icon";
    iconEl.textContent = icon;
    const h = document.createElement("h2");
    h.textContent = title;
    card.append(iconEl, h);

    if (desc) {
      const p = document.createElement("p");
      p.textContent = desc;
      card.append(p);
    }
    if (tags.length) {
      const wrap = document.createElement("div");
      wrap.className = "tags";
      for (const t of tags) {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        wrap.append(s);
      }
      card.append(wrap);
    }
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.dataset.demoStart = "";
    btn.textContent = button;
    btn.addEventListener("click", () => {
      gate.remove();
      resolve();
    }, { once: true });
    card.append(btn);
    gate.append(card);
    document.body.append(gate);
  });
};

// Status overlay helper for long loads: const s = demoStatus("下載模型中…"); s.progress(0.4); s.done();
window.demoStatus = function demoStatus(text) {
  const el = document.createElement("div");
  el.className = "status";
  const label = document.createElement("div");
  label.textContent = text;
  const bar = document.createElement("div");
  bar.className = "bar";
  const fill = document.createElement("i");
  bar.append(fill);
  el.append(label, bar);
  document.body.append(el);
  return {
    text(t) { label.textContent = t; },
    progress(p) { fill.style.width = `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`; },
    error(t) { label.textContent = t; el.style.borderColor = "#e5484d"; bar.remove(); },
    done() { el.remove(); },
  };
};
