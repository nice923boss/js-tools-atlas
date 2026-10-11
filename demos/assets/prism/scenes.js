// Scenes for demos/prism.html. Data lives in data.js (window.PR).
(() => {
  const { CDN, PLAY, PLUGINS, LAZY, EXT_CODE, TREE, HOOK_CODE, BENCH } = window.PR;
  const h = Showcase.h;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const HLJS = "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.12.0/highlight.min.js";
  const NW_SRC = `${CDN}/plugins/normalize-whitespace/prism-normalize-whitespace.min.js`;
  const NW_OFF = { "remove-trailing": false, "remove-indent": false, "left-trim": false, "right-trim": false, "tabs-to-spaces": false };
  const NW_ON = { "remove-trailing": true, "remove-indent": true, "left-trim": true, "right-trim": true, "tabs-to-spaces": 2 };
  // The autoloader guesses its path from the <script> src, which breaks inside a jsDelivr combine URL; set it explicitly.
  Prism.plugins.autoloader.languages_path = `${CDN}/components/`;
  // Previewer popups are created once on <body> and cached by the plugin; park them between visits instead of leaking.
  const PARKED = [];
  const removeHook = (name, fn) => { const list = Prism.hooks.all[name] || []; const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); };
  const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.map(textOf).join("") : textOf(c.content));
  const grammarNames = () => new Set(Object.keys(Prism.languages).filter((k) => typeof Prism.languages[k] === "object"));
  const codeBlock = (lang, text, preAttrs = {}) => {
    const code = h("code", { class: `language-${lang}`, text });
    return [h("pre", { class: `language-${lang}`, ...preAttrs }, code), code];
  };

  Showcase.run({ scenes: [
    {
      id: "plugins", title: "外掛組合",
      api: "class=\"line-numbers\"・data-line・diff-highlight・command-line・previewers・toolbar",
      desc: "Prism 的外掛全靠 class 與 data-* 屬性啟用，不用另寫 JavaScript。這裡把八個官方外掛套在四種情境上，底部即時顯示啟用它們的 <pre> 標記。",
      hint: "切換情境與外掛；點程式碼行可增減高亮，CSS 情境把滑鼠移到數值上看預覽",
      async mount(ctx) {
        document.body.append(...PARKED.splice(0));
        ctx.onCleanup(() => document.querySelectorAll("body > .prism-previewer").forEach((p) => { p.classList.remove("active", "flipped"); PARKED.push(p); p.remove(); }));
        ctx.html(`<div class="pr-fill pr-plug-grid">
          <section class="pr-pane"><div class="pr-head"><b class="file"></b><span class="sp"></span><span class="tip"></span></div>
            <div class="pr-stage"></div>
            <div class="pr-sbar" title="外掛透過 class 與 data-* 屬性啟用"><pre><code class="markup"></code></pre></div></section>
          <aside class="pr-pane side"><div class="pr-plugs"></div></aside></div>`);
        const stage = ctx.$(".pr-stage");
        const state = { numbers: true, highlight: true, braces: true, diff: true, cmd: true, preview: true };
        const marked = new Set(PLAY[0].lines);
        let cur = 0;
        const seg = ctx.group(PLAY.map((p) => p.label), 0, (i) => { cur = i; render(); });
        const uses = (k) => k === "toolbar" || (k === "swatch" ? PLAY[cur].id === "css" : PLAY[cur].plugins.includes(k));
        const on = (k) => uses(k) && state[k];
        const toRanges = (set) => {
          const nums = [...set].sort((a, b) => a - b), out = [];
          for (let i = 0; i < nums.length; i++) {
            let j = i;
            while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
            out.push(i === j ? String(nums[i]) : `${nums[i]}-${nums[j]}`);
            i = j;
          }
          return out.join(",");
        };
        const plugBtns = PLUGINS.map((p) => {
          const b = h("button", { class: `pr-plug${p.fixed ? " fixed" : ""}`, type: "button" });
          b.innerHTML = `<b>${p.name}<code>${p.id}</code></b><small>${p.desc}</small><i class="sw"></i>`;
          if (!p.fixed) b.addEventListener("click", () => { state[p.key] = !state[p.key]; render(); });
          ctx.$(".pr-plugs").append(b);
          return b;
        });
        function render() {
          const s = PLAY[cur];
          const old = stage.querySelector("pre");
          const keep = old && old.dataset.sub === s.id ? [old.scrollTop, old.scrollLeft] : [0, 0];
          const lang = s.id === "diff" && !state.diff ? "diff" : s.lang;
          const [pre, code] = codeBlock(lang, s.code);
          if (on("numbers")) pre.classList.add("line-numbers");
          if (on("braces")) pre.classList.add("match-braces", "rainbow-braces");
          if (s.id === "diff" && state.diff) pre.classList.add("diff-highlight");
          if (on("highlight") && marked.size) pre.setAttribute("data-line", toRanges(marked));
          if (on("cmd")) Object.entries({ "data-user": "clare", "data-host": "atlas", "data-output": s.output }).forEach(([k, v]) => pre.setAttribute(k, v));
          if (s.id === "css" && !state.preview) pre.setAttribute("data-previewers", "");
          pre.classList.toggle("command-line", on("cmd"));
          // Show the activating markup before the toolbar attributes are added.
          const attrs = [...pre.attributes].map((a) => `${a.name}="${a.value}"`).join(" ");
          ctx.$(".markup").innerHTML = Prism.highlight(`<pre ${attrs}>`, Prism.languages.markup, "markup");
          Object.entries({ "data-language": s.title, "data-prismjs-copy": "複製", "data-prismjs-copy-success": "已複製！", "data-prismjs-copy-error": "請按 Ctrl+C 複製", "data-prismjs-copy-timeout": "1800" }).forEach(([k, v]) => pre.setAttribute(k, v));
          pre.dataset.sub = s.id;
          stage.replaceChildren(pre);
          Prism.highlightElement(code);
          [pre.scrollTop, pre.scrollLeft] = keep;
          ctx.$(".file").textContent = s.file;
          ctx.$(".tip").textContent = { lines: on("highlight") ? "點任一行切換高亮" : "", diff: "以 language-diff-javascript 上色", cli: on("cmd") ? "指令與輸出自動區分" : "", css: on("preview") ? "滑鼠移到數值上看預覽" : "" }[s.id];
          [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === cur)));
          plugBtns.forEach((b, i) => {
            const p = PLUGINS[i];
            b.disabled = !uses(p.key);
            b.setAttribute("aria-pressed", String(p.fixed ? uses(p.key) : on(p.key)));
            b.title = b.disabled ? "這個情境用不到此外掛" : "";
          });
        }
        // Click a code line to toggle it in data-line (line-highlight plugin).
        ctx.on(stage, "click", (e) => {
          const pre = stage.querySelector("pre");
          if (!pre || !on("highlight") || e.target.closest(".toolbar")) return;
          const cs = getComputedStyle(pre);
          const top = pre.getBoundingClientRect().top + parseFloat(cs.paddingTop) - pre.scrollTop;
          const line = Math.floor((e.clientY - top) / parseFloat(cs.lineHeight)) + 1;
          if (line < 1 || line > PLAY[cur].code.split("\n").length) return;
          if (marked.has(line)) marked.delete(line); else marked.add(line);
          render();
        });
        // Auto tour: rotate the four setups; in the CSS one, fake hovers so the previewers pop up.
        let touring = true;
        const hoverToken = (match) => {
          const pre = stage.querySelector("pre");
          const prev = pre && pre.querySelector(".pr-tour");
          if (prev) { prev.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })); prev.classList.remove("pr-tour"); }
          const tok = match && pre && [...pre.querySelectorAll(".token")].find((t) => t.textContent.startsWith(match));
          if (!tok) return;
          tok.classList.add("pr-tour");
          tok.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        };
        const tourStep = () => {
          if (!touring) return;
          cur = (cur + 1) % PLAY.length;
          render();
          if (PLAY[cur].id === "css") [["linear-gradient", 700], ["cubic-bezier", 2300], ["hsla", 3900], [null, 5400]].forEach(([m, t]) => ctx.timeout(() => touring && hoverToken(m), t));
          ctx.timeout(tourStep, 6000);
        };
        const stopTour = () => { if (touring) { touring = false; hoverToken(null); } };
        ctx.on(ctx.el, "pointerdown", stopTour, true);
        ctx.on(ctx.el, "keydown", stopTour, true);
        render();
        ctx.timeout(tourStep, 6000);
      },
    },
    {
      id: "autoload", title: "自動載入語法",
      api: "Prism.plugins.autoloader.loadLanguages(langs, ok, err)・languages_path",
      desc: "本頁只打包 7 種語法。autoloader 外掛遇到沒載入的語言時，會連同相依語法一起從 CDN 下載：PHP 需要 markup-templating，TSX 需要 jsx 與 typescript。下方列出實際下載的檔案與新增的語法名稱。",
      hint: "點左側語言，第一次會即時下載語法與它的相依檔",
      async mount(ctx) {
        ctx.html(`<div class="pr-fill pr-lz">
          <aside class="pr-pane side"><div class="pr-langs"></div></aside>
          <section class="pr-pane"><div class="pr-head"><b class="lang">…</b><span class="sp"></span><code class="cls"></code></div><div class="pr-body code"></div>
            <dl class="pr-kv"><dt>已載入語法</dt><dd class="cnt"></dd><dt>這次新增</dt><dd class="added"></dd><dt>下載檔案</dt><dd class="files"></dd><dt>耗時</dt><dd class="ms"></dd></dl></section></div>`);
        const btns = Object.entries(LAZY).map(([id, [label]]) => {
          const b = h("button", { type: "button", "aria-pressed": "false" }, label, h("small"));
          ctx.on(b, "click", () => pick(id));
          ctx.$(".pr-langs").append(b);
          return [id, b];
        });
        const paint = (current) => btns.forEach(([id, b]) => {
          const ok = !!Prism.languages[id];
          b.setAttribute("aria-pressed", String(id === current));
          b.lastChild.textContent = ok ? "已載入" : "未載入";
          b.lastChild.className = ok ? "ok" : "";
        });
        const count = () => { ctx.$(".cnt").textContent = `${grammarNames().size} 個名稱（含別名）`; };
        let token = 0;
        async function pick(id) {
          const my = ++token, [label, sample] = LAZY[id];
          paint(id);
          ctx.$(".lang").textContent = label;
          ctx.$(".cls").textContent = `class="language-${id}"`;
          const before = grammarNames(), mark = performance.getEntriesByType("resource").length, t0 = performance.now();
          const fresh = !Prism.languages[id];
          const st = fresh ? ctx.status(`autoloader 下載 ${label} 語法…`) : null;
          try {
            await new Promise((ok, fail) => Prism.plugins.autoloader.loadLanguages(id, ok, (l) => fail(new Error(`無法載入 ${l}`))));
          } catch (e) {
            ctx.$(".ms").textContent = e.message;
            return;
          } finally { if (st) st.done(); }
          if (my !== token || !ctx.active) return;
          const [pre, code] = codeBlock(id, sample, { class: `language-${id} line-numbers` });
          ctx.$(".code").replaceChildren(pre);
          Prism.highlightElement(code);
          const added = [...grammarNames()].filter((k) => !before.has(k));
          const files = performance.getEntriesByType("resource").slice(mark).map((e) => e.name).filter((n) => n.includes("/components/prism-")).map((n) => n.split("/").pop());
          ctx.$(".added").textContent = fresh ? added.join("、") || "（無）" : "先前已載入，這次沒有新增";
          ctx.$(".files").textContent = files.join("、") || "（沒有下載）";
          ctx.$(".ms").textContent = fresh ? Showcase.fmtMs(performance.now() - t0) : "0 ms";
          count();
          paint(id);
        }
        count();
        paint("");
        pick("php");
      },
    },
    {
      id: "themes", title: "主題對照",
      api: "prismjs/themes/*.css・prism-themes 套件・Prism.highlight(code, grammar, language)",
      desc: "Prism 只輸出 <span class=\"token …\">，配色全交給主題 CSS。同一份輸出放進四個 iframe 各自載入主題，主題的全域選擇器不會互相干擾，也不影響外框。",
      hint: "切換官方主題與社群 prism-themes，也可換範例語言",
      async mount(ctx) {
        ctx.html(`<div class="pr-themes"></div>`);
        const OFFICIAL = (t) => `${CDN}/themes/${t}.min.css`;
        const COMMUNITY = (t) => `https://cdn.jsdelivr.net/npm/prism-themes@1.9.0/themes/${t}.min.css`;
        const SETS = [
          [["prism", OFFICIAL], ["prism-coy", OFFICIAL], ["prism-solarizedlight", OFFICIAL], ["prism-funky", OFFICIAL]],
          [["prism-dark", OFFICIAL], ["prism-okaidia", OFFICIAL], ["prism-twilight", OFFICIAL], ["prism-tomorrow", OFFICIAL]],
          [["prism-one-dark", COMMUNITY], ["prism-vsc-dark-plus", COMMUNITY], ["prism-dracula", COMMUNITY], ["prism-nord", COMMUNITY]],
        ];
        const SAMPLES = { JavaScript: ["javascript", PLAY[0].code], CSS: ["css", PLAY[3].code] };
        let set = 1, sample = "JavaScript";
        ctx.group(["官方淺色系", "官方深色系", "prism-themes"], 1, (i) => { set = i; render(); });
        ctx.select("範例", Object.keys(SAMPLES), sample, (v) => { sample = v; render(); });
        const mono = getComputedStyle(document.body).getPropertyValue("--mono").trim() || "monospace";
        const grid = ctx.$(".pr-themes");
        function render() {
          const [lang, text] = SAMPLES[sample];
          const html = Prism.highlight(text, Prism.languages[lang], lang);
          grid.replaceChildren(...SETS[set].map(([theme, url]) => {
            const frame = h("iframe", { title: `${theme} 主題預覽` });
            frame.srcdoc = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${url(theme)}"><style>html,body{margin:0;height:100%}pre[class*="language-"]{margin:0!important;min-height:100%;box-sizing:border-box;border-radius:0!important}code[class*="language-"],pre[class*="language-"]{font-family:${mono};font-size:12px;line-height:1.55;tab-size:2}</style><pre class="language-${lang}"><code class="language-${lang}">${html}</code></pre>`;
            return h("section", { class: "pr-pane" }, h("div", { class: "pr-head" }, h("b", { text: theme }), h("span", { class: "sp" }), h("code", { text: url === OFFICIAL ? "prismjs/themes" : "prism-themes" })), frame);
          }));
        }
        render();
      },
    },
    {
      id: "extend", title: "擴充語法",
      api: "Prism.languages.extend(id, redef)・Prism.languages.insertBefore(inside, before, insert)",
      desc: "語法是一個有順序的 token 物件，Prism 依序比對、先比對到的先贏。extend() 複製既有語法並把新 token 加在最後；insertBefore() 把 token 插到指定位置。把 TODO 規則插在 comment 之後，註解會先被吃掉，TODO 就永遠不會出現。",
      hint: "切換 TODO 規則的插入位置，看順序如何決定結果",
      async mount(ctx) {
        ctx.html(`<div class="pr-fill">
          <section class="pr-pane"><div class="pr-head"><b>signup.js</b><span class="sp"></span><code>language-atlasjs</code></div><div class="pr-body"><pre class="language-atlasjs"><code class="language-atlasjs"></code></pre></div><div class="pr-chips"></div></section>
          <aside class="pr-pane side"><div class="pr-head">Prism.languages.atlasjs 的 token 順序</div><ol class="pr-order"></ol></aside></div>`);
        let todo = 1, http = true, api = true;
        ctx.group(["不加 TODO", "TODO 在 comment 前", "TODO 在 comment 後"], 1, (i) => { todo = i; build(); });
        ctx.toggle("HTTP 方法", true, (v) => { http = v; build(); });
        ctx.toggle("extend 加 atlas", true, (v) => { api = v; build(); });
        ctx.onCleanup(() => { delete Prism.languages.atlasjs; });
        function build() {
          // Rebuild from a fresh copy each time so toggles never stack.
          // No lookahead on ".": earlier tokens (punctuation) have already split the text, so a lookahead could never see it.
          Prism.languages.atlasjs = Prism.languages.extend("javascript", api ? { "atlas-api": { pattern: /\batlas\b/, alias: "builtin" } } : {});
          const added = { "atlas-api": "extend 附加在最後" };
          if (todo) {
            Prism.languages.insertBefore("atlasjs", todo === 1 ? "comment" : "string", { todo: { pattern: /\/\/\s*(?:TODO|FIXME)\b.*/, greedy: true } });
            added.todo = `insertBefore("${todo === 1 ? "comment" : "string"}")`;
          }
          if (http) {
            Prism.languages.insertBefore("atlasjs", "string", { "http-method": { pattern: /(["'])(?:GET|POST|PUT|PATCH|DELETE)\1/, greedy: true } });
            added["http-method"] = "insertBefore(\"string\")";
          }
          const code = ctx.$("pre code");
          code.innerHTML = Prism.highlight(EXT_CODE, Prism.languages.atlasjs, "atlasjs");
          ctx.$(".pr-order").innerHTML = Object.keys(Prism.languages.atlasjs).map((k) => `<li class="${added[k] ? "add" : ""}">${esc(k)}${added[k] ? `<small>${esc(added[k])}</small>` : ""}</li>`).join("");
          const count = (cls) => code.querySelectorAll(`.token.${cls}`).length;
          ctx.$(".pr-chips").innerHTML = ["todo", "http-method", "atlas-api", "comment", "string"].map((k) => `<span class="${count(k) && added[k] ? "on" : ""}">.${k} × ${count(k)}</span>`).join("");
        }
        build();
      },
    },
    {
      id: "tree", title: "Token 樹",
      api: "Prism.tokenize(text, grammar)・Prism.Token { type, content, alias }",
      desc: "Prism.tokenize() 回傳的是巢狀的 Token 陣列，highlight() 只是把它轉成 HTML。右邊把整棵樹攤開：HTML 裡的屬性值、事件處理器裡的 JavaScript 都是一層層的 inside 語法。滑過節點即可在左邊標出對應文字。",
      hint: "改左邊的程式碼，右邊的樹即時更新；滑過右邊節點看對應位置",
      async mount(ctx) {
        ctx.html(`<div class="pr-fill">
          <section class="pr-pane"><div class="pr-head"><b class="lang"></b><span class="sp"></span><code class="n"></code></div><div class="pr-ov"><pre class="language-none" aria-hidden="true"><code></code></pre><textarea spellcheck="false" autocapitalize="off" aria-label="程式碼輸入區"></textarea></div></section>
          <aside class="pr-pane side"><div class="pr-head">Prism.tokenize() 結果</div><ul class="pr-tree"></ul></aside></div>`);
        const ta = ctx.$("textarea"), pre = ctx.$(".pr-ov pre"), out = pre.firstChild, tree = ctx.$(".pr-tree");
        let lang = "javascript", nodes = [], touched = false;
        const keys = Object.keys(TREE);
        ctx.group(keys, 2, (i) => { [lang, ta.value] = TREE[keys[i]]; ctx.$(".lang").textContent = keys[i]; render(); });
        const walk = (content, depth) => {
          let html = "";
          for (const t of Array.isArray(content) ? content : [content]) {
            if (typeof t === "string") { html += esc(t); continue; }
            const id = nodes.length, alias = t.alias ? [].concat(t.alias) : [];
            nodes.push({ depth, type: t.type, alias, text: textOf(t), leaf: typeof t.content === "string" });
            html += `<span class="token ${t.type} ${alias.join(" ")}" data-k="${id}">${walk(t.content, depth + 1)}</span>`;
          }
          return html;
        };
        function render() {
          nodes = [];
          // Wrap in language-* so per-language theme rules (e.g. .language-css .token.string) apply.
          pre.className = `language-${lang}`;
          out.innerHTML = walk(Prism.tokenize(ta.value, Prism.languages[lang]), 0) + "\n";
          ctx.$(".n").textContent = `${nodes.length} 個 Token`;
          tree.innerHTML = nodes.map((n, i) => `<li data-k="${i}" style="padding-left:${6 + n.depth * 16}px"><b>${esc(n.type)}</b>${n.alias.length ? `<i>${esc(n.alias.join(" "))}</i>` : ""}${n.leaf ? `<code>${esc(JSON.stringify(n.text))}</code>` : ""}</li>`).join("");
        }
        const hot = (k) => {
          ctx.$$(".pr-hot, .pr-tree .hot").forEach((e) => e.classList.remove("pr-hot", "hot"));
          if (k == null) return;
          const span = out.querySelector(`[data-k="${k}"]`), li = tree.querySelector(`[data-k="${k}"]`);
          if (span) span.classList.add("pr-hot");
          if (li) { li.classList.add("hot"); if (!touched) li.scrollIntoView({ block: "nearest" }); }
        };
        ctx.on(tree, "pointerover", (e) => { const li = e.target.closest("li"); touched = true; hot(li ? li.dataset.k : null); });
        ctx.on(tree, "pointerleave", () => hot(null));
        ctx.on(ta, "scroll", () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
        ctx.on(ta, "input", () => { touched = true; render(); });
        [lang, ta.value] = TREE.HTML;
        ctx.$(".lang").textContent = "HTML";
        render();
        // Auto demo: walk through the nodes until the visitor takes over.
        let step = 0;
        ctx.interval(() => { if (!touched && nodes.length) hot(step++ % nodes.length); }, 900);
      },
    },
    {
      id: "hooks", title: "Hooks",
      api: "Prism.hooks.add('before-tokenize' | 'after-tokenize' | 'wrap' | 'complete', fn)",
      desc: "所有外掛都是用 hooks 寫成的。這裡三個自訂 hook：before-tokenize 在分析前把 Tab 換成空白，after-tokenize 統計 token 種類，wrap 在每個 token 變成 <span> 前加 class 與 title（四位數以上的金額加千分位提示、中文字串加底色）。Prism 沒有移除 API，關閉時直接從 Prism.hooks.all 移掉函式。",
      hint: "逐一關掉 hook 比較輸出；滑鼠移到有虛線的金額上看提示",
      async mount(ctx) {
        ctx.html(`<div class="pr-fill">
          <section class="pr-pane"><div class="pr-head"><b>cart.js</b><span class="sp"></span><code class="sum"></code></div><div class="pr-body code"></div><div class="pr-chips"></div></section>
          <aside class="pr-pane side"><div class="pr-head">hook 呼叫紀錄<span class="sp"></span><span class="n">0</span></div><ul class="pr-list pr-body"></ul></aside></div>`);
        const logEl = ctx.$(".pr-list");
        let calls = 0, wraps = 0, money = 0, zh = 0;
        const log = (hook, detail) => {
          ctx.$(".n").textContent = ++calls;
          logEl.prepend(h("li", { class: "new" }, h("span", { class: "t", text: `#${calls}` }), h("code", { text: hook }), ` ${detail}`));
          while (logEl.children.length > 30) logEl.lastChild.remove();
        };
        const mine = (env) => env.element && env.element.closest && env.element.closest(".pr-fill") === ctx.$(".pr-fill");
        const HOOKS = {
          "before-tokenize": (env) => {
            if (env.language !== "javascript") return;
            const n = (env.code.match(/\t/g) || []).length;
            env.code = env.code.replace(/\t/g, "  ");
            log("before-tokenize", `把 ${n} 個 Tab 換成兩個空白`);
          },
          "after-tokenize": (env) => {
            if (env.language !== "javascript") return;
            const counts = {};
            const visit = (list) => list.forEach((t) => { if (typeof t === "string") return; counts[t.type] = (counts[t.type] || 0) + 1; if (typeof t.content !== "string") visit([].concat(t.content)); });
            visit(env.tokens);
            const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            ctx.$(".pr-chips").innerHTML = top.map(([k, v]) => `<span>${esc(k)} × ${v}</span>`).join("");
            log("after-tokenize", `共 ${top.reduce((a, b) => a + b[1], 0)} 個 token，最多的是 ${top[0][0]}`);
          },
          wrap: (env) => {
            if (env.language !== "javascript") return;
            wraps++;
            if (env.type === "number" && +env.content >= 1000) { env.classes.push("pr-money"); env.attributes.title = `NT$ ${(+env.content).toLocaleString("zh-TW")}`; money++; }
            if (env.type === "string" && /[一-鿿]/.test(env.content)) { env.classes.push("pr-zh"); zh++; }
          },
        };
        const complete = (env) => {
          if (!mine(env)) return;
          if (on.wrap) log("wrap", `被呼叫 ${wraps} 次：${money} 個金額加提示、${zh} 個中文字串加底色`);
          log("complete", `插入 DOM，共 ${env.element.querySelectorAll(".token").length} 個 span`);
        };
        const on = { "before-tokenize": true, "after-tokenize": true, wrap: true };
        Prism.hooks.add("complete", complete);
        ctx.onCleanup(() => { Object.entries(HOOKS).forEach(([k, fn]) => removeHook(k, fn)); removeHook("complete", complete); });
        function rerun() {
          Object.entries(HOOKS).forEach(([k, fn]) => { removeHook(k, fn); if (on[k]) Prism.hooks.add(k, fn); });
          wraps = money = zh = 0;
          if (!on["after-tokenize"]) ctx.$(".pr-chips").innerHTML = `<span>after-tokenize 已關閉</span>`;
          const [pre, code] = codeBlock("javascript", HOOK_CODE, { class: "language-javascript line-numbers" });
          ctx.$(".code").replaceChildren(pre);
          Prism.highlightElement(code);
          ctx.$(".sum").textContent = `已掛 ${Object.values(on).filter(Boolean).length + 1} 個 hook`;
        }
        ctx.toggle("before-tokenize", true, (v) => { on["before-tokenize"] = v; rerun(); });
        ctx.toggle("after-tokenize", true, (v) => { on["after-tokenize"] = v; rerun(); });
        ctx.toggle("wrap", true, (v) => { on.wrap = v; rerun(); });
        rerun();
      },
    },
    {
      id: "all", title: "highlightAllUnder",
      api: "Prism.highlightAllUnder(container)・Prism.util.getLanguage(el)・normalize-whitespace",
      desc: "highlightAllUnder() 掃描容器內所有程式碼區塊，語言可以寫在 code、pre 或任一層祖先元素上（language-* 或簡寫 lang-*），language-none 只套外掛不上色。normalize-whitespace 外掛會在分析前清掉前後空行、多餘縮排與行尾空白。",
      hint: "開關「空白正規化」看第 ⑤ 段的變化；按 highlightAllUnder() 重新掃描",
      async mount(ctx) {
        ctx.html(`<div class="pr-fill"><section class="pr-pane"><div class="pr-doc"></div></section>
          <aside class="pr-pane side"><div class="pr-head">掃描結果<span class="sp"></span><code class="found"></code></div><ol class="pr-st"></ol></aside></div>`);
        const st = ctx.status("載入 normalize-whitespace 外掛…");
        try { await ctx.load(NW_SRC); } finally { st.done(); }
        const NW = Prism.plugins.NormalizeWhitespace;
        // The plugin hooks every highlight once loaded; keep it neutral outside this scene (its normalize() also writes into defaults).
        NW.setDefaults(NW_OFF);
        ctx.onCleanup(() => NW.setDefaults(NW_OFF));
        const before = (env) => { if (ctx.$(".pr-doc").contains(env.container) || env.container === ctx.$(".pr-doc")) ctx.$(".found").textContent = `找到 ${env.elements.length} 個元素`; };
        Prism.hooks.add("before-all-elements-highlight", before);
        ctx.onCleanup(() => removeHook("before-all-elements-highlight", before));
        let normalize = true;
        ctx.toggle("空白正規化", true, (v) => { normalize = v; run(); });
        ctx.button("highlightAllUnder()", () => run(), { primary: true });
        const BLOCKS = [
          { p: "① 外層 <code>&lt;div class=\"language-css\"&gt;</code>，裡面兩段都繼承", group: true, text: ".card { color: #f7df1e; }" },
          { group: true, text: ".card:hover { transform: scale(1.02); }" },
          { p: "② 簡寫 <code>class=\"lang-bash\"</code>", cls: "lang-bash", text: "npm run build && echo \"完成\"" },
          { p: "③ <code>language-none</code>：不上色，但工具列等外掛照樣套用", cls: "language-none", text: "這段是純文字，不做語法分析" },
          { p: "④ <code>line-numbers</code> 加 <code>data-start=\"42\"</code>", cls: "language-javascript", pre: { class: "line-numbers", "data-start": "42" }, text: "const total = items.length;\nconsole.log(`共 ${total} 筆`);" },
          { p: "⑤ 從別處複製來的程式碼：前後空行、整段多縮排、行尾空白、Tab", cls: "language-javascript", text: "\n\n        function greet(name) {   \n        \treturn \"嗨，\" + name;  \n        }\n\n\n" },
        ];
        function run() {
          const doc = ctx.$(".pr-doc");
          doc.replaceChildren();
          let wrap = null;
          for (const b of BLOCKS) {
            if (b.p) doc.append(h("p", { html: b.p }));
            const code = h("code", { class: b.cls || "", text: b.text });
            const pre = h("pre", b.pre || {}, code);
            if (b.group) { if (!wrap) doc.append((wrap = h("div", { class: "language-css" }))); wrap.append(pre); } else doc.append(pre);
          }
          NW.setDefaults(normalize ? NW_ON : NW_OFF);
          Prism.highlightAllUnder(doc);
          NW.setDefaults(NW_OFF);
          ctx.$(".pr-st").innerHTML = ctx.$$(".pr-doc code").map((c, i) => {
            const lang = Prism.util.getLanguage(c), n = c.querySelectorAll(".token").length;
            return `<li class="${n ? "" : "skip"}"><b>${"①①②③④⑤"[i]}${i === 1 ? "（第二段）" : ""} ${esc(lang)}</b>　${n} 個 token<code>class="${esc(c.className)}"</code></li>`;
          }).join("");
        }
        run();
      },
    },
    {
      id: "stress", title: "極限測試", kind: "stress",
      api: "Prism.highlight(text, Prism.languages.javascript, 'javascript')・hljs.highlight(text, { language })",
      desc: "從 16 KB 加到 4 MB 的 JavaScript，量 Prism.highlight() 產生 HTML 的耗時與每秒處理量；切到 highlight.js 再跑一次，右側表格並列兩者同級距的耗時。",
      hint: "按「開始測試」逐級加大；切換引擎後再跑一次即可對照",
      async mount(ctx) {
        ctx.html(`<div class="pr-stress"><section class="pr-pane" style="flex:none"><div class="pr-head"><b>同級距對照</b><span class="sp"></span><code>毫秒，越小越快</code></div><table class="pr-cmp"><thead><tr><th>級距</th><th>Prism</th><th>highlight.js</th><th>倍數</th></tr></thead><tbody></tbody></table></section>
          <section class="pr-pane"><div class="pr-head"><b>輸出預覽</b><span class="sp"></span><code class="info">尚未執行</code></div><div class="pr-body"><pre class="language-javascript"><code class="language-javascript"></code></pre></div></section></div>`);
        ctx.controls.classList.add("bottom");
        const st = ctx.status("載入 highlight.js 供對照…");
        try { await ctx.load(HLJS); } finally { st.done(); }
        const SIZES = [16, 64, 256, 1024, 2048, 4096], cmp = {}, out = ctx.$("pre code");
        let engine = 0;
        ctx.group(["Prism", "highlight.js"], 0, (i) => (engine = i));
        const fmtKB = (kb) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`);
        const table = () => {
          ctx.$(".pr-cmp tbody").innerHTML = SIZES.map((kb) => {
            const [p, j] = [0, 1].map((e) => cmp[kb] && cmp[kb][e]);
            const ratio = p && j ? `${(j / p).toFixed(2)}×` : "";
            return `<tr><td>${fmtKB(kb)}</td><td class="${p && j && p < j ? "win" : ""}">${p ? p.toFixed(1) : "…"}</td><td class="${p && j && j < p ? "win" : ""}">${j ? j.toFixed(1) : "…"}</td><td>${ratio}</td></tr>`;
          }).join("");
        };
        table();
        ctx.bench({
          label: "程式碼", unit: "KB", sizes: SIZES,
          prepare: (kb) => BENCH.repeat(Math.ceil((kb * 1024) / BENCH.length)).slice(0, kb * 1024),
          run: (kb, text) => {
            const t0 = performance.now();
            const html = engine === 0 ? Prism.highlight(text, Prism.languages.javascript, "javascript") : hljs.highlight(text, { language: "javascript" }).value;
            const ms = performance.now() - t0;
            (cmp[kb] = cmp[kb] || {})[engine] = ms;
            table();
            out.className = engine === 0 ? "language-javascript" : "hljs language-javascript";
            out.innerHTML = html.slice(0, html.indexOf("\n", 6000) + 1 || 6000);
            ctx.$(".info").textContent = `${engine === 0 ? "Prism" : "highlight.js"}・輸出 ${(html.length / 1048576).toFixed(1)} MB HTML`;
            return `${Showcase.fmt(Math.round(kb / (ms / 1000)))} KB/s`;
          },
          note: "耗時只算由原始碼產生 HTML 字串，不含插入 DOM。本頁已載入的 Prism 外掛（例如 inline-color 的 wrap hook）也會在每個 token 上執行，計入 Prism 的時間。預覽區只顯示輸出開頭；本頁沒有載入 highlight.js 主題，切到它時預覽不上色。",
        });
      },
    },
  ] });
})();
