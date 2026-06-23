# CHAMPARAMA-RESORT-SPA



Hướng dẫn cách chạy chương trình:



**Backend**

wsl

cd BACKEND/opera-bridge

docker compose down -v

docker compose up -d

docker compose up --build

\-> Ta sẽ có được đường link (http://localhost:8000/docs) — đang chạy sẵn

Cách 1 — Postman (nhanh nhất):

Import postman/opera-bridge-demo.postman\_collection.json (đã update phòng 201), bấm chạy lần lượt từ trên xuống. Tự lưu token, tự test 403 đúng/sai role.



Cách 2 — Swagger UI: mở http://localhost:8000/docs, thử trực tiếp từng endpoint.



Số phòng hợp lệ để test (số cũ 11/205/403 không còn): 101 (Disabled), 201 (Premium King), 1101 (Deluxe Twin), 4101 (Grand Suite)... — bảng đầy đủ trong README.



Test MQTT (tùy chọn, mặc định tắt): sửa BACKEND/opera-bridge/.env → MQTT\_ENABLED=true + MQTT\_BROKER\_HOST=<broker của bạn>, rồi docker compose up --build -d. Khi tắt (mặc định), mọi message chỉ in ra log (docker compose logs api -f) để bạn xem payload mà không cần broker.



**Frontend**

npm run dev

Ta sẽ có được đường link

(http://localhost:5173) — vừa khởi động

Mở http://localhost:5173/register → tạo 1 Receptionist + 1 Customer (nhớ chọn role đúng).

/login → đăng nhập.

/actions → 4 nút Check in/Check out/DND/Make up room (ẩn hiện theo role). Nhập Room Number = 1001(hoặc số khác trong bảng trên).

Mở DevTools (F12) → tab Console để xem kết quả mỗi lần bấm nút (không hiện trên UI, đúng thiết kế demo).



==============================================

Nhờ AI project thì dựa vào file: 

BACKEND\\SKILLS\\WORK\_LOG.md

BACKEND\\SKILLS\\DATABASE\_\&\_API.md

