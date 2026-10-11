// Scene definitions for demos/docx.html. Relies on the globals declared by the page's inline script
// (D, R, Para, H, solid, fill, readDocx, renderDoc, docView, download, table, xmlTag, ...).
const COLORS = ["1F4E79", "2F6B4F", "B03A2E", "5B3E96"];
const AGENDA = [["時間", "主題", "講者"], ["09:30", "報到與環境檢查", "助教群"], ["10:00", "用 docx 組出段落、表格與頁碼", "林怡君"], ["11:00", "試算表與 PDF 輸出實作", "陳柏翰"], ["12:00", "成果分享與問答", "全體"]];
const PREP = ["自備筆電並安裝最新版 Chrome 或 Edge", "預先下載課程範例檔（約 15 MB）", "報名截止日：2026-10-15（示意資料）"];
const LOREM = [
  "瀏覽器端產生 Word 文件的好處，是資料不必離開使用者的電腦：表單填完、按下按鈕，檔案就在本機組好並下載。docx 這個函式庫把段落、文字、表格、圖片都包成物件，最後由 Packer 打包成符合 Office Open XML 規格的壓縮檔。",
  "實務上最常見的需求是報名表、證明書、會議紀錄與報價單。這些文件格式固定、內容來自資料庫，用範本加資料的方式產生，比起讓同仁手動複製貼上，更不容易出錯，也省下大量排版時間。",
];
const NONE = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
const box4 = (b) => ({ top: b, bottom: b, left: b, right: b });
const countTag = (doc, tag) => all(doc, tag).length;
const flatTags = (el) => [...(el?.children || [])].map((c) => xmlTag(c) + [...c.children].map(xmlTag).join("")).join("") || `<span class="dx-mut">無</span>`;
const pageFooter = (o = {}) => new D.Footer({ children: [Para([new D.TextRun({ children: ["第 ", D.PageNumber.CURRENT, " 頁，共 ", D.PageNumber.TOTAL_PAGES, " 頁"], color: "888888", size: 18 })], { alignment: D.AlignmentType.CENTER, ...o })] });

// ---------- scene 1: the original proposal generator ----------
function buildProposal(o) {
  const c = COLORS[o.color];
  const h = (t) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 }, children: [R(t, { bold: true, size: 28, color: c })] });
  const cb = box4(solid(4, "999999")), W3 = [1700, 5026, 2300];
  const agenda = o.table
    ? new D.Table({ width: { size: 9026, type: D.WidthType.DXA }, columnWidths: W3, rows: AGENDA.map((r, i) => new D.TableRow({ tableHeader: i === 0, children: r.map((t, j) => new D.TableCell({
      width: { size: W3[j], type: D.WidthType.DXA }, borders: cb, shading: i === 0 ? fill(c) : undefined, margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [Para([R(t, { bold: i === 0, color: i === 0 ? "FFFFFF" : "222222" })])] })) })) })
    : Para("上午 09:30 報到，12:30 結束，共三個單元。");
  const prep = o.list ? PREP.map((t) => Para(t, { numbering: { reference: "prep", level: 0 } })) : [Para(PREP.join("；") + "。")];
  return new D.Document({
    creator: "JS 工具圖鑑", title: o.title,
    styles: { default: { document: { run: BASE } } },
    numbering: { config: [{ reference: "prep", levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: "%1.", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 480, hanging: 360 } } } }] }] },
    sections: [{
      properties: { page: A4 },
      headers: o.hf ? { default: new D.Header({ children: [Para([R("JS 工具圖鑑學院　內部文件", { color: "888888", size: 18 })], { alignment: D.AlignmentType.RIGHT, border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: "BBBBBB", space: 4 } } })] }) } : undefined,
      footers: o.hf ? { default: pageFooter() } : undefined,
      children: [
        Para([R(o.title, { bold: true, size: 44, color: c })], { spacing: { after: 120 } }),
        Para([R(`日期：${o.date}　承辦人：${o.owner}　文件編號：WS-2026-10`, { color: "666666", size: 20 })], { border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: c, space: 6 } }, spacing: { after: 240 } }),
        h("一、活動目的"),
        Para([R("本工作坊示範如何在"), R("不經伺服器", { bold: true }), R("的情況下，直接由瀏覽器產生 Word、Excel 與 PDF 文件，協助團隊把"), R("報表下載", { highlight: "yellow" }), R("功能搬到前端，降低後端負載。")], { alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 120 } }),
        h("二、議程"), agenda,
        h("三、準備事項"), ...prep,
        Para([R("如有疑問請洽承辦人"), R(o.owner, { bold: true }), R("。")], { spacing: { before: 240 } }),
      ],
    }],
  });
}

// ---------- scene 2: paragraph and run formatting ----------
const RUNS = [["粗體", { bold: true }], ["斜體", { italics: true }], ["底線", { underline: {} }], ["波浪底線", { underline: { type: D.UnderlineType.WAVE, color: "FF0000" } }], ["雙底線", { underline: { type: D.UnderlineType.DOUBLE } }],
  ["刪除線", { strike: true }], ["雙刪除線", { doubleStrike: true }], ["螢光筆", { highlight: "yellow" }], ["網底", { shading: fill("FFE699") }], ["著重號", { emphasisMark: { type: D.EmphasisMarkType.DOT } }],
  ["字距加寬", { characterSpacing: 80 }], ["標楷體", { font: "DFKai-SB" }], ["紅色 14pt", { color: "C00000", size: 28 }], ["Small Caps", { smallCaps: true }], ["all caps", { allCaps: true }]];
const ALIGNS = [["靠左", "LEFT"], ["置中", "CENTER"], ["靠右", "RIGHT"], ["左右對齊", "JUSTIFIED"], ["分散對齊", "DISTRIBUTE"]];
function buildText(o) {
  const runs = RUNS.flatMap(([t, s], i) => [R(t, s), ...(i < RUNS.length - 1 ? [R("、")] : [R("。")])]);
  const body = { alignment: D.AlignmentType[ALIGNS[o.align][1]], spacing: { line: Math.round(o.line * 240), after: 160 }, indent: o.indent ? { firstLine: 440 } : undefined };
  return new D.Document({
    styles: { default: { document: { run: BASE } } },
    sections: [{ properties: { page: A4 }, children: [
      H("段落與文字樣式"),
      Para([R("一行之內的 run 樣式："), ...runs], { spacing: { after: 160 } }),
      Para([R("上標與下標：E = mc"), R("2", { superScript: true }), R("，水是 H"), R("2", { subScript: true }), R("O，引用文獻標成"), R("[1]", { superScript: true }), R("。")], { spacing: { after: 160 } }),
      Para(LOREM[0], body),
      Para(LOREM[1], body),
      Para([R("提示：", { bold: true, color: "2E74B5" }), R("段落可以有自己的框線與網底，常用來做注意事項或摘要方塊。")], { border: { left: { style: D.BorderStyle.SINGLE, size: 24, color: "2E74B5", space: 8 } }, shading: fill("EAF1FB"), indent: { left: 200 }, spacing: { before: 120, after: 160 } }),
      Para([R("「文件是寫給人看的，順便讓機器能讀。」", { italics: true, color: "555555" })], { alignment: D.AlignmentType.CENTER, border: { top: solid(6, "999999"), bottom: solid(6, "999999") }, spacing: { before: 120 } }),
    ] }],
  });
}

// ---------- scene 3: styles, headings and a table of contents ----------
const PALS = [["藍", "1F3864", "2E74B5", "5B9BD5"], ["綠", "1E5631", "2F7D4A", "5FA36F"], ["赭", "7A3E12", "A0522D", "C47A4A"]];
const CHAPTERS = [
  ["第一章　為什麼在瀏覽器產生文件", [["1.1　減少伺服器負擔", ["1.1.1　尖峰時段的報表"]], ["1.2　離線也能用", []]]],
  ["第二章　docx 的物件模型", [["2.1　Document 與 Section", ["2.1.1　頁面尺寸與邊界"]], ["2.2　Paragraph 與 TextRun", []]]],
  ["第三章　樣式與目錄", [["3.1　內建樣式與自訂樣式", []], ["3.2　目錄欄位的更新", ["3.2.1　快取內容與 updateFields"]]]],
];
const tocEntries = () => CHAPTERS.flatMap(([t, subs], i) => [{ title: t, level: 1, page: i + 2 }, ...subs.flatMap(([s, xs]) => [{ title: s, level: 2, page: i + 2 }, ...xs.map((x) => ({ title: x, level: 3, page: i + 2 }))])]);
function buildStyles(o) {
  const [, c1, c2, c3] = PALS[o.pal], kids = [];
  CHAPTERS.forEach(([t, subs], i) => {
    kids.push(new D.Paragraph({ text: t, heading: D.HeadingLevel.HEADING_1, pageBreakBefore: true }));
    kids.push(Para([R("本章重點是"), R(["減少伺服器負擔", "物件模型", "樣式繼承"][i], { style: "Key" }), R("，以下各節依序說明。內文使用 Normal 樣式，標題使用內建的 Heading 1 到 3。")]));
    for (const [s, xs] of subs) {
      kids.push(new D.Paragraph({ text: s, heading: D.HeadingLevel.HEADING_2 }), Para(LOREM[i % 2].slice(0, 60) + "。"));
      for (const x of xs) kids.push(new D.Paragraph({ text: x, heading: D.HeadingLevel.HEADING_3 }), Para(LOREM[(i + 1) % 2].slice(0, 50) + "。"));
    }
    kids.push(Para("備註：改樣式定義一次，全文所有套用該樣式的段落一起改變。", { style: "Note" }));
  });
  return new D.Document({
    features: { updateFields: o.update },
    styles: {
      default: {
        document: { run: BASE },
        title: { run: { size: 48, bold: true, color: c1 }, paragraph: { spacing: { after: 120 } } },
        heading1: { run: { size: 32, bold: true, color: c1 }, paragraph: { spacing: { before: 240, after: 120 } } },
        heading2: { run: { size: 26, bold: true, color: c2 }, paragraph: { spacing: { before: 200, after: 80 } } },
        heading3: { run: { size: 23, bold: true, color: c3 }, paragraph: { spacing: { before: 160, after: 60 } } },
      },
      paragraphStyles: [
        { id: "Lead", name: "導言", basedOn: "Normal", next: "Normal", run: { size: 26, color: "555555" }, paragraph: { spacing: { after: 240 } } },
        { id: "Note", name: "備註", basedOn: "Normal", run: { size: 20, italics: true, color: "595959" }, paragraph: { indent: { left: 360 }, border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: c2, space: 6 } }, spacing: { before: 120, after: 80 } } },
      ],
      characterStyles: [{ id: "Key", name: "關鍵詞", basedOn: "DefaultParagraphFont", run: { bold: true, color: c2 } }],
    },
    sections: [{ properties: { page: A4 }, footers: { default: pageFooter() }, children: [
      new D.Paragraph({ text: "瀏覽器端文件產生指南", heading: D.HeadingLevel.TITLE }),
      Para("這份文件用來示範樣式與目錄：標題全部套用內建樣式，目錄由 TOC 欄位產生。", { style: "Lead" }),
      new D.TableOfContents("目錄", { hyperlink: true, headingStyleRange: "1-3", cachedEntries: o.cache ? tocEntries() : undefined }),
      ...kids,
    ] }],
  });
}

// ---------- scene 4: numbering and bullets ----------
const L0 = [["一、", "TAIWANESE_COUNTING", "%1、"], ["1.", "DECIMAL", "%1."], ["甲、", "IDEOGRAPH_TRADITIONAL", "%1、"], ["I.", "UPPER_ROMAN", "%1."], ["①", "DECIMAL_ENCLOSED_CIRCLE", "%1"]];
const SYMS = ["●", "■", "✓", "➢"];
const PLAN = [["招生宣傳", [["社群貼文", ["每週兩篇", "附報名連結"]], ["校園海報", []]]], ["課程準備", [["講義定稿", ["10 月 10 日前"]], ["教室設備檢查", []]]], ["結訓與追蹤", [["滿意度問卷", []]]]];
function buildLists(o) {
  const [, f0, t0] = L0[o.l0], ref = (level, instance) => ({ numbering: { reference: "plan", level, instance } });
  const plan = (items, inst) => items.flatMap(([a, subs]) => [Para(a, ref(0, inst)), ...subs.flatMap(([b, cs]) => [Para(b, ref(1, inst)), ...cs.map((c) => Para(c, ref(2, inst)))])]);
  const legal = (t, level) => Para(t, { numbering: { reference: "legal", level } });
  return new D.Document({
    styles: { default: { document: { run: BASE } } },
    numbering: { config: [
      { reference: "plan", levels: [
        { level: 0, format: D.LevelFormat[f0], text: t0, alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 560, hanging: 560 } }, run: { bold: true, color: "1F4E79" } } },
        { level: 1, format: D.LevelFormat.DECIMAL_ENCLOSED_PARENTHESES, text: "%2", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 1000, hanging: 440 } } } },
        { level: 2, format: D.LevelFormat.BULLET, text: SYMS[o.sym], alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 1440, hanging: 360 } }, run: { color: "2E74B5" } } },
      ] },
      { reference: "legal", levels: [
        { level: 0, format: D.LevelFormat.DECIMAL, text: "%1.", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 420, hanging: 420 } } } },
        { level: 1, format: D.LevelFormat.DECIMAL, text: "%1.%2", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 900, hanging: 480 } } } },
        { level: 2, format: D.LevelFormat.DECIMAL, text: "%1.%2.%3", alignment: D.AlignmentType.START, style: { paragraph: { indent: { left: 1500, hanging: 600 } } } },
      ] },
    ] },
    sections: [{ properties: { page: A4 }, children: [
      H("課程推廣計畫（第一梯次）"), ...plan(PLAN, 1),
      H(o.restart ? "第二梯次（重新編號，instance 2）" : "第二梯次（同一個 instance，延續編號）"), ...plan(PLAN.slice(0, 2), o.restart ? 2 : 1),
      H("報名須知（法規式多層編號）"),
      legal("報名資格", 0), legal("年滿 18 歲", 1), legal("具備基本電腦操作能力", 1), legal("學生身分可享優惠", 2),
      legal("繳費方式", 0), legal("線上刷卡", 1), legal("銀行轉帳", 1),
      H("內建項目符號"),
      Para("不用自己定義編號，直接設定 bullet", { bullet: { level: 0 } }), Para("第二層會自動換符號", { bullet: { level: 1 } }), Para("回到第一層", { bullet: { level: 0 } }),
    ] }],
  });
}

// ---------- scene 5: tables ----------
const BORDER_MODES = ["單線", "雙線", "虛線", "只留橫線"];
function buildTables(o) {
  const b = [solid(4, "808080"), solid(6, "404040", D.BorderStyle.DOUBLE), solid(6, "808080", D.BorderStyle.DASHED)][o.border];
  const borders = o.border < 3 ? { ...box4(b), insideHorizontal: b, insideVertical: b } : { top: solid(12, "1F4E79"), bottom: solid(12, "1F4E79"), left: NONE, right: NONE, insideHorizontal: solid(4, "BFBFBF"), insideVertical: NONE };
  const WS = [1100, 1300, 2826, 2000, 1800], dx = (n) => ({ size: n, type: D.WidthType.DXA });
  const cell = (t, x = {}) => new D.TableCell({ verticalAlign: D.VerticalAlign.CENTER, margins: { left: 100, right: 100, top: 40, bottom: 40 }, ...x, children: [Para([R(t, x.run)], { alignment: x.align })] });
  const head = new D.TableRow({ tableHeader: true, children: ["時段", "時間", "課程", "講師", "教室"].map((t) => cell(t, { shading: fill("1F4E79"), run: { bold: true, color: "FFFFFF" }, align: D.AlignmentType.CENTER })) });
  const slot = (label, first, z) => (o.merge ? (first ? [cell(label, { rowSpan: 2, shading: fill("DEEAF6"), align: D.AlignmentType.CENTER, run: { bold: true } })] : []) : [cell(label, { shading: z })]);
  const lesson = (i, label, first, time, course, who, room) => {
    const z = o.zebra && i % 2 ? fill("F2F2F2") : undefined;
    return new D.TableRow({ children: [...slot(label, first, z), cell(time, { shading: z }), cell(course, { shading: z }), cell(who, { shading: z }), cell(room, { shading: z })] });
  };
  const lunch = o.merge
    ? new D.TableRow({ children: [cell("中午", { align: D.AlignmentType.CENTER }), cell("午休與交流（12:00 至 13:30）", { columnSpan: 4, shading: fill("FFF2CC"), align: D.AlignmentType.CENTER })] })
    : new D.TableRow({ children: [cell("中午"), cell("12:00"), cell("午休與交流"), cell(""), cell("")] });
  const sign = (t) => new D.TableCell({ children: [Para([R(t, { bold: true })], { alignment: D.AlignmentType.CENTER })] });
  const gap = () => new D.TableCell({ children: [Para("")] });
  const ink = () => new D.TableCell({ verticalAlign: D.VerticalAlign.BOTTOM, borders: { bottom: solid(8, "000000") }, children: [Para([R("（簽章）", { color: "A6A6A6", size: 18 })], { alignment: D.AlignmentType.RIGHT })] });
  return new D.Document({
    styles: { default: { document: { run: BASE } } },
    sections: [{ properties: { page: A4 }, children: [
      H("秋季班課程表"),
      new D.Table({ width: dx(9026), columnWidths: WS, borders, rows: [head, lesson(0, "上午", true, "09:00", "資料視覺化", "林怡君", "A101"), lesson(1, "上午", false, "10:30", "Node.js 實戰", "陳冠宇", "A102"), lunch,
        lesson(2, "下午", true, "13:30", "AI 工作坊", "張雅婷", "B201"), lesson(3, "下午", false, "15:00", "前端動畫", "王柏翰", "B202")] }),
      Para("合併儲存格：rowSpan 會讓下方列自動補上 vMerge continue 的空格；columnSpan 寫成 gridSpan。", { spacing: { before: 120, after: 360 } }),
      H("簽核欄", 2),
      new D.Table({ width: dx(8600), columnWidths: [2600, 400, 2600, 400, 2600], borders: { ...box4(NONE), insideHorizontal: NONE, insideVertical: NONE }, rows: [
        new D.TableRow({ children: [sign("承辦人"), gap(), sign("單位主管"), gap(), sign("核定")] }),
        new D.TableRow({ height: { value: 900, rule: D.HeightRule.ATLEAST }, children: [ink(), gap(), ink(), gap(), ink()] }),
      ] }),
    ] }],
  });
}

// ---------- scene 6: images, hyperlinks and footnotes ----------
function buildMedia(o) {
  const data = canvasBytes(drawArt(o.seed), o.fmt), type = o.fmt;
  const main = new D.ImageRun({ type, data, transformation: { width: o.w, height: Math.round((o.w * 9) / 16) },
    floating: o.wrap ? { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.MARGIN, align: D.HorizontalPositionAlign.RIGHT }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
      wrap: { type: D.TextWrappingType.SQUARE, side: D.TextWrappingSide.BOTH_SIDES }, margins: { left: 114300, bottom: 57150 } } : undefined });
  const second = new D.ImageRun({ type, data, transformation: { width: 220, height: 163, rotation: 4 }, crop: { left: 12, right: 12 }, outline: { type: "solidFill", solidFillType: "rgb", value: "C00000", width: 19050 } });
  const link = (t) => R(t, { style: "Hyperlink" });
  return new D.Document({
    styles: { default: { document: { run: BASE } } },
    footnotes: {
      1: { children: [Para("docx 套件文件：https://docx.js.org（本頁使用 9.8.1 版）。")] },
      2: { children: [Para("圖片在 zip 裡放在 word/media，document.xml 只用 r:embed 參照它。")] },
    },
    sections: [{ properties: { page: A4 }, children: [
      H("圖片、超連結與註腳"),
      ...(o.wrap ? [Para([main, R(LOREM[0] + LOREM[1])], { alignment: D.AlignmentType.JUSTIFIED })] : [Para([main], { alignment: D.AlignmentType.CENTER }), Para(LOREM[0], { alignment: D.AlignmentType.JUSTIFIED })]),
      Para([second, R("　同一張圖再用一次：裁切左右各 12%、加紅框、旋轉 4 度。")], { spacing: { before: 200, after: 200 } }),
      Para([R("外部連結："), new D.ExternalHyperlink({ link: "https://docx.js.org", children: [link("docx 官方文件")] }), R("；內部連結："), new D.InternalHyperlink({ anchor: "refs", children: [link("跳到參考資料")] }), R("。")]),
      Para([R("註腳會自動編號"), new D.FootnoteReferenceRun(1), R("，在 Word 裡放到頁面底部"), new D.FootnoteReferenceRun(2), R("。")], { spacing: { after: 240 } }),
      new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [new D.Bookmark({ id: "refs", children: [R("參考資料")] })] }),
      Para("書籤（bookmark）是內部連結的目標，在 Word 裡按住 Ctrl 點連結就會跳到這裡。"),
      Para("同一張圖插入兩次，zip 裡仍只存一份檔案，兩個 a:blip 都指向同一個關聯 Id。"),
    ] }],
  });
}

// ---------- scene 7: sections, orientation, header and footer ----------
const PNF = [["1", "DECIMAL"], ["i", "LOWER_ROMAN"], ["I", "UPPER_ROMAN"], ["一", "TAIWANESE_COUNTING"]];
const VOICES = ["原本以為產生 Word 一定要後端，沒想到前端一個套件就做得到。", "表格合併儲存格的寫法和 HTML 很像，上手很快。", "頁碼欄位在預覽看不到數字，用 Word 開才會算出來，這點要先跟使用者說明。", "分節之後每節可以有自己的頁首頁尾，做附錄很方便。", "目錄要更新欄位才會出現，建議開啟 updateFields。", "圖片要先轉成位元組再放進 ImageRun，canvas 的 toBlob 很好用。"];
function buildSections(o) {
  const land = o.land, avail = (land ? 16838 : 11906) - 2880;
  const ws = [Math.round(avail * 0.14), ...Array(7).fill(Math.floor((avail * 0.86) / 7))];
  const months = [4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => { const v = COURSES.map((_, j) => 20 + ((m * 7 + j * 13) % 37)); return [`${m} 月`, ...v, v.reduce((a, b) => a + b, 0), (v.reduce((a, b) => a + b, 0) / 5).toFixed(1)]; });
  const tc = (t, h) => new D.TableCell({ shading: h ? fill("D9E2F3") : undefined, children: [Para([R(String(t), { bold: h, size: 20 })], { alignment: D.AlignmentType.CENTER })] });
  const hd = (t) => new D.Header({ children: [Para([R(t, { color: "777777", size: 18 })], { alignment: D.AlignmentType.RIGHT })] });
  const ft = new D.Footer({ children: [Para([new D.TextRun({ children: ["第 ", D.PageNumber.CURRENT, " 頁，本節共 ", D.PageNumber.TOTAL_PAGES_IN_SECTION, " 頁，全文共 ", D.PageNumber.TOTAL_PAGES, " 頁"], size: 18, color: "666666" })], { alignment: D.AlignmentType.CENTER })] });
  return new D.Document({
    styles: { default: { document: { run: BASE } } },
    sections: [
      { properties: { titlePage: o.title, page: { ...A4, pageNumbers: { start: 1, formatType: D.NumberFormat[PNF[o.fmt][1]] } } }, headers: { default: hd("2026 年度課程報告") }, footers: { default: ft },
        children: [
          Para([R("2026 年度課程報告", { bold: true, size: 52, color: "1F4E79" })], { alignment: D.AlignmentType.CENTER, spacing: { before: 3600, after: 240 } }),
          Para([R("JS 工具圖鑑學院　教務組", { size: 26, color: "666666" })], { alignment: D.AlignmentType.CENTER }),
          Para([new D.PageBreak()]),
          H("壹、年度摘要"), Para(LOREM[0], { alignment: D.AlignmentType.JUSTIFIED }), Para(LOREM[1], { alignment: D.AlignmentType.JUSTIFIED }),
          Para([new D.PageBreak()]),
          H("貳、檢討與建議"), Para("封面通常不顯示頁首頁尾，開啟「首頁不同」並且不提供首頁專用的頁首，封面就會留白。頁碼格式設在本節的 pgNumType，PAGE 欄位會照這個格式顯示。"),
        ] },
      { properties: { type: D.SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838, orientation: land ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT }, margin: A4.margin, pageNumbers: { start: 1 } } },
        headers: { default: hd("年度報告附錄") }, footers: { default: ft },
        children: [
          H("附錄 A　各月份報名人數"),
          new D.Table({ width: { size: avail, type: D.WidthType.DXA }, columnWidths: ws, borders: { ...box4(solid(4, "8EAADB")), insideHorizontal: solid(4, "8EAADB"), insideVertical: solid(4, "8EAADB") },
            rows: [new D.TableRow({ tableHeader: true, children: ["月份", ...COURSES, "合計", "平均"].map((t) => tc(t, true)) }), ...months.map((r) => new D.TableRow({ children: r.map((t) => tc(t)) }))] }),
          Para(land ? "本節改為橫向，寬表格才放得下 8 欄。" : "直式頁面寬度不足，8 欄會被擠窄，可打開「附錄橫向」比較。", { spacing: { before: 120 } }),
        ] },
      { properties: { type: D.SectionType.NEXT_PAGE, page: A4, column: { count: o.cols, space: 480, separate: true } },
        children: [H("附錄 B　學員心得"), ...VOICES.map((t, i) => Para([R(`${NAMES[i]}：`, { bold: true }), R(t)], { spacing: { after: 160 } }))] },
    ],
  });
}

// ---------- scene 8: stress document ----------
function stressDoc(n, mode) {
  const kids = [];
  if (!mode) {
    for (let i = 0; i < n; i++) kids.push(new D.Paragraph({ children: [R(`${i + 1}. `, { bold: true }), R(`${NAMES[i % 10]} 報名「${COURSES[i % 5]}」，${CITIES[i % 7]}，`), R(i % 3 ? "已繳費" : "待繳費", { highlight: i % 3 ? undefined : "yellow" })] }));
  } else {
    const ws = [1000, 1800, 2600, 1800, 1800], c = (t, h) => new D.TableCell({ shading: h ? fill("1F4E79") : undefined, children: [new D.Paragraph({ children: [R(t, h ? { bold: true, color: "FFFFFF" } : {})] })] });
    const rows = [new D.TableRow({ tableHeader: true, children: ["序號", "姓名", "課程", "城市", "狀態"].map((t) => c(t, true)) })];
    for (let i = 0; i < n; i++) rows.push(new D.TableRow({ children: [String(i + 1), NAMES[i % 10], COURSES[i % 5], CITIES[i % 7], i % 3 ? "已繳費" : "待繳費"].map((t) => c(t)) }));
    kids.push(new D.Table({ width: { size: 9000, type: D.WidthType.DXA }, columnWidths: ws, borders: { ...box4(solid(4, "999999")), insideHorizontal: solid(4, "999999"), insideVertical: solid(4, "999999") }, rows }), Para(`共 ${fmt(n)} 筆。`));
  }
  return new D.Document({ styles: { default: { document: { run: BASE } } }, sections: [{ properties: { page: A4 }, children: kids }] });
}
const trimOf = (mode) => (mode ? { tag: "tr", head: 13, tail: 6, cols: 5, what: "列" } : { tag: "p", head: 12, tail: 6, what: "個段落" });

Showcase.run({ scenes: [
  {
    id: "proposal", title: "企劃書產生器", paper: true,
    api: "new Document ・ Paragraph ・ TextRun ・ Table ・ numbering ・ Header/Footer ・ Packer.toBlob",
    desc: "原本的招牌示範：在右側改標題、承辦人、日期，切換配色與有無表格、清單、頁首頁尾，就重新產生一份 .docx。左邊的預覽不是照設定畫的，而是把剛產生的檔案用 JSZip 解開、讀 document.xml 與 styles.xml 繪製；右下列出壓縮檔內的每個檔案。",
    hint: "換配色、開關表格與頁首頁尾；在右側改標題；「下載 .docx」用 Word 開",
    mount(ctx) {
      const o = { color: 0, table: true, list: true, hf: true, title: "瀏覽器端文件產生工作坊企劃書", owner: "林怡君", date: "2026-10-03" };
      const build = () => buildProposal(o);
      const v = docView(ctx, { sideTitle: "內容與壓縮檔", build, async side(d) {
        const files = await Promise.all(d.zip.file(/./).map(async (f) => [f.name, (await f.async("uint8array")).length]));
        v.sub.textContent = `${files.length} 個檔案`;
        v.body.querySelector(".dx-dyn").innerHTML = table(["路徑", "大小"], files.map(([n, b]) => `<tr><td class="m">${esc(n)}</td><td class="m r">${bytesText(b)}</td></tr>`));
      } });
      ctx.group(["深藍", "森綠", "磚紅", "紫"], 0, (i) => { o.color = i; v.refresh(); });
      ctx.toggle("議程表格", true, (x) => { o.table = x; v.refresh(); });
      ctx.toggle("編號清單", true, (x) => { o.list = x; v.refresh(); });
      ctx.toggle("頁首、頁尾與頁碼", true, (x) => { o.hf = x; v.refresh(); });
      download(ctx, build, () => `${o.title}.docx`);
      v.body.innerHTML = `<label class="dx-lb">文件標題<input class="dx-in" data-k="title" maxlength="24" value="${esc(o.title)}"></label>
        <label class="dx-lb">承辦人<input class="dx-in" data-k="owner" maxlength="8" value="${esc(o.owner)}"></label>
        <label class="dx-lb">日期<input class="dx-in" data-k="date" maxlength="10" value="${esc(o.date)}"></label>
        <p>頁尾的「第 N 頁，共 M 頁」是 PAGE 與 NUMPAGES 欄位，檔案裡沒有數字，Word 開啟時才計算；預覽依讀回的頁數代入。</p><div class="dx-dyn"></div>`;
      let timer = 0;
      ctx.on(v.body, "input", (e) => { const k = e.target.dataset.k; if (!k) return; o[k] = e.target.value.trim() || "未命名"; clearTimeout(timer); timer = ctx.timeout(() => v.refresh(), 200); });
      v.refresh();
    },
  },
  {
    id: "text", title: "段落與文字樣式", paper: true,
    api: "TextRun({ bold, italics, underline, strike, highlight, shading, emphasisMark, characterSpacing }) ・ Paragraph({ alignment, spacing, indent, border })",
    desc: "第二段一次放進 15 種文字樣式，每一種都是一個 TextRun，寫成 w:rPr 裡不同的元素；下面兩段長文可以切換對齊方式、拖曳行距、開關首行縮排，最後是有左框線與網底的提示框，以及上下框線的引言。右側逐段列出讀回的 w:pPr，以及第二段每個 run 的 w:rPr。",
    hint: "切換對齊、拖曳行距、開關首行縮排；右側對照每個樣式寫成的 XML 元素",
    mount(ctx) {
      const o = { align: 3, line: 1.5, indent: true };
      const v = docView(ctx, { sideTitle: "讀回的 pPr 與 rPr", build: () => buildText(o), side(d) {
        const ps = kids(one(d.doc, "w:body"), "w:p");
        v.sub.textContent = `${ps.length} 段`;
        const runs = kids(ps[1], "w:r").filter((r) => r.textContent !== "、" && r.textContent !== "。");
        v.body.innerHTML = `<h4>每段的段落屬性 w:pPr</h4>${table(["段", "元素"], ps.map((p, i) => `<tr><td class="m">${i + 1}</td><td>${flatTags(kid(p, "w:pPr"))}</td></tr>`))}
          <h4>第 2 段每個 run 的 w:rPr</h4>${table(["文字", "元素"], runs.map((r) => `<tr><td>${esc(r.textContent)}</td><td>${flatTags(kid(r, "w:rPr"))}</td></tr>`))}
          <p>行距 w:spacing line 以 240 為單行；lineRule auto 表示倍數。分散對齊是 jc=distribute，最後一行也會撐滿。</p>`;
      } });
      ctx.group(ALIGNS.map((a) => a[0]), 3, (i) => { o.align = i; v.refresh(); });
      ctx.slider("行距", { min: 1, max: 2.5, step: 0.25, value: 1.5, format: (x) => `${x.toFixed(2)} 倍` }, (x) => { o.line = x; v.refresh(); });
      ctx.toggle("首行縮排", true, (x) => { o.indent = x; v.refresh(); });
      download(ctx, () => buildText(o), () => "文字樣式.docx");
      v.refresh();
    },
  },
  {
    id: "styles", title: "標題、樣式與目錄", paper: true,
    api: "styles.default.heading1 ・ paragraphStyles ・ characterStyles ・ HeadingLevel ・ TableOfContents ・ features.updateFields",
    desc: "內建樣式 Title、Heading 1 到 3 改顏色與字級，另外自訂段落樣式「導言」「備註」與字元樣式「關鍵詞」。目錄是 TOC 欄位：docx 不會排版、算不出頁碼，可以先塞入快取內容（cachedEntries），或打開 updateFields 讓 Word 開檔時詢問是否更新。關掉快取就能看到檔案裡其實只有欄位指令。",
    hint: "切換配色；關掉「目錄快取」看欄位原貌；右側看樣式表與 TOC 指令",
    mount(ctx) {
      const o = { pal: 0, cache: true, update: true };
      const v = docView(ctx, { sideTitle: "樣式與目錄欄位", build: () => buildStyles(o), side(d, info) {
        const used = {};
        for (const p of all(d.doc, "w:p")) { const s = W(one(kid(p, "w:pPr"), "w:pStyle"), "val") || "Normal"; used[s] = (used[s] || 0) + 1; }
        for (const r of all(d.doc, "w:rStyle")) used[W(r, "val")] = (used[W(r, "val")] || 0) + 1;
        const ids = ["Normal", "Title", "Heading1", "Heading2", "Heading3", "Lead", "Note", "Key", "TOC1", "TOC2", "TOC3"];
        const ins = all(d.doc, "w:instrText").map((x) => x.textContent).find((x) => /TOC/.test(x)) || "";
        v.sub.textContent = `${Object.keys(d.S.map).length} 個樣式`;
        v.body.innerHTML = `<h4>styles.xml（節錄）</h4>${table(["styleId", "名稱", "basedOn", "使用"], ids.map((id) => { const s = d.S.map[id];
          return `<tr><td class="m">${id}</td><td>${s ? esc(s.name) : `<span class="dx-mut">未定義</span>`}</td><td class="m">${esc(s?.basedOn || "")}</td><td class="m r">${used[id] || 0}</td></tr>`; }))}
          <p>TOC1 到 TOC3 沒有寫進 styles.xml，Word 會套用自己的內建目錄樣式；預覽以每層縮排 11pt 近似。</p>
          <h4>TOC 欄位指令</h4><div class="dx-pre">${esc(ins.trim())}</div>
          <h4>settings.xml</h4><p>${/updateFields/.test(d.settings) ? "有 &lt;w:updateFields/&gt;：Word 開檔時會詢問是否更新欄位" : "沒有 updateFields：目錄維持檔案裡的快取內容"}${info.tocEmpty ? "；目前目錄沒有快取，預覽只能顯示提示框" : ""}</p>`;
      } });
      ctx.group(PALS.map((p) => p[0]), 0, (i) => { o.pal = i; v.refresh(); });
      ctx.toggle("目錄快取", true, (x) => { o.cache = x; v.refresh(); });
      ctx.toggle("開啟時更新欄位", true, (x) => { o.update = x; v.refresh(); });
      download(ctx, () => buildStyles(o), () => "樣式與目錄.docx");
      v.refresh();
    },
  },
  {
    id: "lists", title: "編號與項目符號清單", paper: true,
    api: "numbering.config[{ reference, levels[{ level, format, text, style }] }] ・ Paragraph({ numbering: { reference, level, instance } }) ・ bullet",
    desc: "三層的計畫清單：第一層可換成國字、數字、天干、羅馬數字、圈號，第二層是括號數字，第三層是可換符號的項目符號。第二梯次用 instance 決定要重新從 1 編號還是延續上一份。下方是 1. / 1.1 / 1.1.1 的法規式編號與內建 bullet。右側列出 numbering.xml 的定義與每段算出的標籤。",
    hint: "換第一層格式與第三層符號；開關「重新編號」看第二梯次的變化",
    mount(ctx) {
      const o = { l0: 0, sym: 0, restart: true };
      const v = docView(ctx, { sideTitle: "numbering.xml 與標籤", build: () => buildLists(o), side(d, info) {
        const absRows = Object.entries(d.num.abs).map(([id, lv]) => `<tr><td class="m">${id}</td><td>${lv.slice(0, 3).map((l, i) => `<span class="dx-tag">${i}: ${esc(l.fmt)} ${esc(l.text)}</span>`).join("")}</td></tr>`);
        const numRows = Object.entries(d.num.nums).map(([id, n]) => `<tr><td class="m">${id}</td><td class="m">${n.abs}</td><td class="m">${Object.entries(n.ov).map(([l, s]) => `lvl ${l} 從 ${s}`).join("，") || "無"}</td></tr>`);
        v.sub.textContent = `${info.labels.length} 個編號段落`;
        v.body.innerHTML = `<h4>abstractNum（前 3 層）</h4>${table(["id", "lvl: 格式 文字"], absRows)}
          <h4>num 實例</h4>${table(["numId", "abstract", "startOverride"], numRows)}
          <h4>每段算出的標籤</h4>${table(["numId", "層", "標籤", "段落"], info.labels.map((l) => `<tr><td class="m">${l.numId}</td><td class="m">${l.ilvl}</td><td>${esc(l.text)}</td><td>${esc(l.para)}</td></tr>`))}
          <p>標籤不是存在檔案裡的文字，而是 Word 依 numId 與層級的計數器算出來的；預覽用同樣規則重算。</p>`;
      } });
      ctx.select("第一層", L0.map((l, i) => ({ value: String(i), label: `${l[0]} ${l[1]}` })), "0", (x) => { o.l0 = +x; v.refresh(); });
      ctx.group(SYMS, 0, (i) => { o.sym = i; v.refresh(); });
      ctx.toggle("第二梯次重新編號", true, (x) => { o.restart = x; v.refresh(); });
      download(ctx, () => buildLists(o), () => "編號清單.docx");
      v.refresh();
    },
  },
  {
    id: "tables", title: "表格：合併、框線與底色", paper: true,
    api: "Table({ columnWidths, borders }) ・ TableRow({ tableHeader, height }) ・ TableCell({ rowSpan, columnSpan, shading, borders, verticalAlign })",
    desc: "課程表示範跨列合併（上午、下午各合併兩列）、跨欄合併（午休橫跨四欄）、表頭底色與斑馬紋；框線可切換單線、雙線、虛線與只留橫線的三線表。下面的簽核欄把表格框線全部關掉，只留每格的下框線，並用最小列高與靠下對齊放「（簽章）」。",
    hint: "切換框線樣式；關掉「合併儲存格」比較；右側看 gridSpan 與 vMerge",
    mount(ctx) {
      const o = { border: 0, merge: true, zebra: true };
      const v = docView(ctx, { sideTitle: "讀回的表格結構", build: () => buildTables(o), side(d) {
        const rows = all(d.doc, "w:tbl").map((t, i) => {
          const tr = kids(t, "w:tr"), tcs = all(t, "w:tc"), vm = all(t, "w:vMerge");
          const shd = tcs.filter((c) => { const f = W(one(kid(c, "w:tcPr"), "w:shd"), "fill"); return f && f !== "auto"; }).length;
          return `<tr class="sep"><td colspan="2">表格 ${i + 1}</td></tr>
            <tr><td>列 × 欄</td><td class="m">${tr.length} × ${kids(kid(t, "w:tblGrid"), "w:gridCol").length}</td></tr>
            <tr><td>w:tc 數</td><td class="m">${tcs.length}</td></tr>
            <tr><td>gridSpan</td><td class="m">${all(t, "w:gridSpan").filter((g) => +W(g, "val") > 1).map((g) => W(g, "val")).join("、") || "無"}</td></tr>
            <tr><td>vMerge</td><td class="m">restart ${vm.filter((x) => W(x, "val") === "restart").length}・continue ${vm.filter((x) => W(x, "val") !== "restart").length}</td></tr>
            <tr><td>tblBorders</td><td>${flatTags(one(t, "w:tblBorders"))}</td></tr>
            <tr><td>有底色的格</td><td class="m">${shd}</td></tr>
            <tr><td>重複表頭列</td><td class="m">${countTag(t, "w:tblHeader")}</td></tr>
            <tr><td>列高</td><td class="m">${all(t, "w:trHeight").map((h) => `${W(h, "val")} ${W(h, "hRule") || ""}`).join("、") || "自動"}</td></tr>`;
        });
        v.sub.textContent = `${rows.length} 個表格`;
        v.body.innerHTML = `${table(["項目", "值"], rows)}<p>vMerge continue 的格子仍然存在於 XML，只是內容被上方的 restart 格吃掉；預覽換算成 HTML 的 rowspan。</p>`;
      } });
      ctx.group(BORDER_MODES, 0, (i) => { o.border = i; v.refresh(); });
      ctx.toggle("合併儲存格", true, (x) => { o.merge = x; v.refresh(); });
      ctx.toggle("斑馬紋", true, (x) => { o.zebra = x; v.refresh(); });
      download(ctx, () => buildTables(o), () => "表格示範.docx");
      v.refresh();
    },
  },
  {
    id: "media", title: "圖片、超連結與註腳", paper: true,
    api: "ImageRun({ type, data, transformation, floating, crop, outline }) ・ ExternalHyperlink ・ InternalHyperlink ・ Bookmark ・ FootnoteReferenceRun",
    desc: "圖片是在頁面上用 canvas 畫的長條圖，轉成 PNG 或 JPEG 位元組後放進 ImageRun；可調寬度、切換文繞圖（浮動在右側、文字環繞）。同一張圖第二次使用時加上裁切、紅框與旋轉，zip 裡仍只存一份。另有外部與內部超連結（點預覽裡的內部連結會捲到書籤）以及兩個自動編號的註腳。",
    hint: "拖曳圖片寬度、開關文繞圖、換圖或換格式；點預覽裡的「跳到參考資料」",
    mount(ctx) {
      const o = { seed: 1, fmt: "png", w: 360, wrap: true };
      const build = () => buildMedia(o);
      const v = docView(ctx, { sideTitle: "媒體、關聯與註腳", build, async side(d, info) {
        const media = await Promise.all(d.zip.file(/^word\/media\//).map(async (f) => [f.name, (await f.async("uint8array")).length]));
        const rels = Object.entries(d.rels).filter(([, r]) => ["image", "hyperlink", "footnotes"].includes(r.type));
        v.sub.textContent = `${media.length} 個圖檔`;
        v.body.innerHTML = `<h4>word/media</h4>${table(["檔案", "大小"], media.map(([n, b]) => `<tr><td class="m">${esc(n)}</td><td class="m r">${bytesText(b)}</td></tr>`))}
          <p>原圖 480 × 270 像素；document.xml 有 ${countTag(d.doc, "a:blip")} 個 a:blip，zip 只有 ${media.length} 個檔（重複的圖只存一次）。顯示大小寫在 wp:extent，單位是 EMU。</p>
          <h4>document.xml.rels（節錄）</h4>${table(["Id", "類型", "目標"], rels.map(([id, r]) => `<tr><td class="m">${id}</td><td class="m">${r.type}</td><td class="m">${esc(r.target)}</td></tr>`))}
          <h4>footnotes.xml</h4>${table(["#", "內容"], [...d.fn.entries()].map(([id, f]) => `<tr><td class="m">${id}</td><td>${esc(f.textContent)}</td></tr>`))}
          <p>預覽共 ${info.fnCount} 個註腳參照，畫在頁面底部的分隔線下方。</p>`;
      } });
      ctx.slider("圖片寬度", { min: 200, max: 600, step: 20, value: 360, format: (x) => `${x} px` }, (x) => { o.w = x; v.refresh(); });
      ctx.toggle("文繞圖", true, (x) => { o.wrap = x; v.refresh(); });
      ctx.group(["PNG", "JPEG"], 0, (i) => { o.fmt = i ? "jpg" : "png"; v.refresh(); });
      ctx.button("換一張圖", () => { o.seed = (o.seed % 9) + 1; v.refresh(); });
      download(ctx, build, () => "圖片與註腳.docx");
      v.refresh();
    },
  },
  {
    id: "sections", title: "頁首頁尾、分節與方向", paper: true,
    api: "sections[{ properties: { type, titlePage, page: { size, orientation, pageNumbers }, column } }] ・ PageNumber.CURRENT ・ TOTAL_PAGES_IN_SECTION",
    desc: "三節的年度報告：第 1 節直式，封面可設為「首頁不同」而不顯示頁首頁尾，頁碼格式可換成羅馬數字或國字；第 2 節換成橫向並從 1 重新編頁，放一張 8 欄的寬表；第 3 節分成多欄並加分隔線，沒有指定頁首頁尾所以沿用上一節。頁尾同時用 PAGE、SECTIONPAGES、NUMPAGES 三個欄位。",
    hint: "開關首頁不同與附錄橫向、換頁碼格式、拖曳欄數；看每頁上方的頁碼與節號",
    mount(ctx) {
      const o = { title: true, fmt: 0, land: true, cols: 2 };
      const v = docView(ctx, { sideTitle: "各節的 sectPr", build: () => buildSections(o), side(d, info) {
        const cm = (pt) => (pt / 28.3465).toFixed(1);
        const ref = (s, k) => ["default", "first"].filter((t) => s.refs[k][t]).map((t) => `${t}${s.own[k].includes(t) ? "" : "（沿用）"}`).join("、") || "無";
        v.sub.textContent = `${info.secs.length} 節・${info.pages} 頁`;
        v.body.innerHTML = info.secs.map((s, i) => `<h4>第 ${i + 1} 節</h4>${table(["項目", "值"], [
          `<tr><td>紙張</td><td class="m">${cm(s.w)} × ${cm(s.h)} cm・${s.orient}</td></tr>`,
          `<tr><td>邊界</td><td class="m">上 ${cm(s.mar.top)}・左右 ${cm(s.mar.left)} cm</td></tr>`,
          `<tr><td>頁碼</td><td class="m">${s.start != null ? `從 ${s.start} 開始` : "接續"}・${s.fmt}</td></tr>`,
          `<tr><td>欄數</td><td class="m">${s.cols}${s.cols > 1 ? `・間距 ${s.space} pt${s.sep ? "・分隔線" : ""}` : ""}</td></tr>`,
          `<tr><td>首頁不同</td><td>${s.titlePg ? "是" : "否"}</td></tr>`,
          `<tr><td>頁首</td><td class="m">${ref(s, "header")}</td></tr>`,
          `<tr><td>頁尾</td><td class="m">${ref(s, "footer")}</td></tr>`,
          `<tr><td>頁數</td><td class="m">${info.secPages[i]}</td></tr>`])}`).join("") + `<p>橫向時 docx 會自動對調寬高並寫入 orient=landscape。預覽的分頁只依檔案裡的分頁符號與分節，內容過長不會自動換頁。</p>`;
      } });
      ctx.toggle("首頁不同", true, (x) => { o.title = x; v.refresh(); });
      ctx.group(PNF.map((p) => p[0]), 0, (i) => { o.fmt = i; v.refresh(); });
      ctx.toggle("附錄橫向", true, (x) => { o.land = x; v.refresh(); });
      ctx.slider("附錄 B 欄數", { min: 1, max: 3, step: 1, value: 2, format: (x) => `${x} 欄` }, (x) => { o.cols = x; v.refresh(); });
      download(ctx, () => buildSections(o), () => "分節示範.docx");
      v.refresh();
    },
  },
  {
    id: "stress", title: "極限測試", kind: "stress", paper: true,
    api: "Paragraph × n 或 TableRow × n ・ Packer.toBlob ・ JSZip 讀回驗證",
    desc: "逐級產生 100 到 100,000 筆資料的文件，可選每筆一個段落，或每筆一列的 5 欄表格。計時分三段：建構 docx 物件、Packer.toBlob 打包成 zip、JSZip 解開並用正規表示式核對段落數與列數。下方預覽最後一級的讀回結果，中間省略。",
    hint: "按左側「開始測試」；切換段落或表格列、開關 prettify 再測一次比較",
    mount(ctx) {
      ctx.html(`<div class="dx-stress"><table class="dx-res"><thead><tr><th>數量</th><th>模式</th><th>建構</th><th>toBlob</th><th class="dx-hn">讀回</th><th>大小</th><th class="dx-hn">每筆</th></tr></thead><tbody><tr><td class="zh" colspan="7">尚未測試；下方是 100 段的樣本</td></tr></tbody></table>
        <div class="dx-view"><div class="dx-cap"><b>最後一級的讀回預覽</b><span class="dx-mut">只畫頭 12 筆與尾 6 筆</span><span class="dx-meta"></span></div><div class="dx-scroll"><div class="dx-pages"></div></div></div></div>`);
      ctx.controls.classList.add("bottom");
      const o = { mode: 0, pretty: false };
      ctx.group(["段落", "表格列"], 0, (i) => { o.mode = i; });
      ctx.toggle("prettify XML", false, (x) => { o.pretty = x; });
      let last = null;
      ctx.onCleanup(() => last?.dispose());
      const preview = (d, label) => {
        if (!ctx.active) return d.dispose();
        last?.dispose();
        last = d;
        renderDoc(d, ctx.$(".dx-pages"));
        ctx.$(".dx-meta").textContent = label;
      };
      D.Packer.toBlob(stressDoc(100, 0)).then((b) => readDocx(b, trimOf(0))).then((d) => preview(d, "100 段・document.xml 已裁切")).catch((e) => console.error(e));
      const results = [], resBody = ctx.$(".dx-res tbody");
      ctx.bench({
        label: "資料量", unit: "筆", sizes: [100, 1000, 5000, 20000, 50000, 100000], target: 1500, budget: 6000,
        async run(n) {
          const mode = o.mode, t0 = performance.now(), doc = stressDoc(n, mode), t1 = performance.now();
          const blob = await D.Packer.toBlob(doc, o.pretty), t2 = performance.now();
          const d = await readDocx(blob, trimOf(mode)), t3 = performance.now();
          const want = mode ? { p: 5 * (n + 1) + 1, tr: n + 1 } : { p: n, tr: 0 };
          if (d.count.p !== want.p || d.count.tr !== want.tr) { d.dispose(); throw new Error(`讀回 ${d.count.p} 段、${d.count.tr} 列，預期 ${want.p} 段、${want.tr} 列`); }
          const what = (mode ? "表格列" : "段落") + (o.pretty ? "＋prettify" : "");
          results.unshift([n, what, t1 - t0, t2 - t1, t3 - t2, blob.size]);
          resBody.innerHTML = results.slice(0, 8).map(([m, w, x, y, z, s]) => `<tr><td>${fmt(m)}</td><td class="zh">${w}</td><td>${fmtMs(x)}</td><td>${fmtMs(y)}</td><td class="dx-hn">${fmtMs(z)}</td><td>${bytesText(s)}</td><td class="dx-hn">${bytesText(s / m)}</td></tr>`).join("");
          ctx.timeout(() => preview(d, `${fmt(n)} 筆・document.xml ${bytesText(d.count.len)}`), 0);
          return `toBlob ${fmtMs(t2 - t1)}・${bytesText(blob.size)}`;
        },
        note: "計時包含建構（new Paragraph 或 TableRow 物件）、Packer.toBlob 序列化 XML 並壓縮、JSZip 解開並計數 w:p 與 w:tr；畫預覽不計時，而且只解析裁切後的 XML。表格每列 5 格、每格各一個段落，所以同樣筆數的檔案比段落模式大很多。prettify 會加入縮排與換行，XML 變長、壓縮後差異較小。超過 6 秒的那一級之後就停止。",
      });
    },
  },
] });
