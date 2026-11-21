(function () {
  const filters = document.querySelector(".filters");
  const tools = document.querySelector(".tools");
  if (!filters || !tools) return;

  document.querySelectorAll(".dd").forEach((group) => {
    const title = document.createElement("h2");
    title.className = "filter-title";
    title.textContent = group.querySelector(".dd-label").textContent;
    group.insertBefore(title, group.firstChild);
    group.classList.add("filter-card");
  });
  document.querySelector(".ratio-set").classList.add("filter-card");
  const dates = filters.querySelector("fieldset");
  dates.classList.add("filter-card", "date-card");
  const dateTitle = document.createElement("h2");
  dateTitle.className = "filter-title";
  dateTitle.textContent = "Date";
  dates.insertBefore(dateTitle, dates.firstChild);
  document.querySelector('input[name="dates"][value="custom"]').closest("label").click();
  const defaultFrom = document.getElementById("from").value;
  const defaultTo = document.getElementById("to").value;

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "filter-reset";
  reset.textContent = "Reset filters";
  filters.appendChild(reset);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "filter-trigger";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "filter-panel");
  trigger.innerHTML = 'Filters <span class="filter-badge" hidden></span>';
  tools.insertBefore(trigger, tools.querySelector(".tools-end"));
  filters.id = "filter-panel";
  filters.hidden = true;

  function setOpen(open) {
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("filters-open", open);
    filters.hidden = !open;
  }
  trigger.addEventListener("click", () => setOpen(trigger.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("filters-open")) {
      setOpen(false);
      trigger.focus();
    }
  });

  function activeGroups() {
    let n = 0;
    const accounts = [...document.querySelectorAll("input[data-account]")];
    if (accounts.some((box) => !box.checked)) n += 1;
    if (document.querySelector("#topic-list input:checked")) n += 1;
    if (document.querySelector('input[name="engage"]:checked').value !== "0") n += 1;
    if (Number(document.getElementById("ratio").value) > 0) n += 1;
    if (document.getElementById("from").value !== defaultFrom
      || document.getElementById("to").value !== defaultTo) n += 1;
    return n;
  }
  function syncBadge() {
    const n = activeGroups();
    const badge = trigger.querySelector(".filter-badge");
    badge.hidden = !n;
    badge.textContent = n;
    trigger.classList.toggle("is-set", n > 0);
  }
  filters.addEventListener("change", syncBadge);
  filters.addEventListener("input", syncBadge);
  syncBadge();

  reset.addEventListener("click", () => {
    document.querySelectorAll("input[data-account]:not(:checked)").forEach((box) => box.closest("label").click());
    document.getElementById("topic-clear").click();
    document.querySelector('input[name="engage"][value="0"]').closest("label").click();
    const ratio = document.getElementById("ratio");
    ratio.value = "";
    ratio.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("from").value = defaultFrom;
    document.getElementById("from").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("to").value = defaultTo;
    document.getElementById("to").dispatchEvent(new Event("change", { bubbles: true }));
    syncBadge();
  });
})();
