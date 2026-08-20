const menuButton = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-navigation]");

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
  navigation.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navigation.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuButton.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) closeMenu();
  });
}

document.querySelectorAll("[data-year]").forEach((item) => {
  item.textContent = new Date().getFullYear();
});

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

document.querySelectorAll(".faq-item").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq-item[open]").forEach((openItem) => {
      if (openItem !== item) openItem.removeAttribute("open");
    });
  });
});

const quoteForm = document.querySelector("[data-quote-form]");

if (quoteForm) {
  const status = document.querySelector("[data-form-status]");
  const submitButton = quoteForm.querySelector('button[type="submit"]');
  const defaultButtonText = submitButton?.textContent || "Send project details";
  let isSubmitting = false;

  function showFormStatus(message, state) {
    if (!status) return;
    status.textContent = message;
    status.classList.remove("is-error", "is-loading");
    if (state === "error") status.classList.add("is-error");
    if (state === "loading") status.classList.add("is-loading");
    status.classList.add("is-visible");
  }

  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!quoteForm.checkValidity()) {
      quoteForm.reportValidity();
      return;
    }

    isSubmitting = true;
    quoteForm.setAttribute("aria-busy", "true");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending…";
    }
    showFormStatus("Sending your project details…", "loading");

    const payload = Object.fromEntries(new FormData(quoteForm).entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        showFormStatus(
          result?.message || "We couldn’t send your message right now. Please try again in a moment.",
          "error"
        );
        return;
      }

      quoteForm.reset();
      showFormStatus(result.message || "Thanks—your project details have been sent successfully.", "success");
      status?.focus();
    } catch {
      showFormStatus(
        "We couldn’t send your message right now. Please check your connection and try again.",
        "error"
      );
    } finally {
      isSubmitting = false;
      quoteForm.removeAttribute("aria-busy");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });

  quoteForm.addEventListener("input", () => {
    if (!isSubmitting) status?.classList.remove("is-visible", "is-error", "is-loading");
  });
}
