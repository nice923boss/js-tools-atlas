// Demo stage: iframe preview, tool details, generated prompt, and the source-code dialog.
import { icon, esc, fmtInt, starsText, FRIENDLY_TEXT, NEEDS, splitCat, isArchived, copyText } from "./util.js";

const HLJS_VER = "11.12.0";
const HLJS_BASE = `https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@${HLJS_VER}`;
const IFRAME_ALLOW = "camera; microphone; midi; serial; xr-spatial-tracking; fullscreen; autoplay; clipboard-write; accelerometer; gyroscope";

const stageEl = () => document.getElementById("stage");
let current = null;
let pendingScene = -1; // scene chip clicked before the iframe finished loading

const firstEffect = (t) => (t.effect || "").split(/[、，,]/)[0].trim() || t.name;

export function promptFor(t) {
  const fx = firstEffect(t);
  if (t.friendly === 3) {
    return `請用 ${t.name} 做一個「${fx}」的單一 HTML 檔作品：從 jsDelivr CDN 載入 ${t.name} 並鎖定版本號，HTML、CSS、JavaScript 全部寫在同一個檔案，可以直接用瀏覽器開啟。介面文字使用繁體中文，版面支援手機，畫面上加一行操作提示。`;
  }
  if (t.friendly === 2) {
    return `請用 ${t.name}（${t.framework}）建立一個最小可執行的 Vite 專案，示範「${fx}」。列出完整檔案結構、package.json、每個檔案的內容，以及 npm 安裝與啟動指令。介面文字使用繁體中文。`;
  }
  return `我想用 ${t.name} 做「${fx}」。請先說明需要準備的帳號、API 金鑰、付費方案或後端伺服器，再提供範例程式。API 金鑰必須放在後端或環境變數，不可寫進前端網頁。介面文字使用繁體中文。`;
}

function needsChips(demo) {
  const chips = (demo.needs || [])
    .filter((n) => NEEDS[n])
    .map((n) => `<span class="badge">${icon(NEEDS[n].icon)}${NEEDS[n].label}</span>`);
  if (demo.mode === "click") chips.unshift(`<span class="badge gate">${icon("pointer")}點擊後啟動</span>`);
  if (demo.size) chips.push(`<span class="badge">${icon("package")}${esc(demo.size)}</span>`);
  return chips.join("");
}

function frameHTML(t) {
  if (!t.demo) {
    const reason = t.friendly === 3
      ? "這個工具還沒有製作線上示範。"
      : `這個工具屬於 ${starsText(t.friendly)}：${FRIENDLY_TEXT[t.friendly]}，無法用單一 HTML 檔在這裡直接執行。`;
    const ex = t.example || t.site;
    return `<div class="frame"><div class="nodemo"><div>
      <div class="big">${starsText(t.friendly)}</div>
      <h3>沒有內嵌示範</h3>
      <p>${esc(reason)}可以到官方範例頁看實際效果。</p>
      ${ex ? `<a class="btn" href="${esc(ex)}" target="_blank" rel="noopener">${icon("external-link")}開啟官方範例</a>` : ""}
    </div></div></div>`;
  }
  const note = [needsChips(t.demo), t.demo.note ? `<span>${esc(t.demo.note)}</span>` : ""].join("");
  return `<div class="frame" id="frame"><div class="loading"><span>載入示範中…</span></div></div>
    ${note ? `<div class="frame-note">${note}</div>` : ""}`;
}

function mountIframe(t) {
  const frame = document.getElementById("frame");
  if (!frame) return;
  frame.querySelector("iframe")?.remove();
  const loading = frame.querySelector(".loading");
  loading.classList.remove("done");
  pendingScene = -1;
  // A fresh iframe per load keeps demo navigations out of the page's back/forward history.
  const ifr = document.createElement("iframe");
  ifr.src = `demos/${t.slug}.html`;
  ifr.title = `${t.name} 示範`;
  ifr.allow = IFRAME_ALLOW;
  ifr.addEventListener("load", () => {
    loading.classList.add("done");
    if (pendingScene >= 0) ifr.contentWindow.__showcase?.go(pendingScene);
    pendingScene = -1;
  }, { once: true });
  frame.prepend(ifr);
}

// Showcase demos list their scenes in demo-meta; the chips jump the iframe to a scene.
function scenesHTML(t) {
  const scenes = t.demo?.scenes || [];
  if (!scenes.length) return "";
  const chips = scenes.map((name, i) =>
    `<button type="button" class="scene-chip" data-act="scene" data-i="${i}"${i ? "" : ' aria-current="true"'}><b>${i + 1}</b>${esc(name)}</button>`);
  return `<div class="info-sec"><h4>示範場景（${scenes.length}）</h4><div class="scene-list">${chips.join("")}</div></div>`;
}

function markScene(i) {
  document.querySelectorAll("#stage .scene-chip").forEach((b) => {
    if (Number(b.dataset.i) === i) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

function goScene(i) {
  const showcase = document.querySelector("#frame iframe")?.contentWindow?.__showcase;
  if (showcase) showcase.go(i);
  else pendingScene = i;
  markScene(i);
}

function infoHTML(t) {
  const { num, name: catName } = splitCat(t.cat);
  const badges = [
    `<span class="badge lv-${esc(t.level)}">${esc(t.level)}</span>`,
    `<span class="badge stars-f" title="${esc(FRIENDLY_TEXT[t.friendly])}"><b>${starsText(t.friendly)}</b></span>`,
    t.demo ? `<span class="badge demo">${icon("play")}線上示範</span>` : "",
    isArchived(t) ? `<span class="badge warn">${icon("archive")}已封存</span>` : "",
  ].join("");
  const kv = [
    ["分類", `${num} ${catName}`],
    ["難度", t.level],
    ["單檔友善度", `${starsText(t.friendly)} ${FRIENDLY_TEXT[t.friendly]}`],
    ["框架", t.framework],
    ["授權", t.license],
    ["GitHub 星數", fmtInt(t.stars), "mono"],
    ["最後更新", t.updated || "未提供", "mono"],
    ["網址檢查", t.check],
  ];
  const links = [
    t.site && `<a class="btn" href="${esc(t.site)}" target="_blank" rel="noopener">${icon("globe")}官網</a>`,
    t.example && `<a class="btn" href="${esc(t.example)}" target="_blank" rel="noopener">${icon("book")}官方範例</a>`,
    t.github && `<a class="btn" href="${esc(t.github)}" target="_blank" rel="noopener">${icon("github")}GitHub</a>`,
  ].filter(Boolean).join("");
  return `<div class="info">
    <div class="info-head"><h2>${esc(t.name)}</h2><div class="badges">${badges}</div></div>
    ${scenesHTML(t)}
    <div class="info-sec"><h4>功能</h4><p>${esc(t.desc)}</p></div>
    <div class="info-sec"><h4>可做出的效果</h4><p>${esc(t.effect)}</p></div>
    <dl class="kv">${kv.map(([k, v, c]) => `<div><dt>${k}</dt><dd${c ? ` class="${c}"` : ""}>${esc(v)}</dd></div>`).join("")}</dl>
    <div class="links">${links}${t.exampleNote ? `<span class="count">範例：${esc(t.exampleNote)}</span>` : ""}</div>
    ${t.note ? `<div class="callout"><b>備註</b>　${esc(t.note)}</div>` : ""}
    <div class="prompt-card">
      <header><b>${icon("sparkles")} 給 Claude 的提示詞</b><button type="button" class="btn ghost" data-act="copy-prompt">${icon("copy")}複製</button></header>
      <p>${esc(promptFor(t))}</p>
    </div>
  </div>`;
}

export function renderStage(t) {
  current = t;
  const el = stageEl();
  if (!t) {
    el.innerHTML = `<div class="stage-empty">從左側清單選一個工具，示範會顯示在這裡。</div>`;
    return;
  }
  const { num, name: catName } = splitCat(t.cat);
  const dis = t.demo ? "" : ' aria-disabled="true" tabindex="-1"';
  el.innerHTML = `
    <div class="stage-bar">
      <button type="button" class="icon-btn stage-close" data-act="close" aria-label="關閉示範台">${icon("chevron-down")}</button>
      <div class="stage-title"><small>${num}・${esc(catName)}・#${t.id}</small><b>${esc(t.name)}</b></div>
      <div class="stage-actions">
        <button type="button" class="icon-btn" data-act="reload" title="重新載入示範" aria-label="重新載入示範"${dis}>${icon("rotate-cw")}</button>
        <button type="button" class="icon-btn" data-act="source" title="檢視原始碼" aria-label="檢視原始碼"${dis}>${icon("code")}</button>
        <a class="icon-btn" href="demos/${t.slug}.html" target="_blank" rel="noopener" title="在新分頁開啟" aria-label="在新分頁開啟"${dis}>${icon("external-link")}</a>
        <button type="button" class="icon-btn" data-act="fullscreen" title="全螢幕" aria-label="全螢幕"${dis}>${icon("maximize")}</button>
      </div>
    </div>
    <div class="frame-wrap">${frameHTML(t)}</div>
    ${infoHTML(t)}`;
  el.scrollTop = 0;
  if (t.demo) mountIframe(t);
}

export function clearStage() {
  current = null;
  stageEl().innerHTML = "";
}

// ---------- Source dialog ----------
let hljsPromise;
function loadHljs() {
  if (!hljsPromise) {
    hljsPromise = new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${HLJS_BASE}/styles/github-dark.min.css`;
      document.head.appendChild(link);
      const s = document.createElement("script");
      s.src = `${HLJS_BASE}/highlight.min.js`;
      s.onload = () => resolve(window.hljs);
      s.onerror = () => reject(new Error("highlight.js failed to load"));
      document.head.appendChild(s);
    });
  }
  return hljsPromise;
}

async function openSource(t) {
  const dlg = document.getElementById("source-dialog");
  const code = document.getElementById("source-code");
  document.getElementById("source-title").textContent = `demos/${t.slug}.html`;
  code.className = "language-html";
  code.textContent = "讀取中…";
  dlg.showModal();
  try {
    const res = await fetch(`demos/${t.slug}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    code.textContent = await res.text();
    try {
      const hljs = await loadHljs();
      hljs.highlightElement(code);
    } catch (e) {
      console.warn("Syntax highlighting unavailable:", e); // plain text still readable
    }
  } catch (e) {
    code.textContent = `無法讀取原始碼（${e.message}）。可改用「在新分頁開啟」後檢視原始碼。`;
  }
}

export function initStage({ onClose }) {
  const el = stageEl();
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || !current || btn.getAttribute("aria-disabled") === "true") return;
    const act = btn.dataset.act;
    if (act === "close") onClose();
    else if (act === "reload") mountIframe(current);
    else if (act === "source") openSource(current);
    else if (act === "fullscreen") document.getElementById("frame")?.requestFullscreen?.();
    else if (act === "copy-prompt") copyText(promptFor(current), "已複製提示詞");
    else if (act === "scene") goScene(Number(btn.dataset.i));
  });
  window.addEventListener("message", (e) => {
    const ifr = document.querySelector("#frame iframe");
    if (!ifr || e.source !== ifr.contentWindow || e.data?.type !== "showcase:scene") return;
    markScene(e.data.index);
  });

  const dlg = document.getElementById("source-dialog");
  document.getElementById("source-close").addEventListener("click", () => dlg.close());
  document.getElementById("source-copy").addEventListener("click", () =>
    copyText(document.getElementById("source-code").textContent, "已複製原始碼"));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
}
