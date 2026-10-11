# 示範頁「多場景＋極限測試」升級進度

這份檔案記錄「多場景＋極限測試」升級的進度與各批發現的問題。製作規範在 `scripts/DEMO_GUIDE.md`。

## 1. 進度

- 共 79 批（每批 2～4 個 slug），全部完成，260 個示範頁都已改成 `Showcase.run` 版本。
- 每批由子代理跑 `verify_demos.py --scenes --narrow --stage --stress 6`，並親眼看過三張 sheet 圖。
- 收尾時全站重跑一次 `--all --scenes --narrow --stage --thumbs --start --stress 4`，結果見下方第 4 節最後一段。
- 檢查某頁是否已升級：`grep -l "Showcase.run" demos/*.html`（docx、prism 的場景拆到 `demos/assets/<slug>/scenes.js`，要另外搜那裡）。

## 2. 子代理提示範本

每批一個背景子代理，同時跑約 10 個。`<slugs>` 換成該批 slug，「這組提示」寫各函式庫的主要能力與極限測試構想；點擊模式與 WebGL 的批次加上對應提醒。

```
你是 js-tools-atlas 示範頁升級工作的子代理。專案根目錄：C:/Users/user/Documents/JS/js-tools-atlas（GitHub Pages 靜態網站，無 git，Windows，Bash 可用，Python + Playwright 已安裝）。

任務：把以下示範頁升級成「多場景＋極限測試」版本：<slugs>
（每個檔案是 demos/<slug>.html，直接覆寫）

步驟：
1. 先完整讀 scripts/DEMO_GUIDE.md（製作規範，必須遵守），再完整讀兩個參考範本 demos/chartjs.html、demos/matterjs.html，以及 demos/_shared/showcase.js 的開頭註解與 ctx 實作（約第 1~330 行），確認 API。
2. 對每個 slug：
   a. 讀原本的 demos/<slug>.html，記下函式庫版本與招牌示範（場景 1 要移植並改良）。
   b. 對照該函式庫該版本的官方文件或 README 確認主要功能與正確 API，規劃 5~8 個場景，最後一個是「極限測試」（kind:"stress"，用 ctx.ramp 或 ctx.bench）。
   c. 覆寫 demos/<slug>.html。
   d. 依 DEMO_GUIDE 第 8 節跑驗證（--scenes --narrow --stage --stress 6），並用 Read 打開三張 sheet 圖親眼確認，修到全部 OK。
3. 全部完成後，依 DEMO_GUIDE 第 9 節格式回報（30 行內）。

注意：
- 只碰自己的檔案（demos/<你的slug>.html 與 demos/assets/<你的slug>/）；不改 _shared、scripts、assets、index.html，不刪除其他檔案。
- verify_demos.py 每次用隨機埠，可平行跑；不要加 --thumbs，不要跑 build_data.py，不要啟動背景伺服器，不要裝套件。
- 任何文字（含程式碼註解）不可出現 em dash（U+2014）。
- 含 `$` 的內容一律用 Write/Edit 工具寫，不用 Bash heredoc。
- 品質優先：每個場景要真的展示該函式庫不同的能力；某能力在單檔或無頭環境做不到，就換一個做得到的，不要做假的。
- 中文文字用 var(--font)，var(--mono) 只給數字與程式碼。先 ctx.html 再建立控制項或 canvas。自己的 CSS 類名加 slug 縮寫前綴。
- 這組提示：<各函式庫主要能力與極限測試構想>
```

## 3. 全部批次完成後的收尾步驟

1. 全站驗證：`PYTHONIOENCODING=utf-8 python scripts/verify_demos.py --all --scenes --narrow --stage --thumbs`
2. 重建資料：`python scripts/build_data.py`
3. 用瀏覽器預覽網站（`.claude/launch.json` 的 atlas，埠 8765），抽看各分類。
4. 確認沒有示範頁覆寫 `--mono` 字型（`app.css` 與 `demo.css` 已加中文備援字型）。
5. 共用 `.sc-lab` 極限測試面板在 760 px 以下會蓋住控制項與畫布（很多批次都回報）：考慮用 `--sc-ctl-b` 限制最大高度，或窄版自動收合。
6. `demo.css` 的 `.panel`、`.btn` 背景模糊在無頭環境很慢，評估是否拿掉。
7. 更新 `GAPS.md` 與 `README.md`（見下方「已知問題」）。

## 4. 已知問題（各批回報，收尾時處理或寫進 GAPS.md）

- 超過 800 行的檔案：pixijs 1224、easeljs 1208、fabricjs 1077、konvajs 973、opentypejs 903、marked 858、motion 852、scrollmagic 850、glslcanvas 1402，以及 babylonjs、three-vrm。
- 窄版：`.sc-lab` 蓋住控制項；部分示範的提示 toast 前 5 秒蓋住底部內容（easeljs 事件紀錄、太陽系土星標籤）。
- 無頭環境 FPS 只能相對比較（SwiftShader 軟體繪圖）；實體 GPU、XR、WebGPU、觸控、聲音播放都沒有實測。
- easeljs：hit canvas 改成 1x1 OffscreenCanvas，繞過 SwiftShader 讀回舊像素造成點錯物件的問題；實體 GPU 的 Chrome 是否也有此問題未驗證。
- hydra 場景 7 的軌跡點有時被程式碼框蓋住；simplex-noise「平滑亂數」場景速度調整後沒有重看。
- motion 手勢場景在閒置時用計時器示範。
- scrollama、rellax 場景跑在 srcdoc iframe；AOS 場景 6 用 v3 beta。
- scrolltrigger、lenis、locomotive-scroll 在中斷續跑後沒有重看 sheet（檔案未變）。
- blotterjs 共用一個全域 WebGL context，切場景只釋放材質。
- marked 本身不做 XSS 過濾，所有預覽都經過 DOMPurify。
- fireworks-js 音效檔來自官方 CDN，播放未實測。
- hover-effect 每個實例印一行主控台訊息（函式庫行為）；cursor-effects 在示範頁內修補了 3 個函式庫錯誤。
- trianglify 是 GPLv3 授權。
- proton WebGLRenderer 用 experimental-webgl，不支援時跳 alert；每顆粒子一次 draw call，主控台有 willReadFrequently 與 GPU stall 警告（函式庫內部）。particlesjs 超過 2000 顆自動暫停連線。
- observable-plot 地圖場景從 CDN 載入 world-atlas 與 topojson；vega-lite 主控台有「Conflicting legend property」警告；ApexCharts 標註要等進場動畫結束才畫。
- plotlyjs 地圖場景從 CDN 載入 CARTO 圖磚與 taiwan-atlas；底圖載入提示用私有屬性 `_fullLayout.map._subplot.map` 判斷；動畫場景用 `unhandledrejection` 擋掉 Plotly 播放中斷時的空 rejection（離開場景解除）。
- vanta BIRDS 在窄版有 three.js 棄用警告；model-viewer 有函式庫警告。
- 示範頁內繞過的函式庫錯誤：cursor-effects destroy 洩漏、fireworks-js 指標位移、js-confetti clearCanvas 不 resolve、granim changeState 迴圈、trianglify 數字 seed 被忽略、fitty multiLine 重算、scenejs clone 與 easing、locomotive-scroll splice、ScrollMagic offset 覆寫、parallax `depth-y="0"`、rough-notation 移除後 `isShowing`。
- ammojs：WASM 堆積固定 64 MB，極限上限 3000；`btVehicleTuning` 是不可刪除的全域物件。joltphysicsjs：用單執行緒版（多執行緒需 COOP／COEP 標頭），軟體之間不互撞；場景 4 窄版「陡坡 55°」標籤被切、stage 版「旋轉平台」標籤壓圖例（未修）。
- threejs.html 可能有 Timer 負 dt 問題（ammo 批次回報，收尾時檢查）。
- mermaid 桑基圖標籤只能用英文；極限測試調高連線數上限。markmap 的 KaTeX 與 highlight.js 用到時才從 CDN 載入。mind-elixir 節點備註在此版本畫不出來（未示範）、純文字匯出會遺失摘要範圍（設為唯讀）、純文字轉換器從 CDN 動態載入（離線不可用）。
- antv-g2 5.4.8 散佈約 4 萬點 render 會 stack overflow（極限上限設 3 萬）；容器尺寸改變會清掉篩選結果；stage 版 gauge 百分比壓到指針軸心。billboardjs 多層儀表數值接近時標籤重疊；Canvas 模組首次切換才從 jsDelivr 載入。
- countupjs smartEasingAmount 大於或等於門檻時停在原地（函式庫行為）。frappe-charts 場景 5 標記文字略壓折線、場景 7 窄版 x 軸標籤偏密。odometer 0.4.8 小數尾 0 不補、正轉負時負號延後出現、無 destroy()；滑動模式無 GPU 約 20～40 個就低於 30 FPS。
- gridjs 6.2.0：高負載時偶發「reading 'length'」主控台錯誤（兩次 pipeline 同時執行，函式庫問題，畫面最終正確，未修）；欄位 plugin 設定被丟掉、useSelector 舊狀態、節流 0 時重複排序、無虛擬捲動。DataTables 3 欄位選擇器需寫成 `:not(.x):visible`；360 px 下第 2、6、7 場景側欄只剩 132 px 高。
- vis-network forceAtlas2 持續漂移（加 12 秒穩定上限）；階層與形狀場景在 360 px 下字偏小。vis-timeline Graph2d 右軸無法指定上限（改自動縮放）；繞過 4 個函式庫行為（容器 position、子群組 treeLevel、銷毀前關 verticalScroll、setWindow 延後顯示）。
- wordcloud2 1.2.3 事件 preventDefault 無法中止排版（改用 abortThreshold）。heatmap.js 2.0.5 `configure()` 改 radius／blur 只影響新點（改重建實例）、value 0 存成 1。TimelineJS 3.9.13 的 document keydown 與 window resize 監聽無法移除（頁內攔截）、官方 zh-tw 語系不完整（改 Blob URL 自訂語系）、閏年重複年份刻度、窄版小時刻度場景群組標籤輕微重疊。
- 3d-force-graph 主控台有 three.js「Multiple instances」警告（函式庫）。antv-g6 銷毀後小地圖延遲重繪會報錯（先停佈局等 200 ms 再銷毀）；圖例與小地圖只依初始尺寸定位（CSS 固定）；「互動行為」場景高負載時 2.5 秒內佈局未完成。
- jointjs async 模式幾乎沒縮短最長卡頓，帶連線成本超線性。bpmn-js 場景 3 指標是示意資料。frappe-gantt 1.2.2 頁內繞過多個函式庫問題（無 destroy、update_options 重設刻度、共用刻度物件語系沿用、假日標籤只綁一次、update_task 重複綁 click、小時刻度以整天計算、show_expected_progress 有 bug），箭頭建立成本隨數量平方成長。
- vizjs：Graphviz WASM 用 Helvetica 估算中文字寬（中文框靠留白補）；無 GTS，sfdp prism 去重疊會退回並警告；主執行緒同步排版，大圖短暫凍結。nomnoml、vizjs 下載只點過按鈕未檢查檔案。
- CARTO 點陣圖磚現在疊「API KEY REQUIRED」浮水印（主代理實測確認）。turfjs 已改用 OSM 加暗色濾鏡；plotlyjs 地圖場景用 Plotly 內建 `carto-darkmatter-nolabels` 樣式，收尾時要檢查是否也受影響。
- antv-l7 2.29.1 `clampLow`／`clampHigh` 行為與文件相反；聚合 radius 單位不是螢幕 px；OpenFreeMap 圖磚在無頭環境載入慢（部分 sheet 底圖黑）；極限測試讓出左側的斷點改為 561 px（偏離 DEMO_GUIDE）。scratchpad 留有 `l7dl/` 原始碼下載資料夾。
- globegl、deckgl 改用 Esri 衛星／灰階圖磚與 OpenFreeMap 向量樣式（Esri 圖磚使用條款收尾時要確認並寫進 GAPS.md）。deckgl 用自訂 `nab://` 協定與 `getTileData` 讓圖磚請求不被中斷（避開驗證器的 ERR_ABORTED）；deck.gl 9.4.0 `metrics.bufferMemory` 恆為 0（改自算）；SwiftShader 下場景 7 預設點數降到 1 萬。globegl 有 three.js「Multiple instances」警告。deckgl 最後一行修改後只重跑 --scenes --narrow。
- openlayers 20 萬點從 WebGL 切 Canvas 在無頭環境卡數十秒（等 SwiftShader 釋放 context）；捲簾比較的 Natural Earth 暈渲在 zoom > 6 解析度不足。maplibre 冷快取時場景 1 底圖可能空白，3D 地形在 600x420 可能仍顯示「載入中」。
- wavesurferjs 極限測試只量繪圖。strudel 只用合成器音色，部分音效需 secure context（file:// 開啟不可用）。meyda 5.6.3：spectralFlux 會丟錯已排除；MeydaAnalyzer 用已淘汰的 ScriptProcessor 且 stop() 不斷開節點（頁面手動拆）；換 bufferSize 不重建色度濾波器（頁面自清）；loudness 未校正音壓與等響曲線；真實麥克風與聽感未驗證。
- tonejs UMD 載入即建 AudioContext（autoplay 警告），離線渲染無頭約 2.3 秒。howlerjs HTML5 模式不經 masterGain（場景 7 Analyser 為 0），混音器音量表為估算。p5sound 0.4.1 多個類別只剩空殼（SoundLoop、Part、MonoSynth、Filter、EQ、Compressor），`Amplitude.setInput()` 丟錯，無 dispose／currentTime，頁內補 shim；真實麥克風與拒絕權限未實測。
- swup 場景 4 在不支援 View Transitions 的瀏覽器只直接換內容（有說明文字）；場景 7 外部網域、新分頁、下載、PDF 連結只示範交還瀏覽器。swup sheet 由主代理目視確認。
- jsmind 約 1 萬節點以上 Canvas 引擎不畫連線，2 萬節點卡數秒。drawflow import 超線性。litegraphjs 改載完整 build（保留 37 型別中文化）、畫布未處理 DPR、壓測暫調單圖上限至 2 萬、JSON 錯誤訊息為瀏覽器英文。drawflow 1165 行、litegraphjs 1359 行，超過 800 行上限。
- rotjs、pathfindingjs 窄版偏擠，多單位不互相避讓，IDA* 大地圖顯示「未算」。zzfx 的 ZzFXM 從 jsDelivr GitHub CDN 載入，wav.js BlockAlign 與負值溢位有誤（頁面已標示）。jsfxr 多個函式庫缺陷（零長度包絡產生 NaN、mutate 讓 p_vib_delay 變 NaN、分享碼不含音量與取樣率、6 個 convert.units 換算錯誤等）頁面如實呈現；play()/toAudio() 不用（內部 AudioContext 無法關閉）。
- webllm：無頭環境沒有 WebGPU，只驗證了不支援畫面、偵測、模型目錄與快取掃描；載模型、串流聊天、OpenAI API、logprobs、bench、刪快取都未實測（要在有 WebGPU 的實機驗證）。onnx-runtime-web 場景 5 直方圖受 0.1 ms 計時精度限制（已加註）。
- butterchurn 極限測試在 SwiftShader 第一階就低於 30 FPS；magentajs 15 秒預算跑不到 256／512 步（模型總下載約 41 MB）。audiomotion 提示訊息遮說明文字、stage 寬度場景 5 被擠扁。音色與音樂性需人工試聽。
- compromise 少數動詞變化錯、dates 外掛解析有限、lexicon 全域生效。tesseractjs 辨識框碰右緣回傳空字串（框內收）、中文結果字間有空格。teachable-machine 官方 isTrained 對 2 層模型恆為 false（頁面自判）、PCA 與批次模式為自製（頁面已註明）、鏡頭模式未實測。
- OSMD 2.2.0 `setOptions({darkMode:false})` 關不掉深色背景（上色場景每次重建實例）；紙張格式只看長寬比（A5 已移除）。vexflow 1067 行超過 800 行上限。
- videojs 無頭 2 台即降到約 30 FPS（門檻設 24 FPS）。plyr 場景 1 拿掉 crossorigin（CDN 海報無 CORS），字幕改 fetch 轉 Blob。YouTube／Vimeo 嵌入需點擊，自動驗證未涵蓋。videojs 與 plyr 共用自製測試片 demos/assets/plyr/。
- tensorflowjs WebGL backend 全域共用。ml5js nn／sentiment 釋放後殘留 1~2 個 tensor，無頭首推論慢。transformersjs 英翻中模型約 120 MB 且輸出簡體、GitHub Pages 無跨來源隔離故 WASM 單執行緒、窄寬與舞台截圖時多數模型仍在下載、快取實測與清除快取按鈕未實點。
- gibber 原頁在 48 kHz 音高偏高約 147 音分（已強制 44100 Hz 修正）；melodicminor 內建表實為和聲小調（頁面已標）；gen()/Arp/wav 鼓組/Theory.tuning 單檔不可用已改場景。gibber 極限測試 FPS 判定不反映音訊上限，頁面另加音訊判定（約 64 聲部）。pizzicatojs 與 gibber 的限幅器為頁面自加；pizzicato 有 ScriptProcessor 棄用警告。webmidijs 未接實體裝置。
- hlsjs 直播為頁內模擬（自訂 loader 注入限速與錯誤）。html2canvas 1.4.1 的 box-shadow 與 foreignObjectRendering 在元素非原點時畫錯（頁面標示位置相關），proxy 未示範。html-to-image quality:0 被當 1、toPixelData 在 pixelRatio>1 只讀左上、內部快取整頁共用；極限測試 SwiftShader 1000 節點已超預算，3000 以上未跑。
- glfx 0.0.4 getPixelArray 在浮點紋理讀回全 0（改用 drawImage）。Filerobot 4.9.1 只能限制到分頁層級；輸入框底色 theme 蓋不掉（CSS 覆寫）；360×560 下工具面板擠壓畫布、提示框短暫遮擋。
- ffmpegwasm core 0.12.10 的 libopus 會 memory access out of bounds（改內建 opus 編碼器）、無字型故 drawtext 不可用；極限測試計時含讀回輸出檔。mediabunny 無 MP3/FLAC/Vorbis 編碼器、無頭不能播 hevc。輔助檔在 demos/assets/mediabunny/、ffmpegwasm/。
- marzipano 立方體分塊為瀏覽器即時重投影（特寫邊緣有鋸齒）；pannellum 自製 multires 分塊在 demos/assets/pannellum/multires/。三頁陀螺儀、觸控手勢、長時間記憶體未驗證。
- pdf-lib 與 jsPDF 標準字型不支援中文（pdf-lib 表單略過中文並提示；jsPDF 中文標題改圖片）。jsPDF 加密只有 RC4。pdfjs getFieldObjects 回傳 {}。pdf-lib 修改場景依賴 jsDelivr 的 tracemonkey。窄寬資訊標籤略蓋預覽頂端。
- p5webserial 串流為標示模擬的虛擬 SerialPort。mindar／arjs 無鏡頭改用模擬畫面（偵測與追蹤為函式庫實算），AR.js 3.4.8 同頁只能一個 ARToolKit 且 dispose 不移除監聽器。webxr-samples 無頭只支援 inline，Chrome inline 投影矩陣要靠畫布 CSS 寬度變動才重算（頁面已說明）；VR/AR/hit-test/實體控制器未實測。
- glightbox 未放 YouTube/Vimeo（需外網）、ZoomImages 嵌舞台錯位未做場景、moreLength 只在行動 UA 生效；影片改 Blob URL（demos/assets/glightbox/）。masonry 原頁無 imagesLoaded（改用 load 事件）、narrow 控制列換行。
- jsxgraph 拖曳／點擊作圖未實操、極限測試 6 秒只到約 250 點未觸頂、c 滑桿初值顯示 0.01；katex 輸出場景窄寬需橫捲。mathjax／jsxgraph 匯出檔與 MathJax 朗讀未驗證。
- 3dmoljs 透明背景會讓半透明表面變暗（表面場景改不透明背景）；無頭 250 原子即約 22 FPS，第一階就低於門檻；窄寬量測標籤輕微重疊。mathjs 825 行略超上限。
- html5-qrcode 2.3.8 解不出 Code 93／Codabar、結果無座標且一圖一碼（多碼場景用切格推算）、Html5QrcodeScanner 介面文字為英文；真實鏡頭未驗證。jsbarcode init() 會把格式名轉大寫，codabar／pharmacode 失敗（頁面照實顯示）。
- opencv 5.0.0 wasm 載入失敗改用 4.12.0；範例照片直接引用 Google／Hugging Face 公開網址（外部依賴）。MediaPipe 無頭為 CPU、int8 efficientdet 在 GPU 偵測為 0（改 float16）。Human 背景分割與 BlazePose 模型從 vladmandic.github.io 下載（jsdelivr 擋 human-models），軟體繪圖下自動改 WASM；手動切後端、BlazePose 下拉、鏡頭未驗證。
- filesaverjs 原頁說法有誤：FileSaver 2.0.5 的 autoBom 只在 msSaveOrOpenBlob 分支生效，Chrome/Firefox/Safari 不加 BOM（場景 1 改手動 ﻿，場景 3 並排實證）；只在 Chromium 實測。jszip 807 行。四頁真實下載與 Excel 開檔未驗證。
- 第 71 批：sweetalert2 同時只能開一個 popup，極限測試改量連續開關；開啟時會暫設 NAV/FOOTER aria-hidden，關閉後還原。toastify reposition 會掃整份文件，寬度 360px 以下通知疊成一欄。flatpickr weekNumbers 僅單月顯示；narrow/stage 下部分側欄與場景 5 浮層下半部被舞台裁切。sweetalert2 檔案輸入與拖曳、觸控、非 Chromium 瀏覽器未驗證。
- 第 67 批：driver.js 沒有容器選項，遮罩會鎖住整頁，所以 driverjs 每個場景改在獨立的內嵌框（iframe）裡跑；600×420 寬度下 shepherd/driver 極限測試的提示框被測試面板（.sc-lab）部分遮住。
- 第 65 批：exceljs 955 行、pptxgenjs 972 行超過 800；docx 拆出 demos/assets/docx/scenes.js。docx 的頁碼欄位與目錄沒有快取值，要在 Word 裡更新才會顯示；docx 在 stage 寬度下預覽區只有約 150px 高（未修好）。pptxgenjs 在 1280 寬時提示泡泡遮到縮圖列。sheetjs 日期讀回有 1 秒誤差。四頁產出的檔案只用 openpyxl、python-pptx、python-docx 讀回驗證，未在真的 Office 開過。
- 第 74 批：四頁維持深色（未用 paper:true）。monaco-editor 929 行、highlightjs 838 行超過 800；prism 拆成 assets/prism/data.js、scenes.js。Monaco context-view／aria 容器是全域單例，切場景時不移除，實測來回切換不累積；monaco 場景 4 的分鐘數是示意資料，非實測。prism autoloader 在合併打包的 CDN 網址下會算錯語法檔路徑，改為手動指定；normalize-whitespace 外掛會改寫預設值，場景外一律關閉。窄版與 stage 寬度下 .sc-lab 面板蓋住 prism 極限測試的對照表。
- 第 73 批：iconify 多數場景要連 Iconify API。web-awesome 依賴 jsDelivr、Font Awesome CDN 與 fonts.bunny.net；表單原生驗證訊息跟瀏覽器語言。daisyui 用 Tailwind 4.3.3 瀏覽器版（官方不建議正式環境使用），每個場景放在 iframe srcdoc 隔離，fixed 定位元件只會蓋住 iframe 範圍；窄版響應式場景只看得到 base 斷點。
- 第 70 批：interactjs 的 gesture 和 hammerjs 的 pinch/rotate 只用合成 touch 驗證，未在真實兩指觸控測過。hammerjs 2.0.8 的 dropRecognizeWith 要兩邊都呼叫才真的解除；手指停住才放開時 swipe 的 direction 是 NONE，改讀 offsetDirection。interactjs 872 行，超過 800。
- 第 76 批：dexie 場景 1 與 localforage 便利貼刻意持久保存，可用「清除示範資料」刪除。sql.js 沒有 FTS5，改用 FTS4 加雙字詞切分。DuckDB 每個場景各自重新啟動 worker（約 1 秒）；Parquet 場景在窄版與 stage 截圖時資料仍在準備，畫面是空的，不是錯誤；極限測試 10 億列那一級約 10 秒，超過 5 秒上限。duckdb、sqljs 在 stage 寬度下底部提示蓋住表格最後一兩列。
- 第 77 批：i18next 場景 7 的網址參數 ?lng= 用自訂偵測器模擬（無頭環境不能改網址）；窄版 i18next 表格最小寬度 470px，要橫向捲動。dayjs 吞吐約為原生 Date 的 1/3.6（解析 ISO 約 185 萬對 676 萬次/秒，SwiftShader 環境）。
- 第 79 批：tailwind-css 每個場景放在 srcdoc iframe 裡，主頁不載入 Tailwind，外殼計算後樣式比對一致；它依賴 jsDelivr 的 @tailwindcss/browser@4.3.3，完成時間點靠讀它寫進 performance 的「Build #N」量測判斷，屬內部行為，未來改版可能失效。狀態變體（hover、focus）要真人操作才會觸發。preact 5 萬列 6.6 秒超出預算，更大級距略過。
- 第 72 批：WinBox 全螢幕要真實使用者手勢才能觸發，未實測；no-resize 只用 CSS 藏起縮放把手。wired-elements 在 narrow + SwiftShader 下曾出現大黑區，格子加 contain: paint 解決；極限測試在 6 秒內只跑到 100 個元件那一級。
- 第 75 批：xtermjs 的 WebGL 渲染器只在 SwiftShader 上測過；quill 輸入延遲用 insertText 模擬，不是真實打字；Editor.js 在視窗 650px 以下時工具箱是蓋滿全畫面的手機版（套件本身行為）；shiki 首次從 esm.sh 冷載入較慢。
- 第 78 批：htmx 用頁內 MockXHR 取代 XMLHttpRequest 模擬伺服器，切場景時還原；全程沒有對外請求（htmx 本身的 CDN 除外）。vue 830 行、htmx 845 行，超過 800。View Transitions 只在 Chromium 驗過。
- 收尾全站驗證（2026-10-11，`--scenes --narrow --stage --thumbs --start --stress 4`，分 6 組平行跑）：260 頁中 250 頁 OK、10 頁 FAIL；其中兩組在 deckgl、quill 因 CPU 滿載截圖逾時中斷，剩下的 14 頁另外重跑，全部 OK。10 頁 FAIL 處理如下：
  - 可重現、已修：parallaxjs（場景 4 自動導覽的游標超出右緣，加 `.ghost-clip` 裁切）、tensorflowjs（切 WASM 後端初始化期間 `tf.memory()` 丟錯，記憶體標籤改顯示「切換後端中…」）、teachable-machine（離場後還在跑的 predict 用到已釋放的模型，`guard()` 在 `!ctx.active` 時忽略）、plyr（離場移除 YouTube／Vimeo iframe 造成子框架 ERR_ABORTED，驗證器改為忽略子框架的中斷請求）、billboardjs（flow 動畫中途銷毀，改記錄動畫結束時間再銷毀）、ccapturejs（離場等待擷取結束的上限 1 秒改 3 秒）。
  - 單獨重跑乾淨、判定為高負載偶發：gridjs、duckdb-wasm、glightbox、sortablejs。已寫進 GAPS.md 第 3 節。
  - 修正後逐頁單獨重跑 `--scenes --narrow --stage --stress`，全部 OK。
