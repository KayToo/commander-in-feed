/* Keeps Feed selected across One line, Two lines, and Full. Timeline hides the sub-options. */
(function () {
  const feedBtn = document.getElementById("nav-feed");

  function sync() {
    const mode = document.body.dataset.mode;
    const onFeed = mode !== "spine";
    feedBtn.setAttribute("aria-pressed", onFeed ? "true" : "false");
    if (mode === "merged") {
      document.querySelectorAll("button[data-density]").forEach((btn) => {
        btn.setAttribute("aria-pressed", "false");
      });
    }
    document.title = "Commander in Feed — " + (onFeed ? "Feed" : "Timeline");
  }

  feedBtn.addEventListener("click", () => {
    if (document.body.dataset.mode !== "spine") return;
    const density = document.querySelector('button[data-density][aria-pressed="true"]');
    if (density) density.click();
    else document.querySelector('button[data-mode="merged"]').click();
  });

  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-mode"]
  });
  sync();

  const allPosts = globalThis.CIF_POSTS || [];

  const latestPull = new Map();
  allPosts.forEach((post) => {
    const at = Date.parse(post.collectedAt || "");
    if (Number.isNaN(at)) return;
    if (!latestPull.has(post.platform) || at > latestPull.get(post.platform)) latestPull.set(post.platform, at);
  });
  const pullFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
  const updated = [["Truth Social", "Truth Social"], ["X", "X (Twitter)"]]
    .filter(([platform]) => latestPull.has(platform))
    .map(([platform, label]) => {
      const at = new Date(latestPull.get(platform));
      return label + ' - <time datetime="' + at.toISOString() + '">' + pullFmt.format(at) + " PT</time>";
    });
  const updatedEl = document.getElementById("updated");
  if (updatedEl && updated.length) updatedEl.innerHTML = "Last updated: " + updated.join(" · ");
  const score = (post) => (Number(post.likes) || 0) + (Number(post.replies) || 0);
  const rank = new Map();
  const byPlatform = new Map();
  allPosts.forEach((post) => {
    if (!byPlatform.has(post.platform)) byPlatform.set(post.platform, []);
    byPlatform.get(post.platform).push(post);
  });
  byPlatform.forEach((list) => {
    const sorted = list.map(score).sort((a, b) => a - b);
    list.forEach((post) => {
      const value = score(post);
      let lo = 0;
      let hi = sorted.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid] < value) lo = mid + 1;
        else hi = mid;
      }
      rank.set(post, lo / sorted.length);
    });
  });

  const ratio = (post) => {
    const likes = Number(post.likes) || 0;
    return likes > 0 ? (Number(post.replies) || 0) / likes * 10 : null;
  };
  const ratios = allPosts.map(ratio).filter((value) => value !== null).sort((a, b) => a - b);
  const ratioSlider = document.getElementById("ratio");
  if (ratios.length) {
    const typical = ratios[Math.floor((ratios.length - 1) / 2)];
    ratioSlider.title = "Minimum comments per 10 likes. The typical post in this window has " + typical.toFixed(1) + ".";
  }

  let engageCut = 0;
  let ratioCut = 0;
  const pickedTopics = new Set();
  globalThis.CIF_FILTER = (post) => {
    if (engageCut && (rank.get(post) || 0) < engageCut) return false;
    if (ratioCut && !(ratio(post) >= ratioCut)) return false;
    if (pickedTopics.size && !(post.topics || []).some((topic) => pickedTopics.has(topic))) return false;
    return true;
  };
  function refresh() {
    syncFilterState();
    if (globalThis.CIF_REFRESH) globalThis.CIF_REFRESH();
  }

  document.querySelectorAll('input[name="engage"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      engageCut = Number(radio.value) || 0;
      refresh();
      closeAll();
    });
  });
  function syncRatio() {
    ratioCut = Math.max(0, Number(ratioSlider.value) || 0);
    ratioSlider.setAttribute("aria-valuetext", ratioCut === 0
      ? "Any ratio"
      : ratioCut + " or more comments per 10 likes");
    ratioSlider.closest(".ratio-set").classList.toggle("is-set", ratioCut > 0);
  }
  ratioSlider.addEventListener("input", () => {
    const before = ratioCut;
    syncRatio();
    if (ratioCut !== before) refresh();
  });
  syncRatio();

  const topicCounts = new Map();
  allPosts.forEach((post) => (post.topics || []).forEach((topic) => {
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }));
  const topicList = document.getElementById("topic-list");
  topicList.innerHTML = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([topic, count]) => '<label class="dd-opt"><input type="checkbox" value="' + esc(topic).replace(/"/g, "&quot;") + '"><span>'
      + esc(topic) + '</span><span class="dd-count">' + count.toLocaleString("en-US") + "</span></label>")
    .join("");
  topicList.addEventListener("change", (event) => {
    const box = event.target;
    if (!box.matches('input[type="checkbox"]')) return;
    if (box.checked) pickedTopics.add(box.value);
    else pickedTopics.delete(box.value);
    refresh();
  });
  document.getElementById("topic-clear").addEventListener("click", () => {
    topicList.querySelectorAll("input:checked").forEach((box) => { box.checked = false; });
    pickedTopics.clear();
    refresh();
  });

  const accountBoxes = [...document.querySelectorAll("input[data-account]")];
  accountBoxes.forEach((box) => {
    box.addEventListener("change", syncFilterState);
  });

  const menus = document.body.classList.contains("panel-menus");
  const emptyValue = { "dd-account": "All accounts", "dd-topic": "All topics", "dd-engage": "All posts" };
  function setValue(id, text) {
    const dd = document.getElementById(id);
    const btn = dd.querySelector(".dd-btn");
    const label = dd.querySelector(".dd-label");
    const value = dd.querySelector(".dd-val");
    const shown = text || (menus ? emptyValue[id] : "");
    value.textContent = shown;
    value.hidden = !shown;
    label.classList.toggle("sr", !!shown);
    btn.classList.toggle("is-set", !!text);
    if (shown) btn.setAttribute("aria-label", label.textContent + ": " + shown);
    else btn.removeAttribute("aria-label");
  }

  const topicFind = document.createElement("input");
  const topicNone = document.createElement("p");
  if (menus) {
    topicFind.type = "search";
    topicFind.className = "dd-find";
    topicFind.placeholder = "Find a topic";
    topicFind.setAttribute("aria-label", "Find a topic");
    topicNone.className = "dd-none";
    topicNone.textContent = "No topics match.";
    topicNone.hidden = true;
    topicList.before(topicFind);
    topicList.after(topicNone);
    [...topicList.children].forEach((opt, i) => { opt.dataset.rank = i; });
    topicFind.addEventListener("input", () => {
      const needle = topicFind.value.trim().toLowerCase();
      let shown = 0;
      topicList.querySelectorAll(".dd-opt").forEach((opt) => {
        const hit = !needle || opt.querySelector("span").textContent.toLowerCase().includes(needle);
        opt.hidden = !hit;
        if (hit) shown += 1;
      });
      topicNone.hidden = shown > 0;
    });
  }
  function prepareTopicMenu() {
    topicFind.value = "";
    topicFind.dispatchEvent(new Event("input"));
    [...topicList.children]
      .sort((a, b) => (b.querySelector("input").checked - a.querySelector("input").checked)
        || a.dataset.rank - b.dataset.rank)
      .forEach((opt) => topicList.appendChild(opt));
  }
  function syncFilterState() {
    const on = accountBoxes.filter((box) => box.checked);
    setValue("dd-account", on.length === accountBoxes.length ? ""
      : on.length === 0 ? "No accounts"
      : on.length === 1 ? on[0].closest("label").textContent.trim()
      : on.length + " accounts");
    const topics = [...pickedTopics];
    setValue("dd-topic", topics.length === 0 ? "" : topics.length === 1 ? topics[0] : topics.length + " topics");
    setValue("dd-engage", engageCut ? "Top " + Math.round((1 - engageCut) * 100) + "%" : "");
    document.getElementById("topic-clear").hidden = topics.length === 0;
    const narrowed = engageCut > 0 || ratioCut > 0 || topics.length > 0 || on.length < accountBoxes.length;
    document.body.classList.toggle("has-filter", narrowed);
  }

  const dropdowns = [...document.querySelectorAll(".dd")];
  const filterCards = document.body.classList.contains("filter-cards") && !menus;
  function closeAll(except) {
    if (filterCards) return;
    dropdowns.forEach((dd) => {
      if (dd === except) return;
      dd.querySelector(".dd-btn").setAttribute("aria-expanded", "false");
      dd.querySelector(".dd-panel").hidden = true;
    });
  }
  dropdowns.forEach((dd) => {
    const btn = dd.querySelector(".dd-btn");
    const panel = dd.querySelector(".dd-panel");
    if (filterCards) {
      btn.hidden = true;
      panel.hidden = false;
      return;
    }
    btn.addEventListener("click", () => {
      const open = panel.hidden;
      closeAll(dd);
      if (open && menus && dd.id === "dd-topic") prepareTopicMenu();
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && menus && dd.id === "dd-topic") topicFind.focus();
    });
    dd.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || panel.hidden) return;
      event.preventDefault();
      event.stopPropagation();
      closeAll();
      btn.focus();
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".dd")) closeAll();
  });
  syncFilterState();

  const q = document.getElementById("q");
  function syncSearch() {
    document.body.classList.toggle("has-search", q.value.trim().length > 0);
  }
  q.addEventListener("input", syncSearch);
  q.addEventListener("keyup", syncSearch);
  document.getElementById("q-clear").addEventListener("click", () => requestAnimationFrame(syncSearch));
  syncSearch();

  const commentIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  const repostIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>';
  const heartIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  const countRe = /^(?:·\s*)?(\S+)\s+likes\s+·\s+(\S+)\s+replies\s+·\s+(\S+)\s+(\S+)(?:\s+·\s+(.+))?$/;

  function esc(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function metric(icon, value, label) {
    return '<span class="metric">' + icon + '<span>' + esc(value) + '</span><span class="sr">' + esc(label) + '</span></span>';
  }
  const postsById = new Map((globalThis.CIF_POSTS || []).map((post) => [String(post.id), post]));

  function cardId(card) {
    const tagged = card.querySelector("[data-pid]");
    if (tagged && tagged.dataset.pid) return tagged.dataset.pid;
    return (card.id || "").replace(/^p-/, "");
  }
  function tuckMeta(root) {
    root.querySelectorAll("article, .run-row").forEach((card) => {
      if (card.dataset.tucked === "1") return;
      const summary = card.querySelector(":scope > details > summary, :scope > summary");
      if (summary) {
        summary.querySelectorAll(".kw, .tick-topic, .tick-likes").forEach((node) => {
          const prev = node.previousSibling;
          if (prev && prev.nodeType === 3) {
            prev.textContent = prev.textContent.replace(/\s*·\s*$/, "");
            if (!prev.textContent.trim()) prev.remove();
          }
          node.remove();
        });
      }
      const post = postsById.get(cardId(card));
      const host = card.querySelector(".opened") || card;
      if (post && post.topics && post.topics.length && !host.querySelector(".topic-line")) {
        const line = document.createElement("p");
        line.className = "topic-line";
        line.textContent = post.topics.join(" · ");
        const counts = host.querySelector(".counts");
        if (counts) host.insertBefore(line, counts);
        else host.appendChild(line);
      }
      card.dataset.tucked = "1";
    });
  }
  let painting = false;
  function engageGroup(label, inner) {
    return '<span class="engage" role="group" aria-label="' + esc(label) + '">' + inner + "</span>";
  }
  function paintEngagement(root) {
    root.querySelectorAll(".counts").forEach((el) => {
      if (el.dataset.engage === "1") return;
      const match = el.textContent.trim().match(countRe);
      if (!match) return;
      el.dataset.engage = "1";
      el.classList.add("engage-line");
      const likes = match[1];
      const replies = match[2];
      const boosts = match[3];
      const boostWord = match[4];
      const pulled = match[5] || "";
      el.innerHTML = engageGroup(
        likes + " likes, " + replies + " replies, " + boosts + " " + boostWord,
        metric(heartIcon, likes, "likes")
          + metric(commentIcon, replies, "replies")
          + metric(repostIcon, boosts, boostWord)
      ) + (pulled ? " · <span class=\"as-of\">" + esc(pulled) + "</span>" : "");
    });
    root.querySelectorAll(".pair-counts").forEach((el) => {
      if (el.dataset.engage === "1") return;
      const match = el.textContent.trim().match(countRe);
      if (!match) return;
      el.dataset.engage = "1";
      el.classList.add("engage-line");
      const prev = el.previousSibling;
      let repost = false;
      if (prev && prev.nodeType === 3 && /·\s*Repost/.test(prev.textContent)) {
        prev.textContent = prev.textContent.replace(/\s*·\s*Repost\s*/, " ");
        repost = true;
      }
      el.innerHTML = "· " + engageGroup(
        match[1] + " likes, " + match[2] + " replies",
        metric(heartIcon, match[1], "likes") + metric(commentIcon, match[2], "replies")
      ) + (repost ? ' <span class="repost-tag">· Repost</span>' : "");
    });
  }
  function decorate(root) {
    if (painting) return;
    painting = true;
    tuckMeta(root);
    paintEngagement(root);
    const empty = root.querySelector(".empty p");
    if (empty && document.body.classList.contains("has-filter") && /^No posts from /.test(empty.textContent)) {
      empty.textContent = empty.textContent.replace(/^No posts from /, "No posts match these filters from ");
    }
    painting = false;
  }
  const feed = document.getElementById("feed");
  decorate(feed);
  new MutationObserver(() => decorate(feed)).observe(feed, { childList: true, subtree: true });
})();
