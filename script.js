const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".site-nav");
const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      nav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.focus();
    }
  });
}

// Keep a stable, owned purchase path for the $39 kit while offering
// Gumroad alongside the existing Stripe and Payhip checkout options.
const kitSection = document.querySelector("#kit");
const kitButtonRow = kitSection?.querySelector(".button-row");

if (kitButtonRow && !kitButtonRow.querySelector('[data-store="gumroad"]')) {
  const gumroadLink = document.createElement("a");
  gumroadLink.className = "button button-secondary";
  gumroadLink.href = "buy-ai-value-kit.html";
  gumroadLink.target = "_blank";
  gumroadLink.rel = "noopener noreferrer";
  gumroadLink.dataset.store = "gumroad";
  gumroadLink.textContent = "Buy the $39 Kit on Gumroad";

  kitButtonRow.appendChild(gumroadLink);
}
