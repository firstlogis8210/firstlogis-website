(() => {
  const cfg = window.FIRST_LOGIS_CONFIG || {};
  const $all = (selector, root = document) => [...root.querySelectorAll(selector)];

  $all("[data-company-phone]").forEach(el => el.textContent = cfg.phoneDisplay || "1661-8210");
  $all("[data-phone-mnemonic]").forEach(el => el.textContent = cfg.phoneMnemonic || "8210 = 빨리일번");
  $all("[data-company-phone-link]").forEach(el => el.href = cfg.phoneHref || "tel:16618210");
  $all("[data-kakao-link]").forEach(el => el.href = cfg.kakaoUrl);

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  menuToggle?.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  mainNav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }));

  const toast = document.getElementById("toast");
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
  }

  $all("[data-pending]").forEach(btn => {
    btn.addEventListener("click", () => showToast(`${btn.dataset.pending}은 현재 준비 중입니다.`));
  });

  const modal = document.getElementById("quoteModal");
  let modalOpener = null;
  function openModal(event) {
    modalOpener = event?.currentTarget || document.activeElement;
    modal?.classList.add("open");
    modal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modal?.querySelector('input[name="name"]')?.focus();
  }
  function closeModal() {
    const wasOpen = modal?.classList.contains("open");
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (wasOpen) modalOpener?.focus();
  }
  $all(".open-quote").forEach(btn => btn.addEventListener("click", openModal));
  $all("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

})();
