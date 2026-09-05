const GOOGLE_SCRIPT_URL = "";
const UNIT_PRICE = 199000;

const formatVnd = (value) => `${Number(value).toLocaleString("vi-VN")}đ`;

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

const orderSection = document.querySelector("#order");
const orderForm = document.querySelector("#order-form");
const quantityInput = orderForm.querySelector('[name="quantity"]');
const totalPrice = document.querySelector("#total-price");
const message = document.querySelector("#form-message");
const submitButton = orderForm.querySelector('button[type="submit"]');

const updateTotal = () => {
  const quantity = Math.max(1, parseInt(quantityInput.value, 10) || 1);
  quantityInput.value = quantity;
  totalPrice.textContent = formatVnd(UNIT_PRICE * quantity);
};

const scrollToOrder = () => {
  trackEvent("InitiateCheckout", { currency: "VND", value: UNIT_PRICE });
  orderSection.scrollIntoView({ behavior: "smooth", block: "start" });
};

const setMessage = (text, type = "") => {
  message.textContent = text;
  message.className = `form-message ${type}`.trim();
};

const isVietnamesePhone = (phone) => /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone.replace(/\s/g, ""));

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
  const total = UNIT_PRICE * quantity;

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
        unitPrice: UNIT_PRICE,
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
    setMessage("Đặt sách thành công! Chúng tôi sẽ liên hệ xác nhận đơn hàng với bạn sớm nhất.", "success");
  } catch (error) {
    setMessage(error.message || "Không thể gửi đơn. Vui lòng thử lại sau.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ĐẶT SÁCH – MIỄN PHÍ VẬN CHUYỂN";
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
trackEvent("ViewContent", { content_name: "TRI THỨC CỔ", currency: "VND", value: UNIT_PRICE });
updateTotal();
