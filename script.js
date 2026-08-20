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

// Revenue funnel: expose the AI/SaaS spend decision path from the homepage
// without adding a new paid product or external dependency.
if (nav && !nav.querySelector('a[href="#spend-control"]')) {
  const connectLink = nav.querySelector('a[href="#connect"]');
  const spendNavLink = document.createElement("a");
  spendNavLink.href = "#spend-control";
  spendNavLink.textContent = "AI/SaaS Spend";
  if (connectLink) {
    nav.insertBefore(spendNavLink, connectLink);
  } else {
    nav.appendChild(spendNavLink);
  }
}

const resourceGrid = document.querySelector("#tools .resource-grid");
if (resourceGrid && !resourceGrid.querySelector('a[href="ai-saas-spend-audit-checklist.html"]')) {
  const spendCard = document.createElement("a");
  spendCard.className = "resource-card";
  spendCard.href = "ai-saas-spend-audit-checklist.html";
  spendCard.innerHTML = `
    <span>Cost control · Free checklist</span>
    <h3>AI & SaaS Spend Audit</h3>
    <p>Review tool ownership, overlap, AI add-ons, renewal risk, seat sizing and rough break-even before paying for another subscription.</p>
    <strong>Run the 12-question check →</strong>
  `;
  resourceGrid.appendChild(spendCard);
}

const kitSection = document.querySelector("#kit");
if (kitSection && !document.querySelector("#spend-control")) {
  const spendSection = document.createElement("section");
  spendSection.id = "spend-control";
  spendSection.className = "section section-accent";
  spendSection.innerHTML = `
    <div class="container kit-grid">
      <div>
        <p class="eyebrow">AI & SaaS cost control · Free → $499</p>
        <h2>Make software earn its place in a real workflow.</h2>
      </div>
      <div class="kit-content">
        <p>Before another renewal or AI upgrade, identify unclear ownership, duplicate capability, oversized plans and software costs that are not tied to measurable workflow value.</p>
        <ul class="check-list">
          <li>Start with the free 12-question spend audit checklist</li>
          <li>Estimate annual spend exposure with your own assumptions</li>
          <li>Use KEEP / REDUCE / CONSOLIDATE / REVIEW / CANCEL decisions</li>
          <li>Escalate to the existing $499 audit only when the decision is valuable enough</li>
        </ul>
        <div class="button-row">
          <a class="button button-primary" href="ai-saas-spend-audit-checklist.html">Use the free checklist</a>
          <a class="button button-secondary" href="ai-saas-spend-waste-audit.html">Review the $499 spend audit</a>
        </div>
        <p class="fine">No guaranteed savings. The paid path is the existing Stratum Praxis AI Workflow Opportunity Audit adapted to software and AI spend decisions.</p>
      </div>
    </div>
  `;
  kitSection.parentNode.insertBefore(spendSection, kitSection);
}
