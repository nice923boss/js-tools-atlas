// Sample code and plugin catalogue for demos/prism.html (kept apart so the scene file stays readable).
window.PR = (() => {
  const CDN = "https://cdn.jsdelivr.net/npm/prismjs@1.30.0";

  // Scene 1: four plugin setups, each a plain <pre><code> switched on through classes and data-* attributes.
  const PLAY = [
    {
      id: "lines", label: "行號＋高亮", lang: "javascript", title: "JavaScript", file: "courses.js",
      plugins: ["numbers", "highlight", "braces"], lines: [3, 4, 8, 9],
      code: `// 載入課程清單並依報名人數排序（示意資料）
export async function loadCourses(city = "台北") {
  const res = await fetch(\`/api/courses?city=\${city}\`);
  if (!res.ok) throw new Error(\`讀取失敗：\${res.status}\`);

  const courses = await res.json();
  return courses
    .filter((c) => c.seats > 0)
    .sort((a, b) => b.signups - a.signups)
    .map(({ id, title, signups }) => ({
      id,
      title,
      label: \`\${title}（\${signups} 人）\`,
    }));
}

const list = await loadCourses("台中");
console.table(list.slice(0, 5));`,
    },
    {
      id: "diff", label: "Diff 差異", lang: "diff-javascript", title: "Diff（JS）", file: "cart.js.diff",
      plugins: ["numbers", "diff", "braces"],
      code: ` // 計算購物車總金額（示意資料）
-function total(items) {
-  let sum = 0;
-  for (let i = 0; i < items.length; i++) {
-    sum += items[i].price * items[i].qty;
-  }
-  return sum;
-}
+const TAX_RATE = 0.05;
+
+export function total(items, { withTax = false } = {}) {
+  const sum = items.reduce((acc, it) => acc + it.price * it.qty, 0);
+  return withTax ? Math.round(sum * (1 + TAX_RATE)) : sum;
+}

 console.log(total(cart));
+console.log(total(cart, { withTax: true }));`,
    },
    {
      id: "cli", label: "命令列", lang: "bash", title: "Shell", file: "終端機",
      plugins: ["cmd"], output: "4,6-7,9-10",
      code: `npm create vite@latest my-app -- --template vanilla
cd my-app
npm install
added 12 packages in 3s
npm run dev
  VITE ready in 312 ms
  Local:   http://localhost:5173/
git add . && git commit -m "初始化專案"
[main (root-commit) 3f2a1c9] 初始化專案
 8 files changed, 214 insertions(+)`,
    },
    {
      id: "css", label: "CSS 色票", lang: "css", title: "CSS", file: "theme.css",
      plugins: ["numbers", "braces", "preview"],
      code: `/* 品牌色與動態，滑鼠移到數值上可預覽 */
:root {
  --brand: #f7df1e;
  --sky: hsl(195, 85%, 62%);
  --rose: rgb(247, 37, 133);
  --mint: #7bd389;
}

.hero {
  background: linear-gradient(135deg, #4cc9f0, #9d8cff 60%, #f72585);
  color: rgba(14, 16, 19, 0.92);
  transform: rotate(-2deg);
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hero:hover {
  transform: rotate(0deg) scale(1.03);
  box-shadow: 0 12px 32px hsla(195, 85%, 62%, 0.45);
}`,
    },
  ];

  const PLUGINS = [
    { key: "numbers", name: "行號", id: "line-numbers", desc: "左側加上行號欄" },
    { key: "highlight", name: "行高亮", id: "line-highlight", desc: "用 data-line 強調指定行" },
    { key: "braces", name: "括號配對", id: "match-braces", desc: "彩虹括號，滑過顯示成對括號" },
    { key: "diff", name: "Diff 高亮", id: "diff-highlight", desc: "增刪行加底色，保留 JS 語法色" },
    { key: "cmd", name: "命令列", id: "command-line", desc: "加提示字元，區分指令與輸出" },
    { key: "preview", name: "預覽浮窗", id: "previewers", desc: "滑過顏色、漸層、曲線即預覽" },
    { key: "swatch", name: "色塊", id: "inline-color", desc: "顏色值前加小色塊（固定）", fixed: true, only: "css" },
    { key: "toolbar", name: "工具列", id: "toolbar", desc: "語言標籤與複製鈕（固定）", fixed: true },
  ];

  // Scene 2: grammars that are NOT in the page bundle; the autoloader fetches them plus their dependencies.
  const LAZY = {
    python: ["Python", `# 計算各縣市報名人數（示意資料）
from collections import Counter

rows = [{"city": "台北"}, {"city": "台中"}, {"city": "台北"}]
for city, n in Counter(r["city"] for r in rows).most_common(2):
    print(f"{city}：{n} 人")`],
    php: ["PHP", `<!-- 課程列表樣板：PHP 依賴 markup-templating -->
<h2><?= htmlspecialchars($title) ?></h2>
<?php foreach ($courses as $c): ?>
  <p><?= $c['name'] ?>，剩 <?= max(0, $c['seats']) ?> 位</p>
<?php endforeach; ?>`],
    tsx: ["TSX", `// TSX 需要 jsx 與 typescript 兩個語法
type Course = { id: number; title: string; city: string };

export function CourseList({ items }: { items: Course[] }) {
  return (
    <ul className="courses">
      {items.map((c) => <li key={c.id}>{c.title}（{c.city}）</li>)}
    </ul>
  );
}`],
    rust: ["Rust", `// 找出座位數最多的課程
struct Course { name: String, seats: u32 }

fn busiest(list: &[Course]) -> Option<&Course> {
    list.iter().max_by_key(|c| c.seats)
}`],
    go: ["Go", `// 平行抓取多個網址
func fetchAll(urls []string) {
	var wg sync.WaitGroup
	for _, u := range urls {
		wg.Add(1)
		go func(url string) { defer wg.Done(); http.Get(url) }(u)
	}
	wg.Wait()
}`],
    kotlin: ["Kotlin", `// 依城市分組報名資料
data class Signup(val name: String, val city: String)

fun byCity(rows: List<Signup>) = rows
    .groupBy { it.city }
    .mapValues { (_, v) -> v.size }`],
    yaml: ["YAML", `# GitHub Actions：推上 main 就部署
name: deploy
on:
  push:
    branches: [main]
jobs:
  pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4`],
    docker: ["Docker", `# 打包 atlas 靜態網站
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html`],
  };

  const EXT_CODE = `// TODO: 改成從設定檔讀取 API 位址
const BASE = "https://api.example.tw";
/* 一般區塊註解不受影響 */
async function signup(courseId, name) {
  // FIXME: 名額滿了要改成候補
  const res = await fetch(\`\${BASE}/courses/\${courseId}\`, {
    method: "POST",
    body: JSON.stringify({ name, city: "高雄" }),
  });
  atlas.toast("報名成功");
  return res.json();
}

atlas.track("signup", { method: "GET" });`;

  const TREE = {
    JavaScript: ["javascript", `const fee = price * 1.05; // 含稅
if (fee > 3000) notify("高單價課程");`],
    CSS: ["css", `.btn:hover {
  color: #f7df1e;
  margin: 0 auto;
}`],
    HTML: ["markup", `<button class="btn" onclick="buy(42)">
  立即報名
</button>`],
  };

  const HOOK_CODE = `// 購物車小計（用 Tab 縮排）
const cart = [
\t{ name: "Python 入門", price: 3600, qty: 1 },
\t{ name: "資料視覺化", price: 12800, qty: 2 },
];

function subtotal(items) {
\treturn items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

console.log(subtotal(cart)); // 29200`;

  const BENCH = PLAY[0].code + "\n" + PLAY[1].code.replace(/^[ +-]/gm, "") + "\n";

  return { CDN, PLAY, PLUGINS, LAZY, EXT_CODE, TREE, HOOK_CODE, BENCH };
})();
