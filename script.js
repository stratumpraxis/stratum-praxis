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

// Surface the AI/SaaS spend funnel from the homepage without duplicating
// static cards or changing the existing layout structure.
const toolsGrid = document.querySelector("#tools .resource-grid");
if (toolsGrid && !toolsGrid.querySelector('[data-funnel="saas-renewal"]')) {
  const renewalCard = document.createElement("a");
  renewalCard.className = "resource-card";
  renewalCard.href = "saas-renewal-decision.html";
  renewalCard.dataset.funnel = "saas-renewal";
  renewalCard.innerHTML = '<span>Cost control · Free decision gate</span><h3>SaaS Renewal Decision Calculator</h3><p>Pressure-test a renewal, upgrade, seat increase, or AI contract before money auto-progresses.</p><strong>Check the renewal decision →</strong>';
  toolsGrid.appendChild(renewalCard);
}

const spendSection = document.querySelector("#spend-control");
const spendButtons = spendSection?.querySelector(".button-row");
if (spendButtons && !spendButtons.querySelector('[data-funnel="saas-waste"]')) {
  const renewalLink = document.createElement("a");
  renewalLink.className = "button button-primary";
  renewalLink.href = "saas-renewal-decision.html";
  renewalLink.dataset.funnel = "saas-waste";
  renewalLink.textContent = "Check a renewal decision free";

  const wasteLink = document.createElement("a");
  wasteLink.className = "button button-secondary";
  wasteLink.href = "ai-saas-waste-calculator.html";
  wasteLink.textContent = "Estimate spend exposure";

  const monitoringLink = document.createElement("a");
  monitoringLink.className = "button button-secondary";
  monitoringLink.href = "ai-saas-spend-monitoring.html";
  monitoringLink.textContent = "See Recovery & Monthly Monitoring";

  spendButtons.prepend(renewalLink);
  spendButtons.append(wasteLink, monitoringLink);
}

if (nav && !nav.querySelector('[data-nav="saas-decision"]')) {
  const navLink = document.createElement("a");
  navLink.href = "saas-renewal-decision.html";
  navLink.dataset.nav = "saas-decision";
  navLink.textContent = "SaaS Decision";
  nav.appendChild(navLink);
}

if (nav && !nav.querySelector('[data-nav="global-product-kit"]')) {
  const productLink = document.createElement("a");
  productLink.href = "global-digital-product-ai-starter-kit.html";
  productLink.dataset.nav = "global-product-kit";
  productLink.textContent = "Global Product Kit · $19";
  nav.appendChild(productLink);
}
