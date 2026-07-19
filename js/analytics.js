(() => {
  const recentEvents = new WeakMap();
  const duplicateWindowMs = 1500;

  function eventParameters(element, overrides = {}) {
    const parameters = {
      page_path: window.location.pathname,
      page_title: document.title,
      ...overrides
    };

    if (element?.dataset.trackLocation) parameters.link_location = element.dataset.trackLocation;
    if (element?.dataset.trackCategory) parameters.transport_category = element.dataset.trackCategory;
    if (element?.dataset.trackText) {
      parameters.cta_text = element.dataset.trackText;
    } else if (element?.textContent) {
      parameters.cta_text = element.textContent.replace(/\s+/g, " ").trim();
    }

    return parameters;
  }

  function sendEvent(name, parameters) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, { ...parameters, transport_type: "beacon" });
  }

  document.addEventListener("click", event => {
    const element = event.target.closest("[data-track-event]");
    if (!element) return;

    const name = element.dataset.trackEvent;
    const now = Date.now();
    const previous = recentEvents.get(element);
    if (previous?.name === name && now - previous.time < duplicateWindowMs) return;

    recentEvents.set(element, { name, time: now });
    sendEvent(name, eventParameters(element));
  });

  document.addEventListener("submit", event => {
    const form = event.target.closest("form[data-track-form]");
    if (!form) return;

    const submitter = event.submitter || form.querySelector('[type="submit"]');
    sendEvent("quote_submit", eventParameters(submitter, {
      form_name: form.getAttribute("name") || form.dataset.trackForm
    }));
  });

  if (document.body.dataset.trackPageEvent) {
    sendEvent(document.body.dataset.trackPageEvent, eventParameters(null));
  }
})();
