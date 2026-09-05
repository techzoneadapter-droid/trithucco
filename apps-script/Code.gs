const SPREADSHEET_ID = "1J9Z8f-AzWR6fLtRpKhB8NgcB52CDWQ4fcK8IWIGVYkQ";
const SHEET_NAME = "Don hang";
const HEADERS = [
  "Thời gian",
  "Họ tên",
  "Số điện thoại",
  "Địa chỉ",
  "Số lượng",
  "Đơn giá",
  "Tổng tiền",
  "Nguồn",
  "URL trang",
];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "");
    if (action && action !== "count") {
      return jsonResponse({ success: false, error: "Action không hợp lệ." });
    }

    const sheet = getSheet();
    const rowCount = sheet.getDataRange().getValues().slice(1).filter((row) =>
      String(row[1] || "").trim() && String(row[2] || "").trim() &&
      String(row[3] || "").trim() && Number(row[4]) > 0
    ).length;
    return jsonResponse({ success: true, orders: rowCount, count: rowCount });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Không thể đọc số đơn." });
  }
}

function doPost(e) {
  let lock;
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const name = String(payload.name || "").trim();
    const phone = String(payload.phone || "").trim();
    const address = String(payload.address || "").trim();
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return jsonResponse({ success: false, error: "Số lượng không hợp lệ." });
    }
    const unitPrice = 199000;
    const total = unitPrice * quantity;

    if (!name || !phone || !address) {
      return jsonResponse({ success: false, error: "Thiếu thông tin bắt buộc." });
    }

    if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone.replace(/\s/g, ""))) {
      return jsonResponse({ success: false, error: "Số điện thoại không hợp lệ." });
    }

    lock = LockService.getScriptLock();
    lock.waitLock(15000);
    const sheet = getSheet();
    ensureHeader(sheet);
    sheet.appendRow([
      new Date(),
      safeCell(name),
      safeCell(phone),
      safeCell(address),
      quantity,
      unitPrice,
      total,
      safeCell(payload.source || "Landing page"),
      safeCell(payload.pageUrl || ""),
    ]);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Không thể lưu đơn hàng." });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function safeCell(value) {
  const text = String(value);
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const current = range.getValues()[0];
  const hasHeader = current.some((value) => String(value || "").trim());
  if (!hasHeader) {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
