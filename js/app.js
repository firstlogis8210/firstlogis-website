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

  const quoteForms = $all('form[name="transport-quote"], form[name="transport-quote-popup"]');
  const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const allowedImageExtensions = /\.(jpe?g|png|webp)$/i;

  function validatePhone(input, showMessage = false) {
    const digits = input.value.replace(/\D/g, "");
    const valid = digits.length >= 8 && digits.length <= 12;
    input.setCustomValidity(valid ? "" : "연락처는 숫자 8~12자리를 포함해 입력해 주세요.");
    if (!valid && showMessage) input.reportValidity();
    return valid;
  }

  function validateFiles(form, showMessage = false) {
    const inputs = $all('input[type="file"]', form);
    const error = form.querySelector(".file-error");
    const files = inputs.flatMap(input => [...input.files]);
    let message = "";

    if (files.length > 3) {
      message = "사진은 최대 3장까지 첨부할 수 있습니다.";
    } else if (files.some(file => {
      const typeAllowed = file.type ? allowedImageTypes.has(file.type) : true;
      return !typeAllowed || !allowedImageExtensions.test(file.name);
    })) {
      message = "JPG, PNG, WEBP 형식의 이미지만 첨부할 수 있습니다.";
    }

    if (error) error.textContent = message;
    inputs.forEach(input => input.setCustomValidity(message));
    if (message && showMessage) inputs.find(input => input.files.length)?.reportValidity();
    return !message;
  }

  function createQuoteId() {
    const now = new Date();
    const pad = value => String(value).padStart(2, "0");
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let random = "";

    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      random = [...values].map(value => alphabet[value % alphabet.length]).join("");
    } else {
      random = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    }
    return `FL-${date}-${time}-${random}`;
  }

  function restoreSubmitButton(form) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = button.dataset.originalText || "견적 문의 보내기";
  }

  quoteForms.forEach(form => {
    const phone = form.elements.phone;
    const fileInputs = $all('input[type="file"]', form);

    phone?.addEventListener("input", () => phone.setCustomValidity(""));
    phone?.addEventListener("blur", () => {
      if (phone.value) validatePhone(phone);
    });
    fileInputs.forEach(input => input.addEventListener("change", () => {
      if (!validateFiles(form)) {
        const error = form.querySelector(".file-error");
        const message = error?.textContent || "허용되지 않는 파일을 선택했습니다.";
        fileInputs.forEach(fileInput => { fileInput.value = ""; });
        fileInputs.forEach(fileInput => fileInput.setCustomValidity(""));
        if (error) error.textContent = message;
      }
    }));

    form.addEventListener("submit", event => {
      if (!validatePhone(phone, true) || !validateFiles(form, true)) {
        event.preventDefault();
        return;
      }
      if (!form.checkValidity()) return;

      const quoteId = form.elements.quote_id;
      try {
        if (quoteId && !quoteId.value) quoteId.value = createQuoteId();
      } catch (error) {
        console.warn("견적 접수번호를 생성하지 못했습니다.", error);
      }

      const button = form.querySelector('button[type="submit"]');
      if (button) {
        button.dataset.originalText ||= button.textContent;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = "접수 중...";
      }
    });
  });

  window.addEventListener("pageshow", () => quoteForms.forEach(restoreSubmitButton));
})();
