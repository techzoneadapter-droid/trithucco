# TRI THỨC CỔ

Static landing page bán sách TRI THỨC CỔ, chạy được trên GitHub Pages hoặc Vercel.

## Chạy kiểm tra

```bash
npm run build
npm test
```

Mở `index.html` trực tiếp trong trình duyệt hoặc deploy toàn bộ thư mục lên GitHub Pages/Vercel.

## Kết nối Google Sheet

1. Mở project Google Apps Script gắn với Sheet (hoặc tạo mới nếu chưa có), cập nhật nội dung `apps-script/Code.gs`.
2. Deploy dạng Web app: Execute as `Me`, Who has access `Anyone`. Nếu đã có deployment, dùng Manage deployments → Edit → New version → Deploy để giữ URL cũ.
3. Copy Web App URL và dán vào biến `GOOGLE_SCRIPT_URL` trong `script.js`.

Sheet nhận dữ liệu: `1J9Z8f-AzWR6fLtRpKhB8NgcB52CDWQ4fcK8IWIGVYkQ`.

Hiện `GOOGLE_SCRIPT_URL` chưa được cấu hình. Website chỉ báo thành công khi máy chủ trả `success: true`; không thể nhận đơn thật trước khi kết nối Web App.

GET `?action=count` trả `success`, `orders` (và `count` để tương thích). Số đơn được đếm từ các hàng có thông tin đặt hàng, bỏ qua hàng trống. Khi chưa đọc được dữ liệu, trang không hiển thị số đăng ký hoặc số suất còn lại.

`npm test` dùng Playwright với Edge có sẵn; có thể đặt `PLAYWRIGHT_CHANNEL=chrome` nếu dùng Chrome. Ảnh desktop/mobile nằm trong `test-results/`. Kiểm thử gửi đơn dùng máy chủ mô phỏng, không ghi dữ liệu vào Sheet thật.

Website: https://techzoneadapter-droid.github.io/trithucco/
