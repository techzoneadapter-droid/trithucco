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

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const name = String(payload.name || "").trim();
    const phone = String(payload.phone || "").trim();
    const address = String(payload.address || "").trim();
    const quantity = Math.max(1, parseInt(payload.quantity, 10) || 1);
    const unitPrice = 199000;
    const total = unitPrice * quantity;

    if (!name || !phone || !address) {
      return jsonResponse({ success: false, error: "Thiếu thông tin bắt buộc." });
    }

    if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone.replace(/\s/g, ""))) {
      return jsonResponse({ success: false, error: "Số điện thoại không hợp lệ." });
    }

    const sheet = getSheet();
    ensureHeader(sheet);
    sheet.appendRow([
      new Date(),
      name,
      phone,
      address,
      quantity,
      unitPrice,
      total,
      payload.source || "Landing page",
      payload.pageUrl || "",
    ]);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Không thể lưu đơn hàng." });
  }
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
