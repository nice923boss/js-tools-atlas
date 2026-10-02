// Secondary pages: recipes, platforms, stats, about. Each renders once on first visit.
import { icon, esc, fmtStars, fmtInt, splitCat, copyText, starsText, FRIENDLY_TEXT } from "./util.js";

const { tools, platforms, recipes, notes } = window.ATLAS;
const DATA_DATE = "2026-10-01";
const rendered = new Set();
let actions = {};

const norm = (s) => s.replace(/（.*?）|\(.*?\)/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Match a recipe ingredient ("Three.js", "GSAP ScrollTrigger", "Lottie") to a tool in the list.
function findTool(part) {
  const n = norm(part);
  if (!n) return null;
  const keys = tools.map((t) => [t, t.slug.replace(/-/g, ""), norm(t.name)]);
  const hit = (pred) => keys.find(([, s, nm]) => pred(s) || pred(nm))?.[0];
  return (
    hit((k) => k === n) ||
    hit((k) => k === `${n}js`) ||
    (n.length >= 5 && (hit((k) => k.endsWith(n)) || hit((k) => k.startsWith(n)))) ||
    (part.includes(" ") && findTool(part.split(" ").pop())) ||
    null
  );
}

const pageHead = (title, sub) => `<div class="page-head"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>`;

function renderRecipes(el) {
  const cards = recipes.map((r) => {
    const chips = r.combo.split(/[＋+]/).map((p) => p.trim()).filter(Boolean).map((p) => {
      const t = findTool(p);
      return t
        ? `<a class="tool-chip" href="#/tool/${t.slug}">${t.demo ? "<i></i>" : ""}${esc(p)}</a>`
        : `<span class="tool-chip static">${esc(p)}</span>`;
    }).join("");
    return `<article class="card">
      <div class="sub">配方 ${r.id}</div>
      <h3>${esc(r.result)}</h3>
      <div class="tool-chips">${chips}</div>
      <p class="prompt-box">${esc(r.prompt)}</p>
      <div class="card-foot">
        <button type="button" class="btn" data-copy="${r.id}">${icon("copy")}複製提示詞</button>
        ${r.url ? `<a class="btn ghost" href="${esc(r.url)}" target="_blank" rel="noopener">${icon("external-link")}參考範例</a>` : ""}
      </div>
    </article>`;
  }).join("");
  el.innerHTML = `${pageHead("組合配方", `${recipes.length} 組多工具搭配的成品方向，附可直接貼給 Claude 的提示詞。工具名稱旁有黃點的代表本站有線上示範，點一下就能跳到該工具。`)}
    <div class="cards">${cards}</div>`;
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const r = recipes.find((x) => String(x.id) === b.dataset.copy);
    copyText(r.prompt, "已複製提示詞");
  });
}

function renderPlatforms(el) {
  const cards = platforms.map((p) => `<article class="card">
      <div class="sub">${p.id}・網址檢查：${esc(p.check)}</div>
      <h3>${esc(p.name)}</h3>
      <p class="plat-fit"><b>適合</b>${esc(p.fit)}</p>
      <p style="margin:0;color:var(--fg-2);font-size:14px">${esc(p.desc)}</p>
      <div class="card-foot">${p.url ? `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">${icon("external-link")}前往網站</a>` : ""}</div>
    </article>`).join("");
  el.innerHTML = `${pageHead("靈感平台", `${platforms.length} 個找範例、素材與靈感的網站。看到喜歡的作品，可以記下用到的工具，再回到清單找示範與提示詞。`)}
    <div class="cards">${cards}</div>`;
}

// ---------- Stats ----------
function hbars(rows, max) {
  return `<div class="bars">${rows.map((r) => `
    <div class="bar-row" tabindex="0" data-tip="${esc(r.tip || `${r.label}：${r.value}`)}">
      <span class="lbl">${r.labelHTML || esc(r.label)}</span>
      <span class="track"><i class="seg-one" style="width:${(r.value / max) * 100}%"></i></span>
      <span class="v">${esc(r.display ?? r.value)}</span>
    </div>`).join("")}</div>`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function renderStats(el) {
  const cats = [...new Set(tools.map((t) => t.cat))];
  const byCat = cats.map((c) => {
    const list = tools.filter((t) => t.cat === c);
    const f = [3, 2, 1].map((k) => list.filter((t) => t.friendly === k).length);
    return { cat: c, total: list.length, f, demos: list.filter((t) => t.demo).length };
  });
  const maxCat = Math.max(...byCat.map((c) => c.total));
  const demoCount = tools.filter((t) => t.demo).length;
  const f3 = tools.filter((t) => t.friendly === 3).length;
  const mit = tools.filter((t) => t.license === "MIT").length;
  const fresh = tools.filter((t) => t.updated && daysBetween(t.updated, DATA_DATE) <= 30).length;
  const pct = (n) => `${Math.round((n / tools.length) * 100)}%`;

  const catRows = byCat.map(({ cat, total, f, demos }) => {
    const { num, name } = splitCat(cat);
    const segs = f.map((n, i) => n ? `<i class="seg-f${3 - i}" style="width:${(n / maxCat) * 100}%" data-tip="${esc(`${name}・${starsText(3 - i)}：${n} 個`)}"></i>` : "").join("");
    return `<button type="button" class="bar-row" data-cat="${esc(cat)}" data-tip="${esc(`${name}：共 ${total} 個（★★★ ${f[0]}、★★ ${f[1]}、★ ${f[2]}），${demos} 個有示範`)}">
      <span class="lbl"><b>${num}</b>${esc(name)}</span><span class="track">${segs}</span><span class="v">${total}</span></button>`;
  }).join("");

  const levels = ["入門", "中階", "進階"].map((lv) => ({ label: lv, value: tools.filter((t) => t.level === lv).length }));
  const maxLv = Math.max(...levels.map((l) => l.value));

  const bins = [
    ["30 天內", (d) => d <= 30], ["31 至 180 天", (d) => d > 30 && d <= 180],
    ["181 天至 1 年", (d) => d > 180 && d <= 365], ["1 至 3 年", (d) => d > 365 && d <= 1095], ["超過 3 年", (d) => d > 1095],
  ];
  const ages = tools.filter((t) => t.updated).map((t) => daysBetween(t.updated, DATA_DATE));
  const recency = bins.map(([label, fn]) => ({ label, value: ages.filter(fn).length }));
  recency.push({ label: "無資料", value: tools.filter((t) => !t.updated).length });
  const maxRec = Math.max(...recency.map((r) => r.value));

  const licCount = {};
  tools.forEach((t) => { licCount[t.license] = (licCount[t.license] || 0) + 1; });
  const licSorted = Object.entries(licCount).sort((a, b) => b[1] - a[1]);
  const licTop = licSorted.slice(0, 7).map(([label, value]) => ({ label, value }));
  const licOther = licSorted.slice(7).reduce((s, [, v]) => s + v, 0);
  if (licOther) licTop.push({ label: `其他 ${licSorted.length - 7} 種`, value: licOther });
  const maxLic = Math.max(...licTop.map((l) => l.value));

  const top = tools.filter((t) => t.stars != null).sort((a, b) => b.stars - a.stars).slice(0, 15);
  const topRows = top.map((t) => ({
    label: t.name, value: t.stars, display: fmtStars(t.stars),
    labelHTML: `<a href="#/tool/${t.slug}">${esc(t.name)}</a>`, tip: `${t.name}：${fmtInt(t.stars)} 星`,
  }));

  const tableRows = byCat.map(({ cat, total, f, demos }) =>
    `<tr><td>${esc(cat)}</td><td>${f[0]}</td><td>${f[1]}</td><td>${f[2]}</td><td>${demos}</td><td>${total}</td></tr>`).join("");

  el.innerHTML = `${pageHead("分類統計", `依 ${DATA_DATE} 的資料計算。點分類長條可直接跳到該分類的工具清單。`)}
    <div class="tiles">
      <div class="tile"><span>工具總數</span><b>${tools.length}</b><small>${cats.length} 大類</small></div>
      <div class="tile"><span>單檔可跑（★★★）</span><b>${f3}</b><small>占 ${pct(f3)}</small></div>
      <div class="tile"><span>有線上示範</span><b>${demoCount}</b><small>占 ★★★ 的 ${Math.round((demoCount / f3) * 100)}%</small></div>
      <div class="tile"><span>MIT 授權</span><b>${mit}</b><small>占 ${pct(mit)}</small></div>
      <div class="tile"><span>30 天內有更新</span><b>${fresh}</b><small>以 GitHub 最後 push 計</small></div>
    </div>
    <div class="stat-grid">
      <section class="panel viz">
        <h2>各大類工具數</h2>
        <p class="sub">依 Claude 單檔友善度分段，長條長度為工具數</p>
        <div class="legend"><span><i class="seg-f3"></i>★★★ 單檔可跑</span><span><i class="seg-f2"></i>★★ 需建置</span><span><i class="seg-f1"></i>★ 需金鑰或後端</span></div>
        <div class="bars cat-bars">${catRows}</div>
        <details class="tbl-details"><summary>以表格檢視</summary>
          <div class="tbl-wrap"><table class="mini-table num-table"><thead><tr><th>分類</th><th>★★★</th><th>★★</th><th>★</th><th>示範</th><th>合計</th></tr></thead><tbody>${tableRows}</tbody></table></div>
        </details>
      </section>
      <div class="stat-side">
        <section class="panel viz"><h2>難度分布</h2><p class="sub">主觀分級，入門代表看範例改參數就能用</p>${hbars(levels, maxLv)}</section>
        <section class="panel viz"><h2>最後更新距今</h2><p class="sub">以 GitHub 倉庫最後 push 日期計算</p>${hbars(recency, maxRec)}</section>
        <section class="panel viz"><h2>授權</h2><p class="sub">商用前請以官方授權條款為準</p>${hbars(licTop, maxLic)}</section>
      </div>
    </div>
    <section class="panel viz" style="margin-top:16px"><h2>GitHub 星數前 15 名</h2><p class="sub">點名稱可看該工具的示範與介紹</p>${hbars(topRows, top[0].stars)}</section>
    <div class="viz-tip" role="tooltip" hidden></div>`;

  el.querySelector(".cat-bars").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (b) actions.showCategory(b.dataset.cat);
  });
  bindTips(el);
}

// One tooltip for every mark: segment-level tip wins over the row-level tip.
function bindTips(root) {
  const tip = root.querySelector(".viz-tip");
  const show = (target, x, y) => {
    const src = target.closest("[data-tip]");
    if (!src) { tip.hidden = true; return; }
    tip.textContent = src.dataset.tip;
    tip.hidden = false;
    const w = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(8, x - w / 2), innerWidth - w - 8)}px`;
    tip.style.top = `${y - tip.offsetHeight - 12}px`;
  };
  root.addEventListener("pointermove", (e) => show(e.target, e.clientX, e.clientY));
  root.addEventListener("pointerleave", () => { tip.hidden = true; });
  root.addEventListener("focusin", (e) => {
    const r = e.target.getBoundingClientRect();
    show(e.target, r.left + r.width / 2, r.top);
  });
  root.addEventListener("focusout", () => { tip.hidden = true; });
}

// ---------- About ----------
function renderAbout(el) {
  const demoCount = tools.filter((t) => t.demo).length;
  const noteRows = notes.map((n) => `<dt>${esc(n.k)}</dt><dd>${esc(n.v)}</dd>`).join("");
  el.innerHTML = `<div class="prose">
    ${pageHead("說明", "這份圖鑑由 Excel 清單「JS工具功能清單」轉成網頁，並替單檔可執行的工具製作線上示範。")}
    <h2>清單欄位說明</h2>
    <dl>${noteRows}</dl>
    <h2>示範頁怎麼做的</h2>
    <ul>
      <li>目前有 ${demoCount} 個工具附線上示範。每個示範都是 <code>demos/</code> 底下的獨立 HTML 檔，從 jsDelivr 等公開 CDN 載入真正的函式庫，版本號鎖定到 patch。</li>
      <li>下載量大（AI 模型、wasm）或需要鏡頭、麥克風、MIDI、序列埠的示範不會自動載入，按下「開始」才會下載與請求權限。</li>
      <li>沒有實體裝置時，硬體類示範會偵測並提供替代輸入（例如螢幕鍵盤）。</li>
      <li>每個示範都用無頭 Chromium 自動檢查 console 錯誤、載入失敗、空白畫面與版面溢出，並逐一檢視截圖。清單縮圖也是由這些截圖產生。</li>
      <li>示範台右上角可以重新載入、檢視原始碼、在新分頁開啟或全螢幕。原始碼可以直接複製當成起點。</li>
    </ul>
    <h2>已知限制</h2>
    <ul>
      <li>自動檢查在無頭 Chromium 上執行，鏡頭與麥克風用假裝置代替；沒有在真實 MIDI、序列埠、XR、WebGPU 裝置上測試，也沒有逐一在 Safari、Firefox 與手機實機上測試。</li>
      <li>示範中的聲音由程式產生或使用自製循環音樂，沒有人工試聽。</li>
      <li>示範依賴 CDN、地圖圖磚與模型下載等外部服務，這些服務中斷時示範可能無法載入。</li>
      <li>圖表示範中標示「示意資料」的數字皆為虛構。</li>
      <li>星數、授權、最後更新與網址檢查是 ${DATA_DATE} 的快照，之後不會自動更新。</li>
    </ul>
    <h2>素材與授權</h2>
    <ul>
      <li>照片：Unsplash 攝影作品（經 Lorem Picsum 取得，Unsplash 授權）。</li>
      <li>360 全景：Poly Haven「Venice Sunset」，CC0。</li>
      <li>3D 模型：RobotExpressive，Tomás Laulhé 製作，CC0（three.js 範例素材）。</li>
      <li>循環音樂：本站以程式自製。</li>
      <li>介面圖示：Lucide（ISC 授權）。程式碼高亮：highlight.js（BSD-3-Clause）。</li>
      <li>各示範載入的函式庫依其各自授權使用，詳見清單中的授權欄位。</li>
    </ul>
    <h2>單檔友善度</h2>
    <ul>${[3, 2, 1].map((k) => `<li><b>${starsText(k)}</b>：${FRIENDLY_TEXT[k]}</li>`).join("")}</ul>
  </div>`;
}

const RENDERERS = { recipes: renderRecipes, platforms: renderPlatforms, stats: renderStats, about: renderAbout };

export function initViews(a) {
  actions = a;
}

export function renderView(name) {
  if (rendered.has(name) || !RENDERERS[name]) return;
  RENDERERS[name](document.getElementById(`view-${name}`));
  rendered.add(name);
}
