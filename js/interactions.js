/** Shared UI: toasts, accordions */
(function initInteractions() {
  let toastStack = document.querySelector(".toast-stack");
  if (!toastStack) {
    toastStack = document.createElement("div");
    toastStack.className = "toast-stack";
    toastStack.setAttribute("aria-live", "polite");
    document.body.appendChild(toastStack);
  }

  window.kernoToast = function kernoToast(message, type = "default") {
    const el = document.createElement("div");
    el.className = "toast" + (type === "success" ? " toast--success" : "");
    el.textContent = message;
    toastStack.appendChild(el);
    window.setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.2s ease";
      window.setTimeout(() => el.remove(), 200);
    }, 3200);
  };

  document.querySelectorAll("[data-accordion]").forEach((root) => {
    root.querySelectorAll(".accordion__trigger").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const item = trigger.closest(".accordion__item");
        if (!item) return;
        const open = item.classList.toggle("is-open");
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  });
})();
