(function () {
  const feed = document.getElementById("feed");
  const posts = new Map((globalThis.CIF_POSTS || []).map((post) => [post.id, post]));
  if (!feed || !posts.size) return;

  function addThumbs() {
    feed.querySelectorAll(".rowpair details[data-pid] > summary:not([data-thumbed])").forEach((summary) => {
      summary.dataset.thumbed = "1";
      const post = posts.get(summary.parentElement.dataset.pid);
      if (!post || !post.images || !post.images.length) return;
      const wrap = document.createElement("span");
      wrap.className = "row-thumb";
      const img = document.createElement("img");
      img.src = post.images[0];
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => wrap.remove());
      wrap.appendChild(img);
      if (post.images.length > 1) {
        const more = document.createElement("span");
        more.className = "row-thumb-more";
        more.textContent = "+" + (post.images.length - 1);
        more.setAttribute("aria-label", post.images.length + " images");
        wrap.appendChild(more);
      }
      summary.appendChild(wrap);
    });
  }
  new MutationObserver(addThumbs).observe(feed, { childList: true, subtree: true });
  addThumbs();
})();
