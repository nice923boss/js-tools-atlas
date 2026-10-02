# 示範頁製作規範（Demo Guide）

JS 工具圖鑑（js-tools-atlas）是一個 GitHub Pages 靜態網站：左側列出 328 個 JavaScript 工具，右側「示範台」用 iframe 載入 `demos/<slug>.html`，讓讀者一邊看清單，一邊看到該工具真正跑起來的效果。每個 ★★★（單檔 HTML 加 CDN 即可執行）工具都有一個示範頁。

## 1. 檔案與位置

- 每個工具一個檔案：`demos/<slug>.html`，slug 由分組清單提供，**檔名必須完全一致**。
- 共用檔（只讀，不可修改）：`demos/_shared/demo.css`、`demos/_shared/gate.js`、`demos/_shared/img/*`、`demos/_shared/models/robot.glb`、`demos/_shared/audio/loop.mp3`。
- 某個示範需要額外檔案（子頁面、資料檔、字型）時，放在 `demos/assets/<slug>/`，單檔不超過 1.5 MB，只用自製、CC0、MIT 等可公開散布的素材。
- 參考範例：`demos/p5js.html`（已完成，可對照格式）。

## 2. 頁面骨架

```html
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>工具名 示範：一句話主題</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="_shared/demo.css">
<script type="application/json" id="demo-meta">{"mode":"auto"}</script>
<style>/* demo-specific styles */</style>
</head>
<body>            <!-- 文件型工具（表格、編輯器、行事曆、文件）用 <body class="paper"> 淺色底 -->
  ...
  <div class="hint">一句操作提示</div>
  <script src="https://cdn.jsdelivr.net/npm/<pkg>@<exact-version>/..."></script>
  <script>/* demo code, comments in English */</script>
</body>
</html>
```

### demo-meta（主頁會讀取，必填）

| 欄位 | 值 | 說明 |
|---|---|---|
| `mode` | `"auto"` 或 `"click"` | auto：載入即呈現。click：先顯示啟動閘門，按下才載入 |
| `needs` | 陣列，可省略 | `camera`、`mic`、`audio`（會發出聲音）、`midi`、`serial`、`xr`、`webgpu` |
| `size` | 字串，可省略 | 大量下載時填，例如 `"約 30 MB"` |
| `note` | 字串，可省略 | 給讀者的一句繁中補充，例如 `"沒有 MIDI 裝置時可用螢幕鍵盤"` |

### 何時用 click 模式

- 總下載量超過約 10 MB（AI 模型、wasm 大檔、FFmpeg、OpenCV 等）。
- 需要權限：鏡頭、麥克風、MIDI、序列埠、XR。
- 僅 WebGPU 可跑。
- 用法：`await demoGate({ icon: "🎤", title: "麥克風頻譜", desc: "按下後會請求麥克風權限", tags: ["需要麥克風", "約 2 MB"] });` 之後才載入函式庫或開始執行。重的函式庫請在閘門之後用動態 `import()` 或動態插入 `<script>` 載入，閘門前不要先下載。
- 載入過程用 `const s = demoStatus("下載模型中…"); s.progress(0.5); s.done();` 顯示進度，失敗用 `s.error("說明")`。

### 會發聲的示範

瀏覽器要求使用者互動後才能播放聲音。畫面可以自動呈現（mode 仍可為 auto），但聲音由示範內的「播放」按鈕觸發，needs 填 `"audio"`。

## 3. CDN 與版本

- 優先 `https://cdn.jsdelivr.net/npm/<pkg>@<exact-version>/<file>`，其次 unpkg、cdnjs、esm.sh。
- **版本號寫死到 patch**。查最新版：`curl -s "https://data.jsdelivr.com/v1/packages/npm/<pkg>/resolved?specifier=latest"`；查檔案清單：`curl -s "https://data.jsdelivr.com/v1/packages/npm/<pkg>@<ver>?structure=flat"`。
- 用最新穩定主版本（例如 p5 2.x、three 0.18x）。ESM-only 套件用 `<script type="module">` 搭配 `https://cdn.jsdelivr.net/npm/<pkg>@<ver>/+esm` 或 import map。
- 需要額外 CSS 的套件（Swiper、flatpickr 等）同樣從 CDN 載入並鎖版本。
- 外部資源只用穩定來源：CDN、官方範例素材（需支援 CORS）、OpenStreetMap／OpenFreeMap／CARTO 底圖、Hugging Face 模型、Google 官方模型儲存。不要用隨機圖床。
- 圖片優先用共用素材：`_shared/img/photo-1.jpg` 到 `photo-8.jpg`（1200×800：1 峽灣、2 紅岩峽谷、3 綠色山谷公路、4 披毯巴哥犬、5 瀑布彩虹、6 藍底水母、7 母獅特寫、8 海象群）、`_shared/img/panorama.jpg`（4096×2048 等距長方投影 360 全景，威尼斯海濱夕陽）、`_shared/models/robot.glb`（three.js RobotExpressive，有動畫）、`_shared/audio/loop.mp3`（19 秒自製電子樂循環）。

## 4. 品質標準

1. **真的呼叫該函式庫**。不能用手寫程式假裝函式庫的輸出。做不出真實示範時，不建立檔案，在回報中說明原因。
2. **展示招牌能力**：對準 Excel「可做出的效果／典型應用」，不要只是 Hello World。例：Matter.js 讓「歡迎光臨」每個字變成物理方塊掉落堆疊、可拖曳丟擲。
3. **畫面要好看**：想像它是作品集縮圖。預設深色底，用 `--c1`～`--c6`、`--accent`（JS 黃）配色；文件型工具用 `body.paper`。不要預設瀏覽器樣式的醜按鈕，用 `.btn`、`.btn.primary`、`.panel`。
4. **可互動**：自然適合互動的就加（拖曳、hover、按鈕切換參數），並用 `.hint` 一句話告訴讀者怎麼玩。控制鈕放 `.controls`（右上）。
5. **尺寸**：示範在 iframe 裡，寬約 340～960 px、高約 420～600 px。整頁不可出現捲軸（body 預設 overflow hidden）；捲動類工具（ScrollTrigger、AOS、Lenis 等）在頁面內做自己的捲動容器，或加 `<body class="scroll">` 讓頁面本身捲動並在開頭提示「往下捲」。視窗縮放時要重新排版（監聽 resize 或用 CSS）。
6. **輕量**：auto 模式頁面 3 秒內要看到效果。
7. **文字**：畫面上所有文字用繁體中文（台灣用語）；程式碼註解用英文。範例資料用台灣情境（縣市、月份、課程等），可能被誤認為真實數據的圖表標「示意資料」。
8. **標點禁令**：任何文字都**不可使用長破折號（em dash，單個或連續兩個）**，寫檔 hook 會擋下。用「，」「：」「（）」「、」替代。
9. **不碰其他檔案**：只建立／修改自己分組的 `demos/<slug>.html` 與 `demos/assets/<slug>/`。不改 `_shared`、`scripts`、`index.html`，不執行 git，不啟動背景伺服器。

## 5. 驗證（每個示範都要做）

```bash
cd "C:/Users/user/Downloads/JS/js-tools-atlas"
PYTHONIOENCODING=utf-8 python scripts/verify_demos.py slug1 slug2 slug3 --narrow
PYTHONIOENCODING=utf-8 python scripts/verify_demos.py gated-slug --start --wait 8   # click 模式：按下閘門後再檢查
```

- 腳本會自帶本機伺服器，用無頭 Chromium（支援 WebGL，以假鏡頭／假麥克風代替硬體）載入頁面，回報 console error、pageerror、HTTP 4xx/5xx、橫向溢出、疑似空白畫面，並存截圖到 `scripts/_shots/<slug>.png`（`--narrow` 另存 `<slug>-narrow.png`，360×560）。
- **一定要用 Read 工具打開截圖親眼確認**畫面正確、好看、沒有破版。FAIL 要修到 OK；確定是無害的訊息（例如第三方套件的已知警告）要在回報中說明。
- 無頭環境沒有 WebGPU、沒有真實 MIDI／序列埠／XR；這類示範至少確認閘門與「不支援時的提示」正常顯示。

## 6. 回報格式（最後一則訊息，30 行內）

```
slug | mode | 驗證結果 | 示範內容一句話
...
問題與限制：（沒有就寫「無」）
```
