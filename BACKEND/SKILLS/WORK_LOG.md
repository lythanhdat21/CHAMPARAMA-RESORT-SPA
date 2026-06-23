# Work Log — Opera Bridge Demo Project

> File này lưu lại toàn bộ quá trình làm việc, quyết định và các vấn đề đã phát hiện
> khi build bản Demo tại `opera-bridge/`, dùng làm tham khảo trước khi build chương trình
> mới dựa trên `BACKEND/SKILLS/DATABASE_&_API.md` (đã hợp nhất với `GATEWAY_OVERVIEW.md`
> gốc — file đó cùng `Intro.md` đã bị **xoá 2026-06-20** vì mô tả kiến trúc MQTT/OPERA
> Cloud chưa từng build, dễ gây hiểu lầm; xem mục 12).

## 0. Cách chạy project (chuẩn, khớp code hiện tại)

**Backend:**
```bash
wsl
cd opera-bridge
#cp .env.example .env
docker compose up --build
```
API chạy tại `http://localhost:8000`, OpenAPI docs tại `http://localhost:8000/docs`.
Chi tiết đầy đủ (chạy local không Docker, nâng cấp schema...) xem
[`opera-bridge/README.md`](../opera-bridge/README.md).

**Frontend:**
```bash
cd FRONTEND
npm install
npm run dev
```
Mở `http://localhost:5173`. Chi tiết xem [`FRONTEND/README.md`](../../FRONTEND/README.md).

> ⚠️ `GATEWAY_OVERVIEW.md` và `Intro.md` (từng có hướng dẫn chạy ở mục 10-12) đã bị **xoá**
> — chúng viết cho kiến trúc MQTT/OPERA Cloud đầy đủ ban đầu (vd. ghi
> `uvicorn src.main:app --reload`), không khớp entrypoint thật của bản demo hiện tại
> (`uvicorn app.main:app --app-dir src`). Luôn dùng lệnh ở mục này hoặc trong
> `opera-bridge/README.md`/`FRONTEND/README.md`.

## 1. Bối cảnh ban đầu

- Yêu cầu: review `GATEWAY_OVERVIEW.md` + `Demo_Project.md`, sau đó build chương trình.
- Lúc bắt đầu, `opera-bridge/` trống — chỉ có một thư mục rác tên `mosquitto.conf` (không phải file cấu hình, đã xoá).

## 2. Phát hiện quan trọng: code cũ bị mất (lần 1)

- Khi chạy `docker compose up --build`, Docker báo có container orphan từ một project
  "opera-bridge" cũ: `opera-bridge-app-1`, `opera-bridge-mqtt-1`.
- Kiểm tra image `opera-bridge-app` (build 2026-06-11 → 2026-06-17), phát hiện bên trong
  có một bản implementation **đầy đủ** đúng kiến trúc trong `GATEWAY_OVERVIEW.md`:
  MQTT subscriber/handlers, `opera_cloud_client`, `opera_auth_client`, mappers,
  schemas `internal/` + `opera/`, jobs, tests, cashiering routes...
- Toàn bộ source code đó **đã biến mất khỏi ổ đĩa**, chỉ còn lại trong layer của image Docker.
  Nguyên nhân mất chưa rõ.
- Đã hỏi user: khôi phục từ image hay bỏ qua? → **User chọn bỏ qua, không khôi phục.**
- Đã chạy `docker compose up --remove-orphans` để dọn 2 container orphan (chỉ xoá
  container, không xoá image — image cũ vẫn còn trên máy nếu sau này cần xem lại).

## 3. Quyết định stack đã chốt

- Database: **PostgreSQL + Alembic + Docker** (user đã có Docker Desktop/WSL sẵn) —
  không dùng SQLite.

## 4. Đã build (bản Demo v1) — theo `Demo_Project.md`

Stack: Python 3.11, FastAPI, SQLAlchemy 2.0 (sync, psycopg2), Alembic, PostgreSQL,
PyJWT, `passlib[bcrypt]` (ghim `bcrypt==4.0.1` vì `passlib==1.7.4` không tương thích
`bcrypt>=4.1`), Docker compose (services `db`, `api`).

**DB schema (v1):**
- `users`: username, gender, phone_number (unique), email (unique), password_hash,
  role (Receptionist/Customer), avatar, created_at.
- `rooms`: room_number (unique), room_type, status (housekeeping), is_occupied,
  is_dnd, housekeeping_requested, updated_at. Seed sẵn 9 phòng:
  Premium King 11/15/17, Deluxe Twin 202/205/209, Junior Suite King 403/408/409.
- `reservations`: reservation_code (unique, do client cung cấp), room_number (FK),
  guest_name, room_type, number_of_guests, expected_departure_date, status.

**Endpoints (v1):**
- `GET /health`
- `POST /users` (multipart, lưu avatar vào `uploads/avatar_{id}.{ext}`, serve qua
  static `/uploads`)
- `POST /auth/login` (phone_number + password → JWT)
- `POST /rooms/{room_number}/check-in`, `/check-out` — chỉ role Receptionist
- `POST /rooms/{room_number}/do-not-disturb` — Receptionist hoặc Customer
- `POST /rooms/{room_number}/make-up-room` — chỉ Customer

## 5. Bug đã gặp và đã sửa trong quá trình test thật (bản v1)

1. **Dockerfile CMD sai module path** — `uvicorn src.app.main:app` báo
   `ModuleNotFoundError: No module named 'app'` vì `/app/src` không có trong
   `sys.path`. Đã sửa: `uvicorn app.main:app --app-dir src`.
2. **Postman test script lỗi `Identifier 'data' has already been declared`** —
   do dùng `const data = ...` ở top-level script; Postman giữ sandbox giữa các lần
   Send nên khai báo `const`/`let` bị trùng khi bấm Send lần 2. Đã sửa: bọc trong
   `pm.test(function () { var data = ...; })` để mỗi lần chạy có scope riêng.
3. **User nhầm tưởng Customer check-in/check-out được** — do request Check-in/
   Check-out trong Postman collection luôn dùng cố định biến `{{token}}`
   (token Receptionist từ lần login trước), không tự đổi theo việc "vừa login
   Customer". Đã verify lại bằng curl trực tiếp: backend chặn đúng (403 cho
   Customer gọi check-in/check-out). Đã thêm request kiểm chứng âm vào collection
   dùng token role sai có chủ đích để user tự thấy 403.
4. **Check-out response thiếu `guest_name`/`room_type`** — user cập nhật
   `Demo_Project.md` dòng 125-126 thêm 2 field này vào response mẫu. Đã sửa
   `rooms.py` (bản v1), rebuild image, verify lại bằng curl — khớp đúng.

## 6. File mới `BACKEND/SKILLS/DATABASE_&_API.md` — review và chốt thiết kế v2

File này đề xuất thiết kế lớn hơn nhiều so với bản demo v1, và bản thân file có vài
mâu thuẫn nội tại đã được rà soát + user tự sửa file qua nhiều vòng để chốt.

### Các mâu thuẫn ban đầu (đã được user sửa trực tiếp trong file để giải quyết)

1. DND từng có 2 thiết kế khác nhau (POST/DELETE + `service_status` enum, hoặc
   PATCH + boolean + log) — user đã **comment bỏ bản enum**, chỉ giữ bản
   PATCH + boolean `rooms.do_not_disturb` + ghi log `room_service_logs`.
2. Make-up-room từng có 2 thiết kế (`service_status` enum, hoặc boolean + log +
   MQTT publish) — user chốt: **boolean + log, KHÔNG MQTT**; bước "hoàn thành"
   do **Receptionist** gọi (đóng vai trò Housekeeping) — ghi chú thêm ở cuối file
   gốc: "Make up room, chọn thiết kế boolean + log để build. Receptionist đóng
   vai trò là HouseKeeping."
3. Check-in/Check-out ban đầu thiếu URL — user bổ sung rõ:
   `POST /api/stays/check-in`, `POST /api/stays/check-out`, xác nhận dùng bảng
   `stays` riêng (tách khỏi `reservations`).
4. `checked_in_by`/`checked_out_by` được bỏ khỏi request body — lấy từ JWT của
   Receptionist đang gọi API, không tin client tự khai báo.

### Điểm đã chốt với user (quan trọng, không hỏi lại)

- Field tên khách dùng **`username`** xuyên suốt (cả trong `users`, `stays`,
  `reservations`) — không đổi thành `guest_name`, đây là convention user dùng từ
  lúc khởi tạo. `role` (`CUSTOMER`/`RECEPTIONIST`, viết hoa) dùng để phân biệt
  loại tài khoản, độc lập với field tên.
- Định danh phòng: `room_id` (số, PK) + bảng `room_types` lookup riêng (code/name/
  max_guests) — KHÔNG dùng `room_number` string đơn giản như bản v1.
- Có bảng `stays` (tách khỏi `reservations`) và `room_service_logs` (audit DND/
  Make-up-room) — đúng theo đề xuất trong file.

### ⚠️ Lưu ý: bản thân `Demo_Project.md` và file `WORK_LOG.md` này đã từng bị mất

Xem mục 7 dưới đây — nguyên nhân chưa rõ, nghi ngờ phía máy (antivirus, sync tool,
hoặc lỗi đĩa), không phải do lệnh xoá nào trong session.

## 7. Đã build lại (bản Demo v2) — theo `DATABASE_&_API.md`

Stack giữ nguyên (Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, PyJWT,
passlib[bcrypt]==bcrypt 4.0.1, Docker compose). Thêm `app/core/timeutil.py`: lưu UTC
trong DB, serialize response theo giờ Việt Nam (`Asia/Ho_Chi_Minh`, ISO 8601 có
offset +07:00).

**DB schema (v2):** `users` (+role viết hoa), `room_types` (PK/DT/JSK), `rooms`
(room_id PK số, room_type_id FK, floor, status Vacant/Occupied/Cleaning,
do_not_disturb, make_up_room), `reservations` (reservation_id PK do client cung cấp,
username, number_of_guests, expected_departure_date, status BOOKED — không đổi sau
check-in), `stays` (stay_id PK, reservation_id FK, room_id FK, username,
number_of_guests, expected_arrival/departure_date, checked_in/out_at/by, status
CHECKED_IN/CHECKED_OUT), `room_service_logs` (audit: stay_id nullable, room_id,
service, action ON/OFF/REQUEST/COMPLETE, requested_by, requested_role, requested_at).

**Endpoints (v2, tất cả dưới `/api/` trừ `/health`):**
- `GET /health`
- `POST /api/auth/register` (multipart: username, gender, phone_number, email,
  password, role, avatar file) → message "Register success"
- `POST /api/auth/login` → message "Login success"
- `POST /api/stays/check-in` — chỉ RECEPTIONIST
- `POST /api/stays/check-out` — chỉ RECEPTIONIST, lỗi 409 nếu stay đã CHECKED_OUT
- `PATCH /api/rooms/{room_id}/do-not-disturb` — RECEPTIONIST hoặc CUSTOMER
- `POST /api/rooms/{room_id}/make-up-room` — chỉ CUSTOMER
- `PATCH /api/rooms/{room_id}/service` — chỉ RECEPTIONIST, đánh dấu hoàn thành
  make-up-room

Đã xoá volume Postgres cũ (`docker compose down -v`) vì schema đổi hoàn toàn, build
lại, verify toàn bộ flow bằng curl thật + query trực tiếp Postgres
(`room_service_logs`, `rooms`) — tất cả đúng: role 403 đúng người đúng việc,
check-out lại bị 409, log ghi đúng actor/role.

Postman collection cập nhật tại
`BACKEND/opera-bridge/postman/opera-bridge-demo.postman_collection.json` (có cả request
kiểm chứng 403 cho từng role sai).

**Giới hạn còn lại (chưa làm, vì tài liệu chưa định nghĩa):**
- Sau Check-out, `rooms.status` chuyển "Cleaning" nhưng chưa có endpoint đưa về
  lại "Vacant".
- Không publish MQTT cho Make-up-room (quyết định rõ của user, mục 6).

## 8. ⚠️ SỰ CỐ MẤT FILE — xảy ra 2 lần, cần điều tra phía máy user

**Lần 1 (mục 2):** code MQTT/OPERA Cloud đầy đủ build 06-11→06-17 mất khỏi ổ đĩa,
chỉ cứu được qua layer Docker image cũ `opera-bridge-app`.

**Lần 2 (2026-06-19, trong lúc build bản v2):** toàn bộ file hạ tầng của bản v1
(Dockerfile, docker-compose.yml, config.py, security.py, main.py, services, routes,
requirements.txt, .env, postman collection cũ...) biến mất khỏi `opera-bridge/`.
Cứu lại bằng `docker create opera-bridge-api` + `docker cp <cid>:/app/. →
opera-bridge-recovered/` (image build gần nhất vẫn còn trên máy), rồi copy phần
chưa kịp viết lại trở về `opera-bridge/`.

**Lần 3 (cùng thời điểm hoặc ngay sau lần 2):** chính file `Demo_Project.md` (user
đang mở và chỉnh sửa trực tiếp trong IDE suốt cuộc trò chuyện) và file `WORK_LOG.md`
này cũng biến mất khỏi `BACKEND/SKILLS/`. Không có image Docker nào chứa các file
này (đây là file markdown thuần, không nằm trong opera-bridge/) — phải khôi phục từ
nội dung Claude đã đọc được trong lịch sử hội thoại. Các file khác trong cùng thư
mục (`DATABASE.md`, `DATABASE_&_API.md`, `GATEWAY_OVERVIEW.md`, `Endpoint_request.md`,
`Intro.md`, `mqtt-json-raw.txt`, `PROJECT_STRUCTURE_VA_LUONG_HOAT_DONG.md`,
`Y_TUONG_TOOL_CAU_NOI_OPERA_CLOUD.md`, thư mục `FILES/`) và 3 thư mục cấm
(`graphql`, `postman-collections`, `rest-api-specs`) đều **còn nguyên, không bị
ảnh hưởng**.

**Nhận định:** không có lệnh xoá nào (`rm`, `git clean`, v.v.) trong lịch sử các
session khớp với các file bị mất này. Khả năng cao nhất: antivirus/EDR quarantine,
phần mềm đồng bộ cloud (OneDrive/Google Drive/Dropbox) xung đột, script dọn dẹp tự
động, hoặc lỗi đĩa trên máy user. **User nên kiểm tra các khả năng này** — nếu xảy
ra lần nữa và không còn bản sao nào (Docker image, lịch sử hội thoại), dữ liệu sẽ
mất thật.

**Khuyến nghị:** backup `opera-bridge/` và `BACKEND/SKILLS/*.md` ra git hoặc nơi
khác định kỳ. Thư mục cứu hộ tạm `opera-bridge-recovered/` (cùng cấp `opera-bridge/`)
đang còn trên máy — có thể xoá khi không cần nữa.

## 9. Đã build frontend (`FRONTEND/`) — React + Vite, test thật bằng Playwright

Stack: React 19, TypeScript, Vite 6 (hạ từ Vite 8 do lỗi native binding rolldown trên
Windows), React Router, Axios, TailwindCSS v4, shadcn/ui (Base UI), React Hook Form + Zod.
3 trang: `/register`, `/login`, `/actions` (4 nút Check in/Check out/Do Not Disturb/Make up
room, ẩn hiện theo role, mỗi nút `console.log` kết quả ra DevTools — không hiển thị UI).

Bug phát hiện khi test thật bằng browser (Playwright, vì máy không có `chromium-cli`):
1. Backend thiếu `CORSMiddleware` → browser chặn mọi request từ `localhost:5173` (curl/
   Postman không phát hiện được). Đã thêm `cors_origins` + `CORSMiddleware` vào
   `BACKEND/opera-bridge/src/app/core/config.py` + `main.py`.
2. Layout 2 nút DND dùng `w-full` trong flex row bị co lệch → sửa `flex-1`.

## 10. Đổi định danh phòng từ `room_id` sang `room_number` (2026-06-19, sau khi user sửa `DATABASE_&_API.md` thêm lần nữa)

Sau khi review lại `DATABASE_&_API.md`, phát hiện tài liệu đã chuyển hẳn sang dùng
**`room_number`** (string, vd "11", "205") làm định danh phòng trong MỌI request — khác
hẳn bản trước dùng `room_id` (số, PK nội bộ). User xác nhận thêm:

1. **Check-in không còn nhận `reservation_id`** — backend tự tạo `Reservation` mới mỗi
   lần check-in (không có khái niệm đặt phòng trước qua API này).
2. **Check-out chỉ cần `room_number`** (bỏ `stay_id` và `username`) — backend tự tìm
   `Stay` có `status=CHECKED_IN` mới nhất của phòng đó để check-out.
3. Response Make-up-room/Housekeeping-hoàn-thành **giữ lại field `make_up_room: bool`**
   (đã sửa "mồ côi" `service_status` còn sót ở mục Housekeeping hoàn thành — đổi hẳn sang
   boolean, khớp quyết định mục 6).
4. `room_number` là số phòng cụ thể thuộc về 1 `room_name` (loại phòng) — quan hệ
   nhiều-room_number/1-room_type, không đổi so với thiết kế `room_types` đã có.
5. Thêm cột `gender`, `phone_number` (của khách, khác cột cùng tên ở `users`) vào **CẢ
   `reservations` VÀ `stays`**.

**Đã sửa:** `models.py` (+gender/phone_number), migration 001 (rebuild từ đầu, xoá volume
cũ do đổi schema), `schemas/stay.py` (CheckInRequest/CheckOutRequest theo field mới),
`services/stay_service.py` + `services/room_service.py` (tra phòng theo `room_number`,
check-out tìm stay mới nhất theo `room_id`+`CHECKED_IN`), `routes/stays.py` + `routes/rooms.py`
(`{room_number}` thay `{room_id}` trong path, response trả `room_number`+`room_name` join
từ `room_types`, không lộ `room_id` ra ngoài API nữa).

**Frontend cũng đã update khớp:** `types/actions.ts`, `api/actionsApi.ts`, và 4 action card
(`CheckInCard` thêm Giới tính/SĐT khách, `CheckOutCard` chỉ còn Room Number, `DndCard`/
`MakeUpRoomCard` đổi Room ID → Room Number).

Đã verify lại toàn bộ bằng curl (backend) + Playwright (frontend, browser thật) sau khi
đổi — tất cả pass, không lỗi console.

## 11. Đính chính mục 2 + gộp thư mục `opera-bridge/` vào trong `BACKEND/` (2026-06-19)

**Đính chính quan trọng:** mục 2 ("code cũ bị mất") ghi sai — code MQTT/OPERA Cloud đầy đủ
**không hề biến mất khỏi ổ đĩa**. Nó nằm ở `BACKEND\opera-bridge\` suốt từ đầu (build trước
session này, có MQTT subscriber, `opera_cloud_client.py`, `opera_auth_client.py`, mappers,
jobs, tests, `pyproject.toml`...). Lý do tưởng nhầm là "mất": Claude chỉ kiểm tra thư mục
`opera-bridge/` ở **cấp gốc** (sibling của `BACKEND/`, nơi build bản demo trong session này)
— thư mục đó thật sự trống, nhưng đó không phải là nơi code cũ từng nằm. Container Docker
orphan (`opera-bridge-app-1`, `opera-bridge-mqtt-1`) phát hiện đầu session thực ra được build
từ chính `BACKEND\opera-bridge\` này.

**Quyết định của user sau khi phát hiện:** xoá `BACKEND\opera-bridge\` (bản cũ, kiến trúc
MQTT/OPERA Cloud, chưa khớp các quyết định thiết kế mới nhất) và **chuyển (move) thư mục
`opera-bridge/` cấp gốc (bản demo v3, đã test) vào trong `BACKEND/`** — vị trí cuối cùng:
`BACKEND/opera-bridge/`.

Đã thực hiện:
1. `docker compose down` (dừng container của bản demo trước khi move).
2. Xoá `BACKEND/opera-bridge/` (bản cũ) — image Docker `opera-bridge-app` (build từ bản cũ
   này) vẫn còn trên máy nếu sau này cần xem lại tham khảo.
3. `mv opera-bridge/ BACKEND/opera-bridge/` — lưu ý: lệnh `mv` ban đầu lỗi
   "Device or resource busy" vì working directory của shell đang nằm trong chính
   `opera-bridge/` — phải `cd` ra ngoài trước khi move được (Windows không cho move thư mục
   đang là cwd của 1 process).
4. Sửa lại toàn bộ đường dẫn tương đối bị ảnh hưởng: `GATEWAY_OVERVIEW.md`/`Intro.md`
   (`cd opera-bridge` → `cd BACKEND/opera-bridge`), `opera-bridge/README.md` (link tới
   `SKILLS/*.md` đổi từ `../BACKEND/SKILLS/...` → `../SKILLS/...` vì giờ là sibling của
   `SKILLS/` trong `BACKEND/`, và viết lại nội dung README theo đúng API v3 `room_number`
   vì bản cũ vẫn mô tả `room_id`/v2), `FRONTEND/README.md` (link tới opera-bridge đổi thành
   `../BACKEND/opera-bridge/README.md`).

**Cấu trúc cuối cùng:** `BACKEND/` (graphql, postman-collections, rest-api-specs, .github —
4 folder cấm; SKILLS/ — tài liệu đặc tả; opera-bridge/ — code backend demo thật) và
`FRONTEND/` (code React) là 2 thư mục cùng cấp ở gốc repo.

## 12. Xoá `GATEWAY_OVERVIEW.md` và `Intro.md` (2026-06-20)

User xoá 2 file này khỏi `BACKEND/SKILLS/` vì chúng mô tả kiến trúc MQTT/OPERA Cloud đầy đủ
**chưa từng được build trong bản demo hiện tại** (code đó đã bị xoá từ mục 11) — giữ lại dễ
khiến người đọc sau (kể cả Claude ở session khác) hiểu sai là tính năng đã có sẵn.

Đã sửa các tham chiếu còn lại sau khi xoá:
- `WORK_LOG.md` (mục 0, dòng đầu file) — bỏ link, ghi rõ đã xoá.
- `BACKEND/opera-bridge/README.md` mục "Giới hạn của bản demo" — link
  `[GATEWAY_OVERVIEW.md](../SKILLS/GATEWAY_OVERVIEW.md)` đã hỏng (file không còn tồn tại),
  đã bỏ link, giữ lại câu mô tả bằng chữ thường.

Các tham chiếu lịch sử khác trong `WORK_LOG.md` (mục 1, 6, 7, 10) nhắc tên 2 file này khi kể
lại diễn biến tại đúng thời điểm đó — **giữ nguyên, không sửa**, vì đó là tường thuật quá khứ
chính xác lúc file vẫn còn tồn tại.

**File còn lại mô tả đúng project demo đang chạy:** `DATABASE_&_API.md` (spec API/DB chính
xác) + `WORK_LOG.md` (lịch sử quyết định, file này).

**Cập nhật 2026-06-21 — đã xoá tiếp 4 file cùng loại "tài liệu định hướng tương lai":**
`DATABASE.md`, `PROJECT_STRUCTURE_VA_LUONG_HOAT_DONG.md`, `Endpoint_request.md`,
`Y_TUONG_TOOL_CAU_NOI_OPERA_CLOUD.md` — cùng lý do với `GATEWAY_OVERVIEW.md`/`Intro.md` ở
mục 12 (mô tả kiến trúc MQTT/OPERA Cloud đầy đủ chưa từng build). Chỉ tham chiếu nội bộ
trong `WORK_LOG.md`, không có file nào khác link tới nên xoá không gãy link.

**Giữ lại `mqtt-json-raw.txt`** — khác loại với 4 file trên: đây là **dữ liệu mẫu thật**
(payload MQTT thật từ hệ RCU Legrand), không phải tài liệu mô tả/hướng dẫn dễ gây hiểu lầm.
Giữ lại để dùng làm tham khảo khi sau này thật sự build tích hợp MQTT.

**`SKILLS/` cuối cùng chỉ còn:** `DATABASE_&_API.md`, `Demo_Project.md`, `WORK_LOG.md`,
`mqtt-json-raw.txt`, `hospitality_gateway_diagram.svg`, thư mục `FILES/`.

## 13. Thêm lớp MQTT test (Legrand GRMS protocol) + reseed 365 phòng theo ảnh (2026-06-21)

User thêm 2 file vào `SKILLS/FILES/`: `Guest Control Platform MQTT Interface Protocol.pdf`
(spec MQTT đầy đủ của Legrand — protocol gốc mà `GATEWAY_OVERVIEW.md`/`Intro.md` mô tả, đã xoá ở
mục 12) và `Tên phòng và số phòng.jpg` (bảng 12 loại phòng, tổng 365 phòng). Yêu cầu: cập nhật code
để **test MQTT trước khi nối OPERA Cloud/RCU thật**.

**Phạm vi đã chốt với user (qua AskUserQuestion):**
1. MQTT phủ cả 3 phần: PMS Check-in/Check-out, RCU Service Control (DND/MUR), RCU Device
   List/Query Status.
2. **Chỉ code logic publish/subscribe (paho-mqtt), KHÔNG thêm broker Mosquitto vào
   docker-compose** — user tự kết nối broker riêng khi test (`MQTT_ENABLED=false` mặc định, demo
   chạy không cần broker).
3. Seed lại `room_types`/`rooms` theo đúng 12 loại + 365 phòng trong ảnh.

**Đã build:**
- `app/core/mqtt_client.py` (mới) — wrapper paho-mqtt: publish `PMS/CHECKIN`, `PMS/CHECKOUT`,
  `RCU/ROOMSERVICECONTROL`, `RCU/DEVICELIST` (request), `RCU/QUERYSTATUS`; subscribe
  `STATUS/{hotelId}/RCU`, `.../ROOMSERVICE`, `.../RCU/DEVICELIST`, cache kết quả nhận được trong
  RAM. Khi `MQTT_ENABLED=false` (mặc định), mọi publish chỉ log ra console, không kết nối broker.
- `config.py`/`.env.example`: thêm `MQTT_ENABLED`, `MQTT_BROKER_HOST/PORT`, `MQTT_USERNAME/PASSWORD`,
  `MQTT_HOTEL_ID`, `MQTT_CLIENT_ID`.
- `main.py`: chuyển sang `lifespan` (thay `@app.on_event`) để connect/disconnect MQTT theo
  lifecycle app.
- `stay_service.py`: publish PMS CHECKIN/CHECKOUT sau khi check-in/check-out commit DB thành công.
- `room_service.py`: publish RCU ROOMSERVICECONTROL (`serviceId: "dnd"`/`"mur"`) sau khi DND/
  Make-up-room (request + complete) commit DB — **đảo ngược quyết định cũ ở mục 6** (trước đây
  chốt "Make-up-room KHÔNG MQTT", giờ user chủ động yêu cầu thêm MQTT cho cả DND và MUR).
- Route mới `api/routes/devices.py` (`POST/GET /api/devices`) + 2 endpoint mới trong `rooms.py`
  (`POST/GET /api/rooms/{room_number}/devices`) để trigger request + đọc cache device list/query
  status — vì MQTT là bất đồng bộ, các API GET chỉ đọc lại message nhận gần nhất, không chờ
  response đồng bộ.
- `requirements.txt`: thêm `paho-mqtt==1.6.1`.
- Migration `001_initial_schema.py`: thay `ROOM_TYPES_SEED`/`ROOMS_SEED` cũ (3 loại/9 phòng) bằng
  `ROOM_TYPE_DEFS` (12 loại đúng ảnh) + hàm `_generate_rooms_seed()` sinh 365 phòng theo quy ước
  tự đặt (10 phòng/tầng, room_number = floor+vị trí, xếp tầng liên tiếp theo thứ tự loại phòng
  trong ảnh — đã verify bằng script Python độc lập: đúng 365 phòng, không trùng room_number, 43
  tầng). **Số phòng cũ (`11`, `205`, `403`...) không còn tồn tại** — đã cập nhật lại Postman
  collection sang phòng `201` (Premium King), verify lại bằng curl thật (check-in/DND/check-out
  trả 200, không còn 404).

**Giả định cần lưu ý (do protocol gốc và schema hiện tại không khớp 100%):**
- `roomNo` trong message MQTT dùng trực tiếp `room_number` (protocol gốc dùng định dạng
  building_floor_room_subroom).
- `businessKey` (PMS check-in/out) = `reservation_id`.
- `sourceType` trong `ROOMSERVICECONTROL` cố định `"PMS"` (role thật của actor vẫn ghi đúng vào
  `room_service_logs` như trước, không nhúng vào message MQTT).
- Số phòng/tầng trong seed mới là quy ước tự đặt, không phải sơ đồ tầng thật của khách sạn —
  ảnh chỉ cho số lượng theo loại.

**Cập nhật 2026-06-21 (cùng ngày):** đã verify end-to-end thật bằng Mosquitto local qua Docker
(không chỉ test cú pháp) — publish lệnh tới đúng topic/đúng payload, giả lập RCU publish ngược
trạng thái vào topic STATUS, cache nhận đúng, đọc lại đúng qua API GET. Phát hiện và sửa 1 bug
thật trong lúc test (quên `app.include_router(devices.router)` trong `main.py` → mọi route
`/api/devices/*` trả 404). Đã tắt lại `MQTT_ENABLED=false` (mặc định) sau khi test xong.

**Chưa làm:** chưa test với RCU thật (chỉ test với Mosquitto local), chưa có cơ chế
retry/reconnect khi mất kết nối broker.

**Cập nhật 2026-06-23 — sửa bug MQTT làm sập cả backend:** user báo `docker compose up --build`
lỗi `TimeoutError` từ `paho/mqtt/client.py` → `Application startup failed. Exiting.` (container
api chết hẳn). Nguyên nhân: `client.connect()` là lệnh đồng bộ — khi broker (`192.168.1.102`
trong `.env` của user) không tới được, nó raise exception ngay trong `lifespan` lúc app khởi
động, kéo sập toàn bộ FastAPI/Uvicorn, không riêng phần MQTT.

Đã sửa `app/core/mqtt_client.py`:
- Đổi `client.connect()` → `client.connect_async()` (không block, không raise lúc startup —
  việc kết nối thật được paho-mqtt thực hiện trong loop thread phía sau, qua `loop_start()`).
- Bọc thêm `try/except (OSError, ValueError)` quanh việc khởi tạo, log warning thay vì để
  exception lan ra ngoài.
- Thêm `client.reconnect_delay_set(min_delay=1, max_delay=30)` + callback `on_disconnect` để
  log khi mất kết nối (trước đó im lặng, user không biết MQTT đang retry ngầm).

Đã verify thật: rebuild với chính `.env` đang lỗi của user (`MQTT_BROKER_HOST=192.168.1.102`,
không tới được lúc test) — backend khởi động thành công, `/health` trả 200, container sống ổn
định, không crash/restart. Paho-mqtt tự retry kết nối nền, không cần can thiệp khi broker online
lại.

## 14. Frontend: popup kết quả action + dịch tiếng Anh + style (2026-06-23)

Sau khi có popup Check-in (mục 13 phần đầu chỉ làm backend, popup là việc riêng ở Frontend), user
yêu cầu liên tiếp các cải tiến UI cho `FRONTEND/src/pages/Actions/`:

1. **Popup kết quả cho cả 4 action** (Check-in/Check-out/DND/Make-up-room), không chỉ
   `console.log` như bản gốc — dùng component `Dialog` mới tạo tại
   `FRONTEND/src/components/ui/dialog.tsx` (Base UI `@base-ui/react/dialog`, theo đúng convention
   của `select.tsx` có sẵn). Mỗi popup hiện: ghi chú nguồn dữ liệu + Endpoint thật của action đó,
   các field liên quan (tên khách/giới tính/tên phòng/số phòng/...), và dòng kết quả
   ("Check-in successful", "Do Not Disturb turned ON/OFF successfully"...).
2. **Mỗi card** cũng có dòng ghi chú endpoint dưới tiêu đề (vd "Data is fetched/written via the
   Opera Bridge backend — Endpoint: POST /api/stays/check-in") — user yêu cầu ghi rõ đây là
   endpoint thật của backend Opera Bridge, KHÔNG phải Oracle OPERA Cloud thật (project chưa nối
   Oracle, xem mục 11-12) — đã từ chối ghi nhãn "OPERA CLOUD" gây hiểu lầm, giải thích rõ với user
   trước khi sửa.
3. **Style**: dòng ghi chú endpoint/nguồn dữ liệu = đậm + in nghiêng + xanh dương nổi bật
   (`font-bold italic text-blue-600 dark:text-blue-400`); dòng kết quả thành công = đậm + xanh lá
   (`font-bold text-green-700 dark:text-green-400`).
4. **Dịch toàn bộ chữ tiếng Việt trong UI Actions sang tiếng Anh** (popup, label form, nút bấm,
   header trang `/actions` — "Xin chào"→"Welcome", "Đăng xuất"→"Logout", "Bật DND"→"Turn DND On"...).
   Chỉ giữ lại 1 dòng comment code (không hiển thị UI) bằng tiếng Việt.
5. **Room Name** trong Check-in đổi từ ô nhập text tự do thành **dropdown chọn loại phòng**, chọn
   xong tự điền đúng Room Number của phòng đầu tiên thuộc loại đó — sửa lỗi gốc: trước đó Room
   Name là field độc lập, gõ gì cũng bị backend bỏ qua (chỉ dùng để hiển thị/log), khiến user nhầm
   là chọn sai do hiểu lầm 2 field liên kết với nhau.

**Tất cả đã verify bằng Playwright thật trên Chromium** (không chỉ sửa code rồi suy đoán) — đăng
nhập Receptionist/Customer thật, bấm từng nút, đọc nội dung popup + screenshot xác nhận đúng từng
lần sửa. Phát hiện 1 lỗi thật lúc test Playwright: locator `text=Check in` khớp nhầm cả
`CardTitle` (không phải nút) — phải đổi sang `getByRole("button", { name: "Check in", exact: true })`.

## 15. Đổi lại số phòng Premium King thành 1001–1021 (2026-06-23)

User hỏi rõ nguồn gốc bảng số phòng ở mục 13 ("bạn lấy từ đâu, hay bịa ra?") — đã trả lời thẳng:
**tên loại + số lượng là thật** (từ ảnh `Tên phòng và số phòng.jpg`), nhưng **số phòng cụ thể là
Claude tự đặt** (ảnh không cho số phòng/tầng). Sau khi xác nhận, user yêu cầu: Premium King phải
là `1001`–`1021` (không phải `201` như cũ), các loại còn lại "chỉnh sao cho hợp lý".

Vì Premium King vốn nằm ngay sau Disabled trong thứ tự ảnh nhưng giờ phải dời tới tầng 10, Claude
đề xuất bảng sắp lại toàn bộ (không có sơ đồ thật, vẫn là tự đặt — đã nói rõ với user trước khi
làm, không âm thầm bịa tiếp): bỏ giới hạn 10 phòng/tầng cũ (mỗi tầng tối đa 99 phòng, 2 chữ số),
mỗi loại 1 tầng riêng (trừ Deluxe Twin 120 phòng phải tách 2 tầng vì >99). User xác nhận dùng bảng
này.

**Bảng tầng/room_number mới** (xem đầy đủ trong `opera-bridge/README.md` mục "Dữ liệu mẫu"):
Disabled tầng1 (101-107), Premium King 2 tầng2 (201-221), Premium Twin tầng3 (301-321), Deluxe
Twin tầng4-5 (401-521), Deluxe Twin 2 tầng6 (601-619), Deluxe Twin 3 tầng7 (701-763), Deluxe King
tầng8 (801-812), Deluxe King 2 tầng9 (901-919), **Premium King tầng10 (1001-1021)**, Junior Suite
Twin tầng11 (1101-1121), Junior Suite King tầng12 (1201-1220), Grand Suite tầng13 (1301-1321).
Tổng vẫn đúng 365 phòng/12 loại, không trùng room_number (verify bằng script Python độc lập trước
khi sửa migration, rồi verify lại bằng query Postgres thật sau khi `docker compose down -v` +
rebuild).

**Đã sửa:**
- `alembic/versions/001_initial_schema.py` — thay thuật toán sinh phòng cũ (10 phòng/tầng, tuần
  tự theo ảnh) bằng `ROOM_BLOCKS` khai báo rõ (code, tầng, số lượng) từng block, cho phép số
  lượng phòng/tầng khác nhau và Premium King neo cứng tầng 10.
- Frontend `CheckInCard.tsx`: cập nhật lại toàn bộ `ROOM_TYPE_OPTIONS` (room_number mới theo từng
  loại), đổi cách chọn default sang tìm theo tên "Premium King" (`.find()`) thay vì index cứng —
  tránh lặp lại lỗi lệch index nếu thứ tự danh sách đổi lần sau.
- `CheckOutCard.tsx`, `DndCard.tsx`, `MakeUpRoomCard.tsx`: đổi default Room Number từ `201` sang
  `1001`.
- Postman collection: đổi toàn bộ room `201` → `1001` (sed toàn file, đã kiểm tra JSON hợp lệ).
- `README.md`: cập nhật bảng tầng/room_number mới + thêm cột "tầng".

Đã verify đầy đủ: `tsc --noEmit` sạch, query Postgres trực tiếp khớp đúng bảng, và Playwright
thật trên Chromium — default Room Number=1001/Room Name=Premium King khớp nhau, Check-in/Check-out
trên phòng 1001 trả về đúng `room_name: "Premium King"` (screenshot xác nhận).
