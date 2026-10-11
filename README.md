# JS 工具圖鑑（JavaScript Tools Atlas）

整理可搭配 Claude 產生網頁作品的 JavaScript 函式庫清單。單檔 HTML 就能執行的工具（★★★）附上真實載入函式庫的互動示範，清單旁的示範台可以直接操作、看原始碼、複製提示詞。

純靜態網站，不需要建置步驟，資料夾整個放上 GitHub Pages 就能用。

## 部署到 GitHub Pages

1. 在 GitHub 建立 repository（例如 `js-tools-atlas`），設為 Public。
2. 把本資料夾的**內容**放到 repository 根目錄（`index.html` 要在最上層）。
   - 建議用 Git 或 GitHub Desktop 推上去。網頁上傳一次最多 100 個檔案，本站超過這個數量，網頁上傳要分批。
   - `scripts/_shots/` 是驗證截圖（已列在 `.gitignore`），用 Git 推送會自動略過；用網頁上傳時不要選這個資料夾。
3. repository 的 Settings → Pages → Build and deployment：Source 選「Deploy from a branch」，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
4. 一兩分鐘後網址會是 `https://<帳號>.github.io/<repository 名稱>/`。
5. 頁首右上角的 GitHub 圖示連到 `index.html` 第 42 行的網址，帳號或 repository 名稱不同時記得改。

`.nojekyll` 要一起上傳，避免 GitHub Pages 用 Jekyll 處理檔案。

## 本機預覽

主程式是 ES module，直接雙擊 `index.html`（file://）時瀏覽器會擋下腳本，清單是空的。請開本機伺服器：

- Windows：雙擊 `start-server.bat`。它在 8765 埠開伺服器（只接受本機連線）並自動開瀏覽器，關掉視窗即停止；埠已在使用中時直接開瀏覽器。需要已安裝 Python 3 並加入 PATH。
- 其他系統：

  ```bash
  python -m http.server 8765 --bind 127.0.0.1
  ```

  然後開 `http://localhost:8765/`。

## 網址

| 網址 | 內容 |
|------|------|
| `#/` | 工具清單與示範台 |
| `#/tool/<slug>` | 直接開某個工具，例如 `#/tool/threejs` |
| `#/recipes` | 組合配方 |
| `#/platforms` | 靈感平台 |
| `#/stats` | 分類統計 |
| `#/about` | 說明與圖例 |

## 目錄結構

```
index.html              主頁
start-server.bat        Windows 本機預覽伺服器
assets/
  app.js app.css        清單、篩選、路由
  stage.js              右側示範台
  views.js              配方、平台、統計、說明頁
  util.js               圖示與共用函式
  data.js               由 Excel 產生的資料（不要手改）
  js-tools-list.xlsx    資料來源，頁首可下載
  thumbs/<slug>.webp    清單縮圖，由驗證截圖產生
demos/
  <slug>.html           每個工具一個示範頁（多場景，最後一個場景是極限測試）
  assets/<slug>/        個別示範用到的素材
  _shared/              共用樣式、閘門腳本、showcase.js（場景頁籤與極限測試面板）、圖片、3D 模型、音樂
scripts/
  build_data.py         Excel 轉 data.js
  verify_demos.py       無頭 Chromium 檢查示範並產生縮圖
  DEMO_GUIDE.md         示範製作規範
```

## 更新資料

需要 Python 3、`openpyxl`、`pillow`、`playwright`（第一次執行 `python -m playwright install chromium`）。

1. 編輯 `assets/js-tools-list.xlsx`（或另一份同格式的檔案）。
2. 產生資料：`python scripts/build_data.py`（或 `python scripts/build_data.py 路徑/清單.xlsx`）。
3. 新增示範：照 `scripts/DEMO_GUIDE.md` 建立 `demos/<slug>.html`，slug 規則與清單一致（去掉全形括號內容、轉小寫、去掉句點，其餘非英數字元改成 `-`）。
4. 檢查示範並更新縮圖：

   ```bash
   python scripts/verify_demos.py <slug> --scenes --narrow --stage --stress 6 --thumbs
   ```

   `--scenes` 逐一切換每個場景檢查，`--stress 6` 在極限測試場景按「開始測試」並跑 6 秒。全部重跑用 `--all`。需要按鈕啟動的示範加 `--start` 可截到啟動後的畫面。
5. 再跑一次 `python scripts/build_data.py`，讓清單知道哪些工具有縮圖。

## 已知限制

見 [GAPS.md](GAPS.md)。
