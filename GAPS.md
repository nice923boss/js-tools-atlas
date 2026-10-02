# 已知限制與落差登記

這份清單記錄網站目前沒有做到、沒有實測，或受函式庫本身限制的地方。上架前請先看過，必要時在 GitHub 的 repository 說明中一併揭露。

欄位說明：

- **補完時點**：預計什麼時候處理。「不處理」表示是設計上的取捨或上游函式庫的行為。
- **責任人**：「維護者」指網站維護者（黃政文）；「上游」指函式庫作者。

## 1. 驗證範圍

| 項目 | 原因 | 影響 | 補完時點 | 責任人 |
|------|------|------|----------|--------|
| 只在無頭 Chromium 驗證，沒有測 Safari、Firefox、實體手機與實體 GPU | 製作環境是 Playwright 無頭 Chromium，WebGL 用 SwiftShader 軟體繪圖，鏡頭與麥克風是假裝置 | 其他瀏覽器或手機可能出現版面差異、效能差異或功能不支援 | 上架後用實機抽檢，至少 iPhone Safari、Android Chrome、桌面 Firefox 各一次 | 維護者 |
| 音效類示範沒有人耳試聽 | 驗證環境無法播放與聆聽聲音，只檢查了樣本資料、波形與錯誤訊息 | 音色、音量、雜音是否合適未確認 | 上架前用耳機試聽 zzfx、jsfxr、tonejs、howlerjs、pizzicatojs、wavesurferjs、p5sound、strudel、gibber、magentajs 等音訊示範 | 維護者 |
| 所有示範從公開 CDN 載入函式庫 | 站內沒有打包函式庫，示範頁用 jsDelivr、unpkg 等 CDN | 離線、公司防火牆擋 CDN、CDN 故障時示範無法執行 | 不處理（若要離線使用，需要把函式庫下載到 `demos/_vendor/` 並改寫網址） | 維護者 |
| 縮圖是無頭環境截圖 | 縮圖由 `scripts/verify_demos.py --thumbs` 產生 | 用到鏡頭的示範縮圖停在「按此開始」畫面，因為假鏡頭只有綠色測試畫面 | 不處理 | 維護者 |

## 2. 需要特殊硬體或環境，功能沒有實測

| 項目 | 原因 | 影響 | 補完時點 | 責任人 |
|------|------|------|----------|--------|
| WebLLM 推論沒有實測 | 無頭 Chromium 拿不到 WebGPU adapter，聊天流程只用假的 web-llm 模組驗證 | 真實下載模型（SmolLM2-360M，約 213 MB）與推論可能有未知問題；模型以英文為主，中文回答品質差 | 上架後用有獨立顯卡的電腦實測一次 | 維護者 |
| p5.webserial 沒有接實體序列裝置 | 驗證環境沒有 Arduino 等裝置，連線路徑用虛擬 SerialPort 測 | 真機連線、斷線、資料格式可能有差異 | 有裝置時實測 | 維護者 |
| Teachable Machine 辨識準確度未驗證 | 假鏡頭畫面固定，無法訓練出有意義的分類 | 實際辨識效果未知；tfjs 鎖在 1.3.1（套件的 peer 依賴） | 上架後用真鏡頭實測 | 維護者 |
| ml5.js 數手指是啟發式判斷 | 用關節點角度推算伸直的手指 | 手勢角度特殊時可能數錯；模型從 tfhub 轉址到 kaggle 下載，轉址失效時無法載入 | 不處理 | 維護者 |
| GPU.js 比賽結果在軟體繪圖下 CPU 比較快 | SwiftShader 是軟體模擬的 WebGL | 驗證截圖顯示 CPU 勝出；頁面會偵測軟體繪圖器並說明原因，實體 GPU 上應為 GPU 勝出（未實測） | 上架後用實體 GPU 確認 | 維護者 |
| MediaPipe、Human、MindAR、AR.js、OpenCV.js 的鏡頭模式沒有用真人實測 | 假鏡頭只有綠色測試畫面，偵測不到人臉、手、身體或標記 | 偵測結果只用範例照片（MediaPipe、Human、MindAR 臉部）與電腦繪製的模擬畫面（AR.js、MindAR 圖片追蹤）驗證；真鏡頭下的速度、準確度與光線影響未確認 | 上架後用真鏡頭實測，AR.js 另需印出 Hiro 標記 | 維護者 |
| WebXR 沉浸模式沒有在頭戴裝置或手機上測試 | 驗證環境沒有 XR 裝置，只用 Immersive Web Emulator 模擬器測過進入與離開沉浸模式 | Quest、Android Chrome 上的實際畫面、手把操作與效能未確認；沒有 XR 裝置時頁面以內嵌 3D 畫面呈現 | 有裝置時實測 | 維護者 |

## 3. 函式庫本身的問題

| 項目 | 原因 | 影響 | 補完時點 | 責任人 |
|------|------|------|----------|--------|
| jsfxr 1.4.1 在包絡長度為 0 時輸出 NaN 樣本 | 函式庫用 0 當除數（例如「純音」的衰減為 0，每次都會發生；其他產生器偶爾發生） | 示範頁已把 NaN 換成 0 再畫圖與播放；使用者直接呼叫 `sfxr.play()` 仍會拿到一個 NaN 樣本 | 不處理 | 上游 |
| jsfxr 的 b58 代碼不含取樣率 | 函式庫的編碼格式設計 | 調過取樣率的音效，複製出來的 `sfxr.play("…")` 會用 44.1 kHz 播放 | 不處理 | 上游 |
| wordcloud2.js 1.2.3 的 shrinkToFit 可能無限遞迴 | 字放不下時以 3/4 權重重試，直到字級為 0 才停；設定最小字級時永遠到不了 0 | 示範頁已在權重函式加截止條件；照搬設定的使用者可能遇到「Maximum call stack size exceeded」 | 不處理 | 上游 |
| ammo.js 鎖在 commit 79190a1f | 最新 commit c8779e6 的建置沒有匯出 `_free` | 無法跟著上游更新 | 上游修正後再升級 | 上游 |
| Gibber 需要兩個 shim | 套件缺陷（`Array.prototype.addPattern`、AudioWorklet 初始化競態） | 記憶體用量大（主執行緒與 worklet 各約 423 MB），低記憶體裝置可能卡頓 | 不處理 | 上游 |
| Quill 的 `getSemanticHTML()` 把空白轉成 `&nbsp;` | 函式庫行為 | 使用者自己打的空白，在 HTML 頁籤顯示成 `&nbsp;` | 不處理 | 上游 |
| MathJax 字型與無障礙模組需要網路 | 這些模組在需要時才從 jsDelivr 載入 | 第一次開啟要連得上網路 | 不處理 | 上游 |
| MindAR 1.2.5 需要舊版 three.js | MindAR 用到 three.js r162 移除的 `sRGBEncoding`，所以 three 鎖在 0.160.1 | 無法跟著 three.js 更新；主控台有 `outputEncoding` 棄用警告 | MindAR 更新後再升級 | 上游 |
| Human 的 MoveNet 對任何畫面都會回報一個身體 | 單人姿勢模型的設計，沒有人時也會輸出低分結果 | 示範頁只計入分數大於 0.4 的身體；分數在門檻附近時可能多算或漏算 | 不處理 | 上游 |
| 主控台警告 | heatmap.js 的 `willReadFrequently` 提示、bpmn-js 的 `ContextPad#getPad is deprecated`、Magenta 的 ScriptProcessorNode 棄用提示、GPU.js 與 Teachable Machine 的 ReadPixels 提示、AR.js 的 ARToolKit 資訊訊息與 `willReadFrequently` 提示 | 只是警告，不影響功能 | 不處理 | 上游 |
| MediaPipe 與 MindAR 臉部模式用 `console.error` 印出一般訊息 | TFLite 的 WebAssembly 執行環境把「Created TensorFlow Lite XNNPACK delegate for CPU.」這行 INFO 訊息寫到 stderr | 主控台出現紅字，但不是錯誤；`scripts/verify_demos.py` 已忽略這一行 | 不處理 | 上游 |

## 4. 小螢幕上的取捨

| 項目 | 原因 | 影響 | 補完時點 | 責任人 |
|------|------|------|----------|--------|
| 部分示範在窄螢幕隱藏欄位或工具 | 360 px 寬放不下完整介面 | bpmn-js 隱藏工具盤（改用元素旁選單）；Tabulator 隱藏店長欄；Grid.js 隱藏評分欄；math.js 隱藏變數側欄；TimelineJS 隱藏頂部標題列 | 不處理 | 維護者 |
| 部分示範在窄螢幕縮小或需要捲動 | 同上 | frappe-gantt 只看得到前約 6 週；JointJS 組織圖縮到約 0.55 倍；jsfxr（760 px 以下）、zzfx（700 px 以下）改成可捲動版面，桌面示範台寬度不足時也會捲動 | 不處理 | 維護者 |
| 部分示範在窄螢幕隱藏或淡出左下角操作提示 | 單欄版面可捲動，內容會捲到固定在左下角的提示標籤底下 | 隱藏：MediaPipe、Human、MindAR、AR.js、OpenCV.js、Brain.js、deck.gl、MapLibre GL JS、docx、JsBarcode、jsPDF、PapaParse、pdf-lib、PptxGenJS、qr-code-styling、Preact、Video.js、Tesseract.js、Monaco Editor（Plyr 只在高度 460 px 以下隱藏）；8 秒後淡出：FileSaver.js、Lodash、Mediabunny、ONNX Runtime Web、SheetJS、TensorFlow.js、Tailwind CSS、Howler.js、compromise、Splitting.js，PDF.js、Masonry、Rough Notation、markmap 在所有尺寸都淡出。淡出前的 8 秒內，提示會蓋住部分內容（提示不攔截點擊），例如 ONNX Runtime Web 在 360 px 寬時蓋住「清除」「隨機範例」按鈕的下緣、Howler.js 在主站示範台尺寸蓋住兩個切片按鈕、Rough Notation 蓋住文末的小提醒段落 | 不處理 | 維護者 |
| Editor.js 窄螢幕浮動工具列會壓到下一個區塊 | 函式庫原生行為 | 視覺重疊，不影響操作 | 不處理 | 上游 |
| xterm.js 方塊字橫幅有細縫 | 字型行高 | 純視覺 | 不處理 | 上游 |

## 5. 內容範圍

| 項目 | 原因 | 影響 | 補完時點 | 責任人 |
|------|------|------|----------|--------|
| 68 個非 ★★★ 工具沒有內嵌示範 | ★★ 需要 npm 建置或特定框架；★ 需要 API 金鑰、帳號、付費授權或後端伺服器，無法單檔加 CDN 執行 | 示範台改為說明為什麼沒有示範，並提供官方範例、官網與 GitHub 連結 | 不處理（設計範圍） | 維護者 |
| GitHub 星數與最後更新日期是 2026-10-01 的資料 | 資料來自 Excel，不會自動更新 | 時間久了數字會過時 | 需要時更新 Excel 後執行 `python scripts/build_data.py` | 維護者 |
| 頁首 GitHub 連結是假設值 | `index.html` 第 42 行預設為 `https://github.com/nice923boss/js-tools-atlas` | 帳號或 repository 名稱不同時連結會錯 | 上架前修改 | 維護者 |
| 音效示範點擊前不出聲 | 瀏覽器自動播放政策 | zzfx、jsfxr 的自動模式只輪播畫面，按任一按鈕後才有聲音 | 不處理 | 維護者 |
| math.js 錯誤訊息只翻譯常見類型 | 函式庫錯誤訊息種類很多 | 少見錯誤顯示成「無法計算（英文原文）」 | 不處理 | 維護者 |
