const GOOGLE_SCRIPT_URL = "";

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
  const quantity = Math.max(1, parseInt(quantityInput.value, 10) || 1);
  quantityInput.value = quantity;
  totalPrice.textContent = formatVnd(activePrice() * quantity);
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
  window.setTimeout(() => orderPanel.classList.remove("form-highlight"), 1100);
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
    promoCount.textContent = `Ưu đãi giới hạn cho ${PROMO_CONFIG.promoLimit} đơn đầu tiên`;
    return;
  }

  try {
    const url = new URL(GOOGLE_SCRIPT_URL);
    url.searchParams.set("action", "count");
    const response = await fetch(url.toString(), { method: "GET" });
    const result = await response.json();
    if (!response.ok || !result.success || typeof result.count !== "number") {
      throw new Error("Không đọc được số đơn thật.");
    }
    const registered = Math.max(0, result.count);
    const remaining = Math.max(0, PROMO_CONFIG.promoLimit - registered);
    promoCount.textContent = `Đã có ${registered} đơn đăng ký – còn ${remaining} suất ưu đãi`;
  } catch {
    promoCount.textContent = `Ưu đãi giới hạn cho ${PROMO_CONFIG.promoLimit} đơn đầu tiên`;
  }
};

const updateCountdown = () => {
  if (!PROMO_CONFIG.endTime) {
    promoCountdown.textContent = "00 : 00 : 00";
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
  setMessage("");

  const formData = new FormData(orderForm);
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const quantity = Math.max(1, parseInt(formData.get("quantity"), 10) || 1);
  const unitPrice = activePrice();
  const total = unitPrice * quantity;

  if (!name || !phone || !address) {
    setMessage("Vui lòng điền đủ họ tên, số điện thoại và địa chỉ nhận hàng.", "error");
    return;
  }

  if (!isVietnamesePhone(phone)) {
    setMessage("Số điện thoại Việt Nam chưa đúng. Vui lòng kiểm tra lại.", "error");
    return;
  }

  if (!GOOGLE_SCRIPT_URL) {
    setMessage("Chưa có Google Apps Script Web App URL. Vui lòng cấu hình GOOGLE_SCRIPT_URL trong script.js.", "error");
    return;
  }

  submitButton.disabled = true;
  const originalSubmitHtml = submitButton.innerHTML;
  submitButton.textContent = "ĐANG GỬI ĐƠN...";
  setMessage("Đang lưu đơn hàng...", "");

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
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
    setMessage(error.message || "Không thể gửi đơn. Vui lòng thử lại sau.", "error");
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
    revealObserver.observe(element);
  } else {
    element.classList.add("visible");
  }
});

trackEvent("ViewContent", { content_name: "TRI THỨC CỔ", currency: "VND", value: activePrice() });
updatePriceText();
loadOrderCount();
updateCountdown();
window.setInterval(updateCountdown, 1000);
