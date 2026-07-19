(() => {
  const forms = [...document.querySelectorAll('form[data-netlify="true"]')].filter(form =>
    ["firstlogis-quote", "firstlogis-bike-quote"].includes(form.getAttribute("name"))
  );
  const successMessage = "견적문의가 정상적으로 접수되었습니다.\n확인 후 빠르게 연락드리겠습니다.";
  const errorMessage = "견적문의 접수 중 오류가 발생했습니다.\n잠시 후 다시 시도하시거나 1661-8210으로 전화해 주세요.";
  const imageExtensionPattern = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i;
  const maxAttachmentBytes = 7 * 1024 * 1024;

  document.addEventListener("firstlogis:quote-success", event => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "quote_complete", {
      form_name: event.detail?.formName,
      page_path: window.location.pathname,
      page_title: document.title,
      transport_type: "beacon"
    });
  });

  function formatPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    if (digits.startsWith("02")) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  function validatePhone(input, report = false) {
    const valid = /^\d{8,12}$/.test(input.value.replace(/\D/g, ""));
    input.setCustomValidity(valid ? "" : "연락처는 숫자 8~12자리로 입력해 주세요.");
    if (!valid && report) input.reportValidity();
    return valid;
  }

  function validateFiles(input, report = false) {
    const files = [...(input?.files || [])];
    const imagesOnly = files.every(file => file.type.startsWith("image/") && imageExtensionPattern.test(file.name));
    const withinCount = files.length <= 3;
    const withinSize = files.reduce((total, file) => total + file.size, 0) <= maxAttachmentBytes;
    const message = !withinCount
      ? "사진은 최대 3장까지 첨부할 수 있습니다."
      : !imagesOnly
        ? "이미지 파일만 첨부할 수 있습니다."
        : !withinSize
          ? "첨부파일 전체 용량은 7MB 이하여야 합니다."
          : "";
    input?.setCustomValidity(message);
    const error = input?.closest("fieldset")?.querySelector(".file-error");
    if (error) error.textContent = message;
    if (message && report) input.reportValidity();
    return !message;
  }

  function createQuoteId() {
    const now = new Date();
    const pad = value => String(value).padStart(2, "0");
    const random = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
    return `FL-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${random}`;
  }

  function setSubmitting(form, submitting) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.dataset.originalText ||= button.textContent;
    button.disabled = submitting;
    button.toggleAttribute("aria-busy", submitting);
    button.textContent = submitting ? "견적문의 접수 중..." : button.dataset.originalText;
  }

  function showStatus(form, type, message) {
    const status = form.querySelector(".form-status");
    if (!status) return;
    status.className = `form-status is-${type}`;
    status.textContent = message;
    status.focus?.();
  }

  forms.forEach(form => {
    const phone = form.elements.phone;
    const photos = form.querySelector('input[type="file"][multiple]');

    phone?.addEventListener("input", () => {
      phone.value = formatPhone(phone.value);
      phone.setCustomValidity("");
    });
    phone?.addEventListener("blur", () => phone.value && validatePhone(phone));
    photos?.addEventListener("change", () => validateFiles(photos));

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;
      if (!validatePhone(phone, true) || !validateFiles(photos, true) || !form.reportValidity()) return;

      const quoteId = form.elements.quote_id;
      if (quoteId) quoteId.value = createQuoteId();
      form.dataset.submitting = "true";
      setSubmitting(form, true);
      showStatus(form, "progress", "견적문의를 접수하고 있습니다.");

      try {
        const formData = new FormData(form);
        formData.delete("cargo-photos");
        [1, 2, 3].forEach(index => formData.delete(`cargo-photo-${index}`));
        [...(photos?.files || [])].forEach((file, index) => formData.set(`cargo-photo-${index + 1}`, file));
        const response = await fetch("/", { method: "POST", body: formData });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        form.reset();
        showStatus(form, "success", successMessage);
        document.dispatchEvent(new CustomEvent("firstlogis:quote-success", { detail: { formName: form.name } }));
      } catch (error) {
        console.error("견적문의 접수 실패", error);
        showStatus(form, "error", errorMessage);
      } finally {
        form.dataset.submitting = "false";
        setSubmitting(form, false);
      }
    });
  });
})();
