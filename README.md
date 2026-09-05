# TRI THỨC CỔ

Static landing page bán sách TRI THỨC CỔ, chạy được trên GitHub Pages hoặc Vercel.

## Chạy kiểm tra

```bash
npm run build
```

Mở `index.html` trực tiếp trong trình duyệt hoặc deploy toàn bộ thư mục lên GitHub Pages/Vercel.

## Kết nối Google Sheet

1. Mở Google Apps Script, tạo project mới, dán nội dung `apps-script/Code.gs`.
2. Deploy dạng Web app: Execute as `Me`, Who has access `Anyone`.
3. Copy Web App URL và dán vào biến `GOOGLE_SCRIPT_URL` trong `script.js`.

Sheet nhận dữ liệu: `1J9Z8f-AzWR6fLtRpKhB8NgcB52CDWQ4fcK8IWIGVYkQ`.
