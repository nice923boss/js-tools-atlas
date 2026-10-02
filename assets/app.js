// Main entry: filters, list/table rendering, routing, keyboard shortcuts.
import { icon, hydrateIcons, esc, fmtStars, starsText, FRIENDLY_TEXT, NEEDS, splitCat, isArchived, store } from "./util.js";
import { renderStage, clearStage, initStage } from "./stage.js";
import { initViews, renderView } from "./views.js";

const { tools } = window.ATLAS;
const CATS = [...new Set(tools.map((t) => t.cat))];
const bySlug = new Map(tools.map((t) => [t.slug, t]));
const narrowMQ = matchMedia("(max-width: 999px)");
const HOME_TITLE = document.title;
const $ = (id) => document.getElementById(id);

const state = {
  q: "",
  cat: "",
  level: new Set(),
  friendly: new Set(),
  onlyDemo: false,
  sort: store.get("atlas-sort", "id"),
  layout: store.get("atlas-layout", "list"),
  selected: null,
  view: "tools",
};

// Search index: lowercase haystack per tool.
const HAY = new Map(tools.map((t) => [t.slug, [t.name, t.slug, t.desc, t.effect, t.cat, t.level, t.framework, t.license].join(" ").toLowerCase()]));

function tokens() {
  return state.q.toLowerCase().split(/\s+/).filter(Boolean);
}

function matches(t, { ignoreCat = false } = {}) {
  if (!ignoreCat && state.cat && t.cat !== state.cat) return false;
  if (state.level.size && !state.level.has(t.level)) return false;
  if (state.friendly.size && !state.friendly.has(String(t.friendly))) return false;
  if (state.onlyDemo && !t.demo) return false;
  const hay = HAY.get(t.slug);
  return tokens().every((tok) => hay.includes(tok));
}

const SORTERS = {
  id: (a, b) => a.id - b.id,
  stars: (a, b) => (b.stars ?? -1) - (a.stars ?? -1),
  updated: (a, b) => (b.updated || "").localeCompare(a.updated || ""),
  name: (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
};

function filtered() {
  return tools.filter((t) => matches(t)).sort(SORTERS[state.sort] || SORTERS.id);
}

// Wrap search tokens in <mark>, escaping everything else.
function hl(text) {
  const toks = tokens();
  const s = String(text ?? "");
  if (!toks.length) return esc(s);
  const re = new RegExp(`(${toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return s.split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
}

// ---------- Hero, categories ----------
function renderHero() {
  const demos = tools.filter((t) => t.demo).length;
  const f3 = tools.filter((t) => t.friendly === 3).length;
  const items = [
    ["工具", tools.length, "個"],
    ["大類", CATS.length, "類"],
    ["單檔可跑 ★★★", f3, "個"],
    ["線上示範", demos, "個", "hl"],
  ];
  $("hero-stats").innerHTML = items.map(([k, v, u, cls]) =>
    `<div class="${cls || ""}"><dt>${k}</dt><dd>${v}<small>${u}</small></dd></div>`).join("");
}

function renderCats() {
  // Counts honour every active filter except the category itself.
  const pool = tools.filter((t) => matches(t, { ignoreCat: true }));
  const count = (c) => pool.filter((t) => t.cat === c).length;
  const demoCount = (c) => pool.filter((t) => t.cat === c && t.demo).length;
  const item = (cat, num, name, n, d) =>
    `<li><button type="button" data-cat="${esc(cat)}" aria-pressed="${state.cat === cat}" title="${n} 個工具，${d} 個有示範">
      <span class="num">${num}</span><span>${esc(name)}</span><span class="n">${n}</span></button></li>`;
  $("cat-list").innerHTML =
    item("", "∗", "全部", pool.length, pool.filter((t) => t.demo).length) +
    CATS.map((c) => { const { num, name } = splitCat(c); return item(c, num, name, count(c), demoCount(c)); }).join("");
  $("cat-select").innerHTML =
    `<option value="">全部分類（${pool.length}）</option>` +
    CATS.map((c) => `<option value="${esc(c)}"${state.cat === c ? " selected" : ""}>${esc(c)}（${count(c)}）</option>`).join("");
}

// ---------- List & table ----------
function thumbHTML(t) {
  const play = t.demo ? `<span class="play">${icon("play")}</span>` : "";
  if (t.demo?.thumb) {
    return `<div class="thumb"><img src="assets/thumbs/${t.slug}.webp" alt="" loading="lazy" decoding="async" width="480" height="300">${play}</div>`;
  }
  const { num } = splitCat(t.cat);
  return `<div class="thumb ph${t.demo ? " live" : ""}">${num}<small>${starsText(t.friendly)}</small>${play}</div>`;
}

function badgesHTML(t) {
  const b = [
    `<span class="badge lv-${esc(t.level)}">${esc(t.level)}</span>`,
    `<span class="badge stars-f" title="${esc(FRIENDLY_TEXT[t.friendly])}"><b>${starsText(t.friendly)}</b></span>`,
  ];
  if (t.demo) {
    b.push(`<span class="badge demo">${icon("play")}示範</span>`);
    if (t.demo.mode === "click") b.push(`<span class="badge gate" title="按下後才載入">${icon("pointer")}點擊啟動</span>`);
    (t.demo.needs || []).filter((n) => NEEDS[n] && n !== "audio").forEach((n) =>
      b.push(`<span class="badge" title="${NEEDS[n].label}">${icon(NEEDS[n].icon)}</span>`));
  }
  if (isArchived(t)) b.push(`<span class="badge warn">${icon("archive")}已封存</span>`);
  return b.join("");
}

function rowHTML(t) {
  return `<a class="row" href="#/tool/${t.slug}" data-slug="${t.slug}" aria-selected="${state.selected === t.slug}">
    ${thumbHTML(t)}
    <div class="row-main">
      <div class="row-top"><span class="row-name">${hl(t.name)}</span>${badgesHTML(t)}</div>
      <p class="row-desc">${hl(t.desc)}</p>
      <div class="row-meta">
        <span title="GitHub 星數">${icon("star")}<span class="mono">${fmtStars(t.stars)}</span></span>
        <span title="最後更新">${icon("clock")}<span class="mono">${t.updated || "未提供"}</span></span>
        <span>${esc(t.framework)}</span><span>${esc(t.license)}</span>
      </div>
    </div>
  </a>`;
}

function listHTML(list) {
  const grouped = state.sort === "id" && !state.cat;
  let html = "";
  let lastCat = null;
  for (const t of list) {
    if (grouped && t.cat !== lastCat) {
      const { num, name } = splitCat(t.cat);
      const n = list.filter((x) => x.cat === t.cat).length;
      html += `<div class="group-head"><span class="num">${num}</span>${esc(name)}<small>${n}</small></div>`;
      lastCat = t.cat;
    }
    html += rowHTML(t);
  }
  return html;
}

function tableHTML(list) {
  const rows = list.map((t) => {
    const { num } = splitCat(t.cat);
    return `<tr data-slug="${t.slug}" aria-selected="${state.selected === t.slug}">
      <td class="mono">${t.id}</td>
      <td><a class="nm" href="#/tool/${t.slug}">${hl(t.name)}</a>${t.demo ? ` <span class="badge demo" title="有線上示範">${icon("play")}</span>` : ""}<div class="sub-cat">${num} ${esc(splitCat(t.cat).name)}</div></td>
      <td>${esc(t.level)}</td>
      <td class="mono">${starsText(t.friendly)}</td>
      <td class="clip" title="${esc(t.license)}">${esc(t.license)}</td>
      <td class="mono num">${fmtStars(t.stars)}</td>
      <td class="mono">${t.updated || "未提供"}</td>
    </tr>`;
  }).join("");
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>
    <th>#</th><th>名稱</th><th>難度</th><th>友善度</th><th>授權</th><th class="num">星數</th><th>最後更新</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

let currentList = [];
function renderList() {
  currentList = filtered();
  document.body.classList.toggle("layout-table", state.layout === "table");
  $("count").innerHTML = `顯示 <b>${currentList.length}</b> / ${tools.length} 個工具`;
  if (!currentList.length) {
    $("list").innerHTML = `<div class="empty"><b>沒有符合條件的工具</b>試試減少篩選條件，或換個關鍵字。<br><br><button type="button" class="btn" id="reset-filters">清除所有篩選</button></div>`;
  } else {
    $("list").innerHTML = state.layout === "table" ? tableHTML(currentList) : listHTML(currentList);
  }
  renderCats();
}

function markSelected() {
  document.querySelectorAll("#list [data-slug]").forEach((el) =>
    el.setAttribute("aria-selected", String(el.dataset.slug === state.selected)));
}

// ---------- Selection & stage ----------
function stageOpen() {
  return $("stage").classList.contains("open");
}

function openSheet() {
  $("stage").classList.add("open");
  document.body.classList.add("sheet-open");
}

function closeSheet() {
  $("stage").classList.remove("open");
  document.body.classList.remove("sheet-open");
  if (narrowMQ.matches) document.title = HOME_TITLE;
  // Stop the demo (audio, camera) once the sheet has slid away.
  setTimeout(() => { if (!stageOpen() && narrowMQ.matches) clearStage(); }, 300);
}

function select(slug, { scroll = false } = {}) {
  const t = bySlug.get(slug);
  if (!t) return;
  state.selected = slug;
  markSelected();
  renderStage(t);
  if (narrowMQ.matches) openSheet();
  if (scroll) document.querySelector(`#list [data-slug="${slug}"]`)?.scrollIntoView({ block: "nearest" });
  document.title = `${t.name}｜JS 工具圖鑑`;
}

function move(delta) {
  if (!currentList.length) return;
  const i = currentList.findIndex((t) => t.slug === state.selected);
  const next = currentList[Math.min(currentList.length - 1, Math.max(0, i + delta))];
  if (!next || next.slug === state.selected) return;
  history.replaceState(null, "", `#/tool/${next.slug}`);
  select(next.slug, { scroll: true });
}

// ---------- Routing ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [view, arg] = h.split("/");
  if (view === "tool" && arg) return { view: "tools", slug: decodeURIComponent(arg) };
  if (["recipes", "platforms", "stats", "about"].includes(view)) return { view };
  return { view: "tools" };
}

function showView(view) {
  state.view = view;
  document.querySelectorAll("main > .view").forEach((s) => { s.hidden = s.dataset.view !== view; });
  document.querySelectorAll(".tabs a").forEach((a) => {
    if (a.dataset.view === view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  // Keep the active tab visible when the tab strip overflows on narrow screens.
  const tabs = document.querySelector(".tabs");
  const cur = tabs.querySelector('[aria-current="page"]');
  if (cur && tabs.scrollWidth > tabs.clientWidth) {
    const left = cur.getBoundingClientRect().left - tabs.getBoundingClientRect().left + tabs.scrollLeft;
    tabs.scrollLeft = left + cur.offsetWidth / 2 - tabs.clientWidth / 2;
  }
  document.body.className = document.body.className.replace(/\bview-\S+/g, "").trim();
  document.body.classList.add(`view-${view}`);
  renderView(view);
}

function route() {
  const r = parseHash();
  const wasTools = state.view === "tools";
  showView(r.view);
  if (r.view !== "tools") {
    clearStage();
    closeSheet();
    document.title = HOME_TITLE;
    window.scrollTo(0, 0);
    return;
  }
  if (r.slug && bySlug.has(r.slug)) {
    select(r.slug, { scroll: !wasTools });
  } else if (narrowMQ.matches) {
    closeSheet();
  } else if (!wasTools || !state.selected || !$("stage").childElementCount) {
    select(state.selected || (tools.find((t) => t.demo) || tools[0]).slug);
  }
}

// ---------- Events ----------
function syncChips() {
  document.querySelectorAll(".chipset").forEach((set) => {
    const chosen = state[set.dataset.filter];
    set.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(chosen.has(b.dataset.v))));
  });
  document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layout === state.layout)));
  $("sort").value = state.sort;
  $("only-demo").checked = state.onlyDemo;
  $("q").value = state.q;
}

function setCat(cat) {
  state.cat = cat;
  renderList();
  const top = document.querySelector(".workspace").getBoundingClientRect().top + scrollY - 56;
  if (scrollY > top) window.scrollTo({ top });
}

function resetFilters() {
  Object.assign(state, { q: "", cat: "", onlyDemo: false });
  state.level.clear();
  state.friendly.clear();
  syncChips();
  renderList();
}

function bind() {
  let qTimer;
  $("q").addEventListener("input", (e) => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value.trim(); renderList(); }, 120);
  });
  document.querySelectorAll(".chipset").forEach((set) => set.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const s = state[set.dataset.filter];
    s.has(b.dataset.v) ? s.delete(b.dataset.v) : s.add(b.dataset.v);
    syncChips();
    renderList();
  }));
  $("only-demo").addEventListener("change", (e) => { state.onlyDemo = e.target.checked; renderList(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; store.set("atlas-sort", state.sort); renderList(); });
  document.querySelector(".seg").addEventListener("click", (e) => {
    const b = e.target.closest("[data-layout]");
    if (!b) return;
    state.layout = b.dataset.layout;
    store.set("atlas-layout", state.layout);
    syncChips();
    renderList();
  });
  $("cat-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (b) setCat(b.dataset.cat);
  });
  $("cat-select").addEventListener("change", (e) => setCat(e.target.value));

  // Desktop: replace history so the back button isn't flooded. Narrow: push, so back closes the sheet.
  $("list").addEventListener("click", (e) => {
    if (e.target.closest("#reset-filters")) { resetFilters(); return; }
    const el = e.target.closest("[data-slug]");
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (narrowMQ.matches) {
      const hash = `#/tool/${el.dataset.slug}`;
      if (location.hash === hash) select(el.dataset.slug); // same hash fires no hashchange
      else location.hash = hash;
    } else {
      history.replaceState(null, "", `#/tool/${el.dataset.slug}`);
      select(el.dataset.slug);
    }
  });

  $("theme-toggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("atlas-theme", root.dataset.theme);
  });

  document.addEventListener("keydown", (e) => {
    const typing = e.target.closest("input, select, textarea, [contenteditable]");
    if (e.key === "Escape") {
      if (narrowMQ.matches && stageOpen() && !$("source-dialog").open) closeStageNav();
      if (typing && e.target.id === "q") e.target.blur();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || state.view !== "tools") return;
    if (e.key === "/") { e.preventDefault(); $("q").focus(); $("q").select(); }
    else if (e.key === "j" || (e.key === "ArrowDown" && e.target.closest("#list"))) { e.preventDefault(); move(1); }
    else if (e.key === "k" || (e.key === "ArrowUp" && e.target.closest("#list"))) { e.preventDefault(); move(-1); }
  });

  window.addEventListener("hashchange", route);
  narrowMQ.addEventListener("change", () => {
    if (!narrowMQ.matches) {
      closeSheet();
      if (state.view === "tools" && state.selected) select(state.selected);
    } else {
      // Desktop selections use replaceState; drop the slug so a tap on the same row still opens the sheet.
      if (parseHash().slug) history.replaceState(null, "", "#/");
      closeSheet();
    }
  });

  // Sticky group headers sit just below the sticky toolbar.
  const tb = document.querySelector(".toolbar");
  new ResizeObserver(() => document.documentElement.style.setProperty("--toolbar-h", `${tb.offsetHeight}px`)).observe(tb);
}

function closeStageNav() {
  if (parseHash().slug) {
    // Came from a list tap (pushed entry): go back; otherwise just drop the slug.
    if (history.length > 1 && sessionOpened) history.back();
    else history.replaceState(null, "", "#/");
  }
  closeSheet();
}

let sessionOpened = false;
window.addEventListener("hashchange", () => { if (parseHash().slug) sessionOpened = true; });

// ---------- Boot ----------
hydrateIcons();
renderHero();
syncChips();
renderList();
initStage({ onClose: closeStageNav });
initViews({
  showCategory(cat) {
    location.hash = "#/";
    state.cat = cat;
    renderList();
    window.scrollTo(0, document.querySelector(".workspace").offsetTop - 56);
  },
});
bind();
route();
