# Opera Bridge — Demo Project

Backend FastAPI cầu nối khách sạn ↔ Oracle OPERA Cloud. Bản demo này **chưa gọi OPERA Cloud thật** —
lưu/cập nhật dữ liệu nội bộ (`users`, `room_types`, `rooms`, `reservations`, `stays`,
`room_service_logs`) để test luồng nghiệp vụ Register/Login + Check-in/Check-out +
Do Not Disturb + Make-up-room, theo [`SKILLS/DATABASE_&_API.md`](../SKILLS/DATABASE_&_API.md).
Ngoài ra đã thêm lớp **MQTT test** theo
[Legrand GRMS Guest Control Platform protocol](../SKILLS/FILES/Guest%20Control%20Platform%20MQTT%20Interface%20Protocol.pdf)
(mặc định tắt) — xem mục "Tích hợp MQTT" dưới đây.

## Chạy bằng Docker

```bash
cp .env.example .env
docker compose up --build
```

API chạy tại `http://localhost:8000`, OpenAPI docs tại `http://localhost:8000/docs`
(chỉ hiển thị khi `APP_ENV != production`). Migration Alembic chạy tự động khi container `api` start.

> Nếu đang nâng cấp từ schema cũ, cần xoá volume Postgres cũ trước:
> `docker compose down -v` rồi `docker compose up --build`.

## Chạy local (không Docker)

```bash
cp .env.example .env
# sửa DATABASE_URL trong .env thành postgresql+psycopg2://opera:opera@localhost:5432/opera_bridge
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --app-dir src
```

## Dữ liệu mẫu (seed sẵn trong migration `001_initial_schema`)

12 loại phòng, tổng **365 phòng** — theo bảng số lượng trong
[`SKILLS/FILES/Tên phòng và số phòng.jpg`](../SKILLS/FILES/Tên%20phòng%20và%20số%20phòng.jpg).
Ảnh chỉ cho số lượng phòng theo loại, **không cho số phòng/tầng cụ thể**, nên `room_number`/`floor`
dưới đây là quy ước tự đặt trong migration: mỗi tầng tối đa 10 phòng, `room_number = "{tầng}{vị trí
trong tầng:02d}"`, các loại phòng xếp tầng liên tiếp theo đúng thứ tự trong ảnh. Cần thay lại seed
này khi có sơ đồ tầng thật, hoặc lấy qua RCU Device List (xem mục MQTT dưới đây).

| room_type code | name | max_guests | số lượng | room_number đầu | room_number cuối |
|---|---|---|---|---|---|
| DISABLED | Disabled | 2 | 7 | 101 | 107 |
| PK | Premium King | 2 | 21 | 201 | 401 |
| PK2 | Premium King 2 | 2 | 21 | 501 | 701 |
| PT | Premium Twin | 2 | 21 | 801 | 1001 |
| DT | Deluxe Twin | 2 | 120 | 1101 | 2210 |
| DT2 | Deluxe Twin 2 | 2 | 19 | 2301 | 2409 |
| DT3 | Deluxe Twin 3 | 2 | 63 | 2501 | 3103 |
| DK | Deluxe King | 2 | 12 | 3201 | 3302 |
| DK2 | Deluxe King 2 | 2 | 19 | 3401 | 3509 |
| JST | Junior Suite Twin | 4 | 21 | 3601 | 3801 |
| JSK | Junior Suite King | 4 | 20 | 3901 | 4010 |
| GS | Grand Suite | 4 | 21 | 4101 | 4301 |

`room_id` (số) là khoá nội bộ, **không xuất hiện trong bất kỳ API request/response** —
mọi endpoint dùng `room_number` (string) làm định danh phòng.

> ⚠️ Số phòng đã đổi hoàn toàn so với bản trước (`11`, `205`, `403`...). Postman collection đã
> được cập nhật sang phòng `201` (Premium King).

## Luồng demo

1. `POST /api/auth/register` (multipart/form-data: `username, gender, phone_number, email,
   password, role, avatar`; `role` là `CUSTOMER` hoặc `RECEPTIONIST`)
   → tạo user, avatar lưu tại `./uploads/avatar_{id}.{ext}`, trả về `/uploads/avatar_{id}.{ext}`.
2. `POST /api/auth/login` (`phone_number`, `password`) → trả `access_token` (JWT).
3. Gọi các action với header `Authorization: Bearer <access_token>`:
   - `POST /api/stays/check-in` — chỉ `RECEPTIONIST`. Body: `room_number, room_name?(optional),
     username, gender, phone_number, number_of_guests, expected_arrival_date,
     expected_departure_date`. Không nhận `reservation_id` — backend tự tạo reservation mới
     mỗi lần check-in. `checked_in_by` lấy từ JWT.
   - `POST /api/stays/check-out` — chỉ `RECEPTIONIST`. Body: chỉ `{room_number}` — backend tự
     tìm lượt lưu trú đang `CHECKED_IN` của phòng đó. `checked_out_by` lấy từ JWT.
   - `PATCH /api/rooms/{room_number}/do-not-disturb` — `RECEPTIONIST` hoặc `CUSTOMER`. Body:
     `{"status": true|false}`.
   - `POST /api/rooms/{room_number}/make-up-room` — chỉ `CUSTOMER`. Không cần body.
   - `PATCH /api/rooms/{room_number}/service` — chỉ `RECEPTIONIST` (đóng vai trò Housekeeping),
     đánh dấu hoàn thành yêu cầu dọn phòng (`make_up_room = false`).

Mỗi lần gọi DND/Make-up-room đều ghi 1 dòng vào `room_service_logs` (ai gọi, role gì, lúc nào).

## Tích hợp MQTT (test trước khi nối OPERA Cloud/RCU thật)

Theo [Legrand GRMS Guest Control Platform MQTT Interface Protocol](../SKILLS/FILES/Guest%20Control%20Platform%20MQTT%20Interface%20Protocol.pdf).
Mặc định **tắt** (`MQTT_ENABLED=false` trong `.env`) — khi tắt, backend chỉ log ra console
thay vì publish thật, demo chạy bình thường không cần broker.

Bật để test với broker thật/local (sửa trong `.env`):
```
MQTT_ENABLED=true
MQTT_BROKER_HOST=<host broker>
MQTT_BROKER_PORT=1883
MQTT_HOTEL_ID=<hotelId thật>
```

Khi bật, backend sẽ:
- Publish `SMARTHOTEL/COMMAND/{hotelId}/PMS/CHECKIN` và `.../PMS/CHECKOUT` mỗi khi gọi
  `/api/stays/check-in` / `/check-out` thành công.
- Publish `SMARTHOTEL/COMMAND/{hotelId}/RCU/ROOMSERVICECONTROL` (`serviceId: "dnd"` hoặc `"mur"`)
  mỗi khi gọi DND hoặc Make-up-room (request/complete).
- Subscribe `SMARTHOTEL/STATUS/{hotelId}/RCU`, `.../ROOMSERVICE`, `.../RCU/DEVICELIST` để nhận
  trạng thái đồng bộ/phản hồi từ RCU thật (lưu tạm trong memory, đọc lại qua API dưới).

Endpoint test (chỉ `RECEPTIONIST`):
- `POST /api/devices/refresh` — gửi yêu cầu lấy device list (`RCU/DEVICELIST`).
- `GET /api/devices` — đọc device list nhận được gần nhất (404 nếu chưa nhận được gì).
- `POST /api/rooms/{room_number}/devices/query` — gửi yêu cầu query trạng thái thiết bị 1 phòng
  (query param `device_id`, `device_type` optional).
- `GET /api/rooms/{room_number}/devices` — đọc trạng thái thiết bị nhận được gần nhất cho phòng đó.
- `GET /api/rooms/{room_number}/service-status` — đọc trạng thái DND/Make-up-room mà RCU đồng bộ
  ngược lại (topic `STATUS/{hotelId}/ROOMSERVICE`), dùng để xác nhận RCU đã áp dụng lệnh đã gửi.

Vì publish/subscribe MQTT là bất đồng bộ (không phải request/response trực tiếp), các API `GET`
trên chỉ đọc lại cache trong RAM từ message nhận được gần nhất — không chờ phản hồi đồng bộ.

**Giả định/đơn giản hoá vì chưa nối RCU thật:**
- `roomNo` trong message MQTT = trực tiếp `room_number` của hệ thống (protocol gốc dùng định dạng
  building_floor_room_subroom như `A_5F_8529_2`, nhưng schema hiện tại không có building/sub-room).
- `businessKey` (PMS check-in/out) = `reservation_id`.
- `sourceType` trong `ROOMSERVICECONTROL` cố định là `"PMS"` (vai trò Receptionist/Customer thật
  đã được ghi riêng vào `room_service_logs`, không nhúng vào message MQTT để giữ đúng field set
  của protocol).

## Test bằng Postman

Import file [`postman/opera-bridge-demo.postman_collection.json`](postman/opera-bridge-demo.postman_collection.json).
Collection gồm: register 2 user (Receptionist + Customer), login (tự lưu token vào biến
`token`/`customer_token`), check-in/check-out, DND, make-up-room + các request kiểm chứng
403 khi gọi sai role.

## Giới hạn của bản demo

- Không gọi Oracle OPERA Cloud thật — `opera_cloud_client.py`/`opera_auth_client.py` sẽ phải
  build khi bước vào giai đoạn tích hợp OPERA Cloud thật (bản code cũ có các phần này đã bị xoá,
  xem [`WORK_LOG.md`](../SKILLS/WORK_LOG.md) mục 11).
- Lớp MQTT (xem mục "Tích hợp MQTT" trên) đã verify end-to-end với Mosquitto local qua Docker
  (publish đúng topic/payload, subscribe nhận + cache đúng) nhưng **chưa test với RCU thật**,
  chưa có cơ chế retry khi mất kết nối, chưa map `roomNo` dạng building/floor/room/sub-room
  như protocol gốc.
- Sau Check-out, `rooms.status` chuyển thành `Cleaning` nhưng chưa có endpoint nào đưa phòng
  về lại `Vacant` — tài liệu đặc tả chưa định nghĩa endpoint này.
