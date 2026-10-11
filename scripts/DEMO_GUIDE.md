# 示範頁製作規範 v2（Showcase 多場景版）

JS 工具圖鑑（js-tools-atlas）是 GitHub Pages 靜態網站：左側列出 328 個 JavaScript 工具，右側「示範台」用 iframe 載入 `demos/<slug>.html`。v2 的目標：讀者打開示範，**一看就知道這個函式庫的特性，以及它在這台裝置上的效能上限**。

每個示範頁改成「多場景＋極限測試」：頂部分頁列 5 到 8 個場景，每個場景展示一種能力並標出對應 API，最後一個場景固定是「極限測試」，逐級加壓並即時量測 FPS 或耗時。

## 1. 檔案與位置

- 專案根目錄：`C:/Users/user/Documents/JS/js-tools-atlas`。
- 每個工具一個檔案：`demos/<slug>.html`，**直接覆寫原檔**（原檔先讀過，第一個場景要移植原本的示範）。
- 共用檔（只讀，不可修改）：`demos/_shared/showcase.js`、`showcase.css`、`demo.css`、`gate.js`、`img/*`、`models/robot.glb`、`audio/loop.mp3`。
- 額外檔案放 `demos/assets/<slug>/`，單檔不超過 1.5 MB，只用自製、CC0、MIT 等可公開散布的素材。
- **兩個完成的參考範本，動手前務必完整讀過**：
  - `demos/chartjs.html`：DOM／Canvas 圖表類（8 場景，`ctx.ramp` 加壓資料點）。
  - `demos/matterjs.html`：Canvas 物理／動畫類（8 場景，手動主迴圈分段計時）。

## 2. 頁面骨架

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>工具名 示範：N 個場景看懂 xxx 與上限</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="_shared/demo.css">
<link rel="stylesheet" href="_shared/showcase.css">
<script type="application/json" id="demo-meta">{"mode":"auto","scenes":["場景一","場景二","…","極限測試"]}</script>
<style>/* demo-specific styles */</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/<pkg>@<exact-version>/..."></script>
<script src="_shared/showcase.js"></script>
<script>
// comments in English
Showcase.run({ scenes: [
  { id: "basic", title: "場景一", api: "lib.method(opts)", desc: "一到兩句說明這個場景展示什麼", hint: "操作提示",
    mount(ctx) { /* build into ctx.el */ } },
  // ...
  { id: "stress", title: "極限測試", kind: "stress", api: "...", desc: "...", hint: "按「自動加壓」開始",
    mount(ctx) { ctx.ramp({ ... }); } },
] });
</script>
</body>
</html>
```

### demo-meta（主頁讀取，必填）

| 欄位 | 值 | 說明 |
|---|---|---|
| `mode` | `"auto"` 或 `"click"` | click：第一個場景先顯示啟動閘門（`ctx.gate`），按下才下載重型資源 |
| `scenes` | 字串陣列，**必填** | 場景標題，順序與數量必須和 `Showcase.run` 的 `title` 完全一致（不一致時 console.error，驗證會 FAIL） |
| `needs` | 陣列，可省略 | `camera`、`mic`、`audio`、`midi`、`serial`、`xr`、`webgpu` |
| `size` | 字串，可省略 | 大量下載時填，例如 `"約 30 MB"` |
| `note` | 字串，可省略 | 給讀者的一句繁中補充 |

## 3. 場景設計規則

1. **5 到 8 個場景**。場景 1 移植並改良原本的示範（保留原本的招牌畫面）。
2. **每個場景一種能力**，`api` 欄寫出真正呼叫的 API（例如 `gsap.timeline().to(…)`、`Bodies.rectangle(x, y, w, h, { chamfer })`），`desc` 用一到兩句繁中說明看點。
3. **涵蓋面**：對照該函式庫官方文件的主要功能區塊挑場景，例如：基本用法、主要元件或圖形種類、設定參數的效果對比、互動與事件、動畫或資料更新、進階功能（外掛、擴充、匯出）、整合情境。不要五個場景都是同一功能換顏色。
4. **對比式呈現**：參數類場景盡量「同畫面並排不同設定」或提供 `ctx.group`／`ctx.slider` 即時切換，讀者不用讀程式碼就看得出差別。畫面上用小標籤標出參數值。
5. **最後一個場景固定 `title: "極限測試"`、`kind: "stress"`**，二選一：
   - `ctx.ramp(...)`：持續動畫或渲染類（數量越多越卡），逐級加量直到 FPS 低於門檻。
   - `ctx.bench(...)`：一次性運算類（解析、格式化、排序、壓縮、產生檔案），逐級加大資料量計時。
   - `note` 說明在測什麼、瓶頸在哪、哪些開關會影響結果。不寫具體的「標準答案」數字。
6. 純 UI 元件類（日期選擇器、對話框、通知）沒有明顯的 FPS 壓力時，極限測試改測「一次建立 N 個實例」或「N 筆選項／資料」的 `ctx.bench` 耗時。
7. 文件型工具（表格、編輯器、行事曆）場景物件加 `paper: true` 改用淺色底。

## 4. ctx API（showcase.js）

每個場景的 `mount(ctx)` 收到新的 `ctx.el`（`section.sc-scene`，絕對定位填滿舞台）。切換場景時，所有透過 ctx 註冊的東西自動清掉。

| 類別 | API |
|---|---|
| DOM | `ctx.el`、`ctx.$(sel)`、`ctx.$$(sel)`、`ctx.html(str)`（**覆寫 innerHTML，必須在建立控制項之前呼叫**） |
| 清理 | `ctx.onCleanup(fn)`：銷毀圖表、引擎、WebGL context、Worker、物件 URL 等**一律註冊在這裡** |
| 事件與計時 | `ctx.on(target, type, fn, opts)`、`ctx.raf((t, dt) => {})` 回傳 stop、`ctx.timeout`、`ctx.interval`、`await ctx.sleep(ms)`、`await ctx.frame(n)` |
| 尺寸 | `ctx.size()` 回傳 `{ width, height }`、`ctx.onResize(({ width, height }) => {})`（已節流） |
| 控制列（右上） | `ctx.button(label, fn, { primary })`、`ctx.toggle(label, value, fn(v))`、`ctx.group(labels, index, fn(i, label))`、`ctx.slider(label, { min, max, step, value, format }, fn(v))`、`ctx.select(label, options, value, fn)`；`ctx.controls.classList.add("bottom")` 改放右下 |
| 狀態 | `ctx.status(text)` 回傳 `{ text, progress(0~1), error, done }`；`await ctx.gate({ icon, title, desc, tags, button })` 啟動閘門 |
| 量測 | `ctx.fps({ position: "right bottom", extra: () => ({ 物件: n }) })` 小型 FPS 面板 |
| 加壓 | `ctx.ramp({ label, unit, steps, apply(n), minFps: 30, metrics: () => ({}), note })` |
| 計時 | `ctx.bench({ label, unit, sizes, prepare(n), run(n, data), target: 1000, budget: 2000, note })`；`run` 可回傳一段字串顯示在結果列 |
| 載入 | `await ctx.load(url 或 [urls])`、`await ctx.css(href)`：跨場景快取，只下載一次 |
| 工具 | `Showcase.fmt(n)`、`Showcase.fmtCompact(n)`（1.2 萬）、`Showcase.fmtMs(ms)`、`Showcase.h(tag, attrs, ...kids)` |

### 版面與尺寸（最常出錯的地方）

- 示範在 iframe 裡，舞台約 340～1280 px 寬、300～700 px 高。驗證會跑三種尺寸：桌面 1280×800、示範台 600×420、手機 360×560。
- 控制列浮在右上角。內容容器要避開它：
  ```css
  .board { position: absolute; inset: 0; padding: calc(var(--sc-ctl-h, 0px) + 10px) 10px calc(var(--sc-ctl-b, 0px) + 10px); }
  ```
  `--sc-ctl-h`／`--sc-ctl-b` 由 showcase.js 依控制列高度自動設定（非同步）。若在 JS 裡同步需要控制列高度（例如 Canvas 場景決定起始 y），用 `ctx.controls.offsetHeight + 20`。
- Canvas 尺寸從 `ctx.size()` 取，`ctx.onResize` 重設；處理 `devicePixelRatio`（上限 2）。不要用 `window.innerWidth`。
- 場景不可出現整頁捲軸或橫向溢出。需要捲動的場景（ScrollTrigger、長清單）在 `ctx.el` 加 class `scroll`，或在場景內自建捲動容器。
- `ctx.ramp`／`ctx.bench` 面板固定在左側（寬 330 px，可收合）。極限測試的畫面在寬螢幕要讓出左側：`@media (min-width: 761px) { inset: 8px 8px 8px 350px }`，窄螢幕則全幅，控制列放 `bottom`。
- 底部 footer 會顯示 `api`、`desc`、`hint`，不需要在畫面上重複大段說明；畫面上只放必要的小標籤。

### 清理與穩定性

- 每個場景 mount 時從零建立，unmount 時完整銷毀：`chart.destroy()`、`renderer.dispose()` 與 `forceContextLoss()`、`engine.clear()`、`worker.terminate()`、`URL.revokeObjectURL()`。WebGL 類若沒釋放 context，切換八次就會耗盡。
- 不要在 `window` 上留全域監聽器，用 `ctx.on(window, ...)`。
- 非同步 mount（await 載入）之後若場景已被切走，ctx 會丟 AbortError，showcase 會自動忽略，不需要自己處理。
- **不用已棄用的 API**（console 會出 warning）；查該版本文件確認。console.error 會讓驗證 FAIL，console.warn 不會，但應盡量為零。

### 已知陷阱（前面批次踩過）

- 中文文字用 `var(--font)`；`var(--mono)` 只給數字與程式碼（數字欄可加 `font-variant-numeric: tabular-nums`）。
- `ctx.html()` 之後才建立 canvas 與控制項，否則會被清掉。
- 很多函式庫的 `destroy()`／`dispose()` 不會釋放 WebGL context，另外呼叫 `gl.getExtension("WEBGL_lose_context")?.loseContext()`。
- `demo.css` 已定義 `.bar .btn .controls .demo-gate .hint .mono .muted .panel .stage .status`，showcase.css 用 `.sc-` 前綴；自己的類名加 slug 縮寫前綴（如 `.tw-stage`），避免樣式互相污染。
- inline script 裡的字串若含 `</script>`，寫成 `<\/script>`，否則會提早截斷整段 script。

## 5. 點擊模式與重型資源

- 總下載量超過約 10 MB（AI 模型、wasm、FFmpeg、OpenCV）、需要權限（鏡頭、麥克風、MIDI、序列埠、XR）、或只能在 WebGPU 跑：`mode: "click"`。
- 重型函式庫不要放在 `<head>` 的 `<script>`，改在場景內：
  ```js
  async mount(ctx) {
    if (!window.HeavyLib) {
      await ctx.gate({ icon: "🧠", title: "載入模型", desc: "約 25 MB，按下後開始下載", tags: ["約 25 MB"] });
      const s = ctx.status("下載中…");
      await ctx.load("https://cdn.jsdelivr.net/npm/heavy@1.2.3/dist/heavy.min.js");
      s.done();
    }
    // ...
  }
  ```
  每個需要該資源的場景都用同樣的寫法（已載入就直接用，不重複出現閘門）。
- 會發聲的示範：聲音由場景內的按鈕觸發（瀏覽器要求使用者手勢），`needs` 填 `"audio"`。
- 不支援的功能（WebGPU、MIDI、XR）要在場景內顯示清楚的繁中說明，不可只丟錯誤。

## 6. CDN 與版本

- 優先 `https://cdn.jsdelivr.net/npm/<pkg>@<exact-version>/<file>`，其次 unpkg、cdnjs、esm.sh。**版本號寫死到 patch**，沿用原檔版本；若要升級先確認新版 API。
- 查版本：`curl -s "https://data.jsdelivr.com/v1/packages/npm/<pkg>/resolved?specifier=latest"`；查檔案清單：`curl -s "https://data.jsdelivr.com/v1/packages/npm/<pkg>@<ver>?structure=flat"`。
- ESM-only 套件：`<script type="module">` 搭配 `https://cdn.jsdelivr.net/npm/<pkg>@<ver>/+esm`。此時 `showcase.js` 照常用一般 `<script>` 載入，`Showcase.run` 寫在 module 裡。
- 外部資源只用穩定來源：CDN、官方範例素材（需 CORS）、OpenStreetMap／OpenFreeMap／CARTO 底圖、Hugging Face 模型、Google 官方模型儲存。
- 共用素材：`_shared/img/photo-1.jpg`～`photo-8.jpg`（1200×800：1 峽灣、2 紅岩峽谷、3 綠色山谷公路、4 披毯巴哥犬、5 瀑布彩虹、6 藍底水母、7 母獅特寫、8 海象群）、`_shared/img/panorama.jpg`（4096×2048 等距長方投影全景）、`_shared/models/robot.glb`（有動畫）、`_shared/audio/loop.mp3`（19 秒電子樂循環）。

## 7. 品質標準

1. **真的呼叫該函式庫**，不可手寫程式假裝函式庫輸出。某個能力無法在單檔示範時，換一個能力，不要做假的。
2. **畫面要好看**：預設深色底，用 `--c1`～`--c6`、`--accent`（JS 黃）配色；文件型用 `paper: true`。按鈕一律用 ctx 控制項或 `.btn`。
3. **3 秒內看到效果**（auto 模式的每個場景）。
4. **文字**：畫面所有文字用繁體中文（台灣用語）；程式碼註解用英文。範例資料用台灣情境（縣市、月份、課程、捷運站等），可能被誤認為真實數據的圖表標「示意資料」。
5. **標點禁令**：任何文字（含程式碼註解）**不可使用長破折號（em dash，單個或連續兩個）**，寫檔 hook 會擋下。用「，」「：」「（）」「、」替代。
6. **不碰其他檔案**：只改自己分組的 `demos/<slug>.html` 與 `demos/assets/<slug>/`。不改 `_shared`、`scripts`、`assets`、`index.html`，不執行 git，不啟動背景伺服器，不安裝套件。
7. 檔案長度約 300～700 行；共用的小工具函式寫在檔案頂部，避免場景間複製貼上。

## 8. 驗證（每個示範都要做，修到全部 OK）

```bash
cd "C:/Users/user/Documents/JS/js-tools-atlas"
PYTHONIOENCODING=utf-8 python scripts/verify_demos.py slug1 slug2 --scenes --narrow --stage --stress 6 --wait 2.5
# click 模式加 --start（自動按下閘門）並拉長 --wait
python scripts/sheet.py slug1            # -> scripts/_shots/slug1-sheet.jpg（桌面，所有場景）
python scripts/sheet.py slug1 -stage     # 600x420
python scripts/sheet.py slug1 -narrow    # 360x560
```

- 驗證腳本會逐一切換場景，檢查 console error、pageerror、HTTP 錯誤、場景錯誤卡、橫向溢出、內容被裁切、疑似空白畫面；`--stress 6` 會按下極限測試的「自動加壓」或「開始測試」並跑 6 秒。只看指定場景可加 `--only 3,5`。
- **一定要用 Read 打開三張 sheet 親眼確認**：每個場景都有內容、文字沒被控制列或 footer 擋住、窄螢幕不破版、極限測試有數字。發現問題修完再驗證一次。
- 無頭 Chromium 使用軟體繪圖（SwiftShader），FPS 偏低屬正常，不要為了讓無頭環境 FPS 好看而縮小測試級距。
- 無頭環境沒有 WebGPU、真實 MIDI／序列埠／XR；這類場景至少確認閘門與「不支援」提示正常。

## 9. 回報格式（最後一則訊息，30 行內）

```
slug | 場景數 | mode | 驗證結果 | 極限測試量什麼
...
問題與限制：（沒有就寫「無」）
```
