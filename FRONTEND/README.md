# Opera Bridge — Frontend Demo

Frontend test harness cho backend `opera-bridge` (xem [`FRONTEND.md`](FRONTEND.md) để biết spec đầy đủ).

## Chạy

```bash
npm install
cp .env .env.local   # hoặc sửa trực tiếp .env nếu backend không chạy ở localhost:8000
npm run dev
```

Mở `http://localhost:5173`. Backend `opera-bridge` phải đang chạy ở `http://localhost:8000`
(xem [`../BACKEND/opera-bridge/README.md`](../BACKEND/opera-bridge/README.md)) — đã cấu hình
CORS cho phép origin `http://localhost:5173`.

## Luồng demo

1. `/register` — tạo tài khoản (Receptionist hoặc Customer), có upload avatar.
2. `/login` — đăng nhập bằng phone_number + password.
3. `/actions` — màn hình 4 nút Check in / Check out / Do Not Disturb / Make up room,
   ẩn/hiện theo role. Mỗi lần bấm nút, kết quả (hoặc lỗi) được `console.log` ra DevTools
   Console (F12 → tab Console) — không hiển thị trên UI, đúng theo yêu cầu demo.

## Build

```bash
npm run build
```
