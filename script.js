const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzgyjJt0AzsZKmyNCvKT5ymxohIDbl88eMgOKPUizYB7mz9_giWH4Vsnsi_BubZQKA/exec";

const PROMO_END_TIME = "";

const PROMO_CONFIG = {
  originalPrice: 249000,
  salePrice: 199000,
  discount: 50000,
  freeShipping: true,
  promoLimit: 100,
  endTime: PROMO_END_TIME,
  useOriginalPriceAfterPromo: false,
};

const formatVnd = (value) => `${Number(value).toLocaleString("vi-VN")}đ`;

const hasPromoEnded = () => {
  if (!PROMO_CONFIG.endTime) return false;
  return Date.now() > new Date(PROMO_CONFIG.endTime).getTime();
};

const activePrice = () => {
  return hasPromoEnded() && PROMO_CONFIG.useOriginalPriceAfterPromo
    ? PROMO_CONFIG.originalPrice
    : PROMO_CONFIG.salePrice;
};

const trackEvent = (eventName, payload = {}) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });

  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, payload);
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
  }
};

const orderForm = document.querySelector("#order-form");
const orderPanel = document.querySelector(".order-panel");
const quantityInput = orderForm.querySelector('[name="quantity"]');
const totalPrice = document.querySelector("#total-price");
const message = document.querySelector("#form-message");
const submitButton = orderForm.querySelector('button[type="submit"]');
const promoCount = document.querySelector("#promo-count");
const promoCountdown = document.querySelector("#promo-countdown");
const promoStatus = document.querySelector("#promo-status");

const updateTotal = () => {
  const quantity = Number(quantityInput.value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    totalPrice.textContent = "Chọn từ 1–100 cuốn";
    return;
  }
  totalPrice.textContent = formatVnd(activePrice() * quantity);
  const submitPrice = submitButton.querySelector('[data-current-price]');
  if (submitPrice) submitPrice.textContent = formatVnd(activePrice() * quantity);
};

const updatePriceText = () => {
  const price = activePrice();
  document.querySelectorAll("[data-original-price]").forEach((el) => {
    el.textContent = formatVnd(PROMO_CONFIG.originalPrice);
  });
  document.querySelectorAll("[data-sale-price]").forEach((el) => {
    el.textContent = formatVnd(price);
  });
  document.querySelectorAll("[data-current-price]").forEach((el) => {
    el.textContent = formatVnd(price);
  });
  updateTotal();
};

const highlightOrderForm = () => {
  orderPanel.classList.add("form-highlight");
  window.setTimeout(() => orderPanel.classList.remove("form-highlight"), 950);
};

const scrollToOrder = (event) => {
  if (event) event.preventDefault();
  trackEvent("InitiateCheckout", { currency: "VND", value: activePrice() });
  document.querySelector("#order-form").scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(highlightOrderForm, 450);
};

const setMessage = (text, type = "") => {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
};

const isVietnamesePhone = (phone) => /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone.replace(/\s/g, ""));

const loadOrderCount = async () => {
  if (!GOOGLE_SCRIPT_URL) {
    promoCount.textContent = `Ưu đãi ${formatVnd(activePrice())} dành cho ${PROMO_CONFIG.promoLimit} đơn đầu tiên`;
    return;
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set("action", "count");
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store", signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    const count = result.orders ?? result.count;
    if (!response.ok || !result.success || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("Không đọc được số đơn thật.");
    }
    const registered = count;
    const remaining = Math.max(0, PROMO_CONFIG.promoLimit - registered);
    promoCount.textContent = `Đã có ${registered} đơn đăng ký – còn ${remaining} suất ưu đãi`;
  } catch {
    promoCount.textContent = `Ưu đãi ${formatVnd(activePrice())} dành cho ${PROMO_CONFIG.promoLimit} đơn đầu tiên`;
  }
};

const updateCountdown = () => {
  const hasDeadline = Boolean(PROMO_CONFIG.endTime) && Number.isFinite(Date.parse(PROMO_CONFIG.endTime));
  document.querySelector('#promo-timer').hidden = !hasDeadline;
  if (!hasDeadline) {
    promoStatus.textContent = "";
    return;
  }

  const diff = new Date(PROMO_CONFIG.endTime).getTime() - Date.now();
  if (diff <= 0) {
    promoCountdown.textContent = "00 : 00 : 00";
    promoStatus.textContent = "Chương trình ưu đãi đã kết thúc";
    updatePriceText();
    return;
  }

  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  promoCountdown.textContent = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(" : ");
};

document.querySelectorAll(".js-buy").forEach((button) => {
  button.addEventListener("click", scrollToOrder);
});

quantityInput.addEventListener("input", updateTotal);

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  setMessage("");

  const formData = new FormData(orderForm);
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const quantity = Number(formData.get("quantity"));
  const unitPrice = activePrice();
  const total = unitPrice * quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    setMessage("Vui lòng chọn số lượng nguyên từ 1 đến 100 cuốn.", "error");
    quantityInput.focus();
    return;
  }

  if (!name || !phone || !address) {
    setMessage("Vui lòng điền đủ họ tên, số điện thoại và địa chỉ nhận hàng.", "error");
    orderForm.querySelector(`[name="${!name ? 'name' : !phone ? 'phone' : 'address'}"]`).focus();
    return;
  }

  if (!isVietnamesePhone(phone)) {
    setMessage("Số điện thoại Việt Nam chưa đúng. Vui lòng kiểm tra lại.", "error");
    orderForm.querySelector('[name="phone"]').focus();
    return;
  }

  if (!GOOGLE_SCRIPT_URL) {
    setMessage("Hiện chưa thể tiếp nhận đơn trực tuyến. Bạn vui lòng quay lại sau.", "error");
    return;
  }

  submitButton.disabled = true;
  const originalSubmitHtml = submitButton.innerHTML;
  submitButton.textContent = "ĐANG GỬI ĐƠN...";
  setMessage("Đang lưu đơn hàng...", "");

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        name,
        phone,
        address,
        quantity,
        unitPrice,
        total,
        source: "Landing page TRI THỨC CỔ",
        pageUrl: window.location.href,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Không thể lưu đơn hàng.");
    }

    trackEvent("Lead", { currency: "VND", value: total, quantity });
    trackEvent("Purchase", { currency: "VND", value: total, quantity });
    orderForm.reset();
    quantityInput.value = "1";
    updateTotal();
    loadOrderCount();
    setMessage("Đặt sách thành công! Chúng tôi sẽ liên hệ xác nhận đơn hàng với bạn sớm nhất.", "success");
  } catch (error) {
    setMessage("Chưa xác nhận được đơn hàng. Vui lòng kiểm tra kết nối và thử lại sau.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalSubmitHtml;
    updatePriceText();
  }
});

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    )
  : null;

document.querySelectorAll(".reveal").forEach((element) => {
  if (revealObserver) {
    element.classList.add('reveal-ready');
    revealObserver.observe(element);
  } else {
    element.classList.add("visible");
  }
});

// Hide the mobile bar while any part of checkout is visible, including submit.
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    document.querySelector('#mobile-buy-bar').classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0 }).observe(orderPanel);
}

trackEvent("ViewContent", { content_name: "TRI THỨC CỔ", currency: "VND", value: activePrice() });
updatePriceText();
loadOrderCount();
updateCountdown();
if (PROMO_CONFIG.endTime) window.setInterval(updateCountdown, 1000);
