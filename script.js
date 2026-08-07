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
}

document.querySelectorAll(".placeholder-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (link.getAttribute("href") === "#") {
      event.preventDefault();

      const existingNotice = document.querySelector(".notice");
      if (existingNotice) existingNotice.remove();

      const notice = document.createElement("div");
      notice.className = "notice";
      notice.setAttribute("role", "status");
      notice.textContent = "This destination will be connected when the official URL is ready.";
      document.body.appendChild(notice);

      window.setTimeout(() => notice.remove(), 3200);
    }
  });
});
