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

const toolsGrid = document.querySelector("#tools .resource-grid");

// Surface Passage Network as the owned decision hub that reuses existing
// comparisons, calculators, and revenue routes instead of creating more products.
if (toolsGrid && !toolsGrid.querySelector('[data-funnel="passage-network"]')) {
  const passageCard = document.createElement("a");
  passageCard.className = "resource-card";
  passageCard.href = "passage-network.html";
  passageCard.dataset.funnel = "passage-network";
  passageCard.innerHTML = '<span>Decision hub · Compare → route</span><h3>Passage Network</h3><p>Use the awkward middle between AI tools, renewals, workflow platforms, and implementation decisions to find the next useful path.</p><strong>Explore decision passages →</strong>';
  toolsGrid.prepend(passageCard);
}

// Capture the short-lived Aug. 2026 price-change decision window with a timestamped
// calculator that routes into an already-live $39 decision product.
if (toolsGrid && !toolsGrid.querySelector('[data-funnel="gpt56-price-window"]')) {
  const priceCard = document.createElement("a");
  priceCard.className = "resource-card";
  priceCard.href = "gpt-5-6-sol-api-cost-calculator.html";
  priceCard.dataset.funnel = "gpt56-price-window";
  priceCard.innerHTML = '<span>Updated Aug 24 · Free calculator</span><h3>GPT-5.6 Sol API Cost Calculator</h3><p>Compare the current promotional $4/$20 pricing with the pre-cut $5/$30 baseline using your own workload.</p><strong>Calculate the price-cut impact →</strong>';
  toolsGrid.prepend(priceCard);
}

// Surface the free AI Practical Skills Check as a first-party acquisition path.
if (toolsGrid && !toolsGrid.querySelector('[data-funnel="practical-skills"]')) {
  const practicalCard = document.createElement("a");
  practicalCard.className = "resource-card";
  practicalCard.href = "ai-practical-check.html";
  practicalCard.dataset.funnel = "practical-skills";
  practicalCard.innerHTML = '<span>Free · 20 questions · Japanese</span><h3>AI Practical Skills Check v2</h3><p>Score instruction design, verification, execution, automation and monetization, then route to the matching optional ¥980 report.</p><strong>Take the free skills check →</strong>';
  toolsGrid.prepend(practicalCard);
}

// Surface the AI/SaaS spend funnel from the homepage without duplicating
// static cards or changing the existing layout structure.
if (toolsGrid && !toolsGrid.querySelector('[data-funnel="saas-renewal"]')) {
  const renewalCard = document.createElement("a");
  renewalCard.className = "resource-card";
  renewalCard.href = "saas-renewal-decision.html";
  renewalCard.dataset.funnel = "saas-renewal";
  renewalCard.innerHTML = '<span>Cost control · Free decision gate</span><h3>SaaS Renewal Decision Calculator</h3><p>Pressure-test a renewal, upgrade, seat increase, or AI contract before money auto-progresses.</p><strong>Check the renewal decision →</strong>';
  toolsGrid.appendChild(renewalCard);
}

// Surface one refreshed legacy product only after its checkout and delivery are live.
if (toolsGrid && !toolsGrid.querySelector('[data-funnel="slide-factory"]')) {
  const slideFactoryCard = document.createElement("a");
  slideFactoryCard.className = "resource-card";
  slideFactoryCard.href = "smartphone-ai-slide-factory.html";
  slideFactoryCard.dataset.funnel = "slide-factory";
  slideFactoryCard.innerHTML = '<span>Phone-first production kit · $19</span><h3>Smartphone AI Slide Factory</h3><p>Build decision-oriented decks with a brief, evidence ledger, 12 prompts, visual rules, QA and a sample 7-slide structure.</p><strong>View the $19 kit →</strong>';
  toolsGrid.appendChild(slideFactoryCard);
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

  spendButtons.prepend(renewalLink);
  spendButtons.append(wasteLink);
}

if (nav && !nav.querySelector('[data-nav="passage-network"]')) {
  const passageLink = document.createElement("a");
  passageLink.href = "passage-network.html";
  passageLink.dataset.nav = "passage-network";
  passageLink.textContent = "Decision Passages";
  nav.appendChild(passageLink);
}

if (nav && !nav.querySelector('[data-nav="gpt56-cost"]')) {
  const priceLink = document.createElement("a");
  priceLink.href = "gpt-5-6-sol-api-cost-calculator.html";
  priceLink.dataset.nav = "gpt56-cost";
  priceLink.textContent = "GPT-5.6 Cost";
  nav.appendChild(priceLink);
}

if (nav && !nav.querySelector('[data-nav="practical-skills"]')) {
  const practicalLink = document.createElement("a");
  practicalLink.href = "ai-practical-check.html";
  practicalLink.dataset.nav = "practical-skills";
  practicalLink.textContent = "Free AI Skills Check";
  nav.appendChild(practicalLink);
}

if (nav && !nav.querySelector('[data-nav="revenue-toolkit"]')) {
  const toolkitLink = document.createElement("a");
  toolkitLink.href = "ai-revenue-toolkit.html";
  toolkitLink.dataset.nav = "revenue-toolkit";
  toolkitLink.textContent = "AI Revenue Toolkit";
  nav.appendChild(toolkitLink);
}

if (nav && !nav.querySelector('[data-nav="slide-factory"]')) {
  const slideLink = document.createElement("a");
  slideLink.href = "smartphone-ai-slide-factory.html";
  slideLink.dataset.nav = "slide-factory";
  slideLink.textContent = "Slide Factory · $19";
  nav.appendChild(slideLink);
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