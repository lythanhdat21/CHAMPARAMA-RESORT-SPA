# Hotel Demo Frontend

> Frontend test harness cho backend `opera-bridge` (xem `BACKEND/SKILLS/DATABASE_&_API.md`,
> `BACKEND/SKILLS/WORK_LOG.md`). Mục tiêu: Register → Login → 1 màn hình có 4 nút action
> (Check in / Check out / Do Not Disturb / Make Up Room), mỗi lần bấm in kết quả ra
> DevTools Console. Không phải dashboard quản lý khách sạn đầy đủ — đây là demo xác minh
> luồng nghiệp vụ + phân quyền, tương đương bản Postman collection nhưng chạy trên UI.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router (điều hướng Register/Login/Actions)
- Axios
- TailwindCSS
- shadcn/ui
- React Hook Form
- Zod

(Bỏ React Query so với bản trước — không cần cache/list dữ liệu, mỗi action chỉ là 1 lần gọi mutation rời rạc.)

---

## Folder Structure

```text
src/
    api/
        client.ts          # axios instance + interceptor gắn Authorization
        authApi.ts          # register, login
        actionsApi.ts       # checkIn, checkOut, setDnd, requestMakeUpRoom, completeMakeUpRoom

    components/
        Button/
        FormField/

    pages/
        Register/
        Login/
        Actions/             # màn hình 4 nút sau khi login

    context/
        AuthContext.tsx      # lưu access_token, role, username sau khi login; logout

    types/
        auth.ts
        actions.ts
        api.ts

    utils/
        constants.ts

    App.tsx
    main.tsx
```

---

## Environment

```
VITE_API_URL=http://localhost:8000
```

> Backend chạy ở port **8000** (không phải 3000). `/health` không có prefix `/api`;
> tất cả endpoint nghiệp vụ đều nằm dưới `/api` (`/api/auth/...`, `/api/stays/...`, `/api/rooms/...`).

---

## API Layer

Tạo 1 axios instance duy nhất:

```ts
// api/client.ts
export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

- `register`, `login` KHÔNG cần token.
- `check-in`, `check-out`, `do-not-disturb`, `make-up-room`, `service` (hoàn thành dọn phòng)
  ĐỀU cần token — thiếu token thì backend trả `401`, sai role thì trả `403`.
- Không gọi axios trực tiếp trong component — luôn qua `api/`.

---

## Type Definitions

```ts
// types/auth.ts
export type Role = "RECEPTIONIST" | "CUSTOMER";
export type Gender = "Male" | "Female";

export interface RegisterRequest {
    username: string;
    gender: Gender;
    phone_number: string;
    email: string;
    password: string;
    role: Role;
    avatar: File;
}

export interface AuthUser {
    id: number;
    username: string;
    role: Role;
    avatar: string | null;
    created_at: string;
}

export interface LoginRequest {
    phone_number: string;
    password: string;
}

export interface LoginResponseData extends AuthUser {
    access_token: string;
}
```

```ts
// types/actions.ts
export interface CheckInRequest {
    reservation_id: number;
    room_id: number;
    username: string;
    number_of_guests: number;
    expected_arrival_date: string;   // "YYYY-MM-DD"
    expected_departure_date: string; // "YYYY-MM-DD"
}

export interface CheckOutRequest {
    stay_id: number;
}

export interface DndRequest {
    status: boolean; // true = bật DND, false = tắt
}
```

```ts
// types/api.ts
export interface ApiResponse<T> {
    message: string;
    status: "success" | "error";
    data: T;
}
```

> Lưu ý field tên: backend dùng `room_id` (số), không phải `room_number`/`id`. Trạng thái
> phòng thật của backend là `Vacant | Occupied | Cleaning`, và DND/Make-up-room là **2 cột
> boolean riêng** (`do_not_disturb`, `make_up_room`), KHÔNG phải 1 enum `service_status`
> gộp chung — bản trước của file này dùng sai field, đã sửa lại ở đây.

---

## Pages

### Register (`/register`)

Form theo `RegisterRequest`, gồm cả input file cho `avatar`. Submit →
`POST /api/auth/register`. Thành công → chuyển sang `/login`. Lỗi `409` (số điện
thoại/email đã tồn tại) → hiện message lỗi ngay trên form.

### Login (`/login`)

Form: `phone_number`, `password`. Submit → `POST /api/auth/login`. Thành công:

- Lưu `access_token`, `role`, `username` (từ `AuthContext`, đồng thời ghi `access_token`
  vào `localStorage` để interceptor dùng).
- Chuyển sang `/actions`.

### Actions (`/actions`) — màn hình chính sau khi login

Yêu cầu đã login (chưa có `access_token` → redirect về `/login`).

Hiển thị khung hình có **4 nút**: **Check in**, **Check out**, **Do Not Disturb**,
**Make Up Room**. Ẩn/hiện nút theo `role` lấy từ `AuthContext`, đúng phân quyền backend:

| Nút | Hiện với role | API | Method |
|---|---|---|---|
| Check in | RECEPTIONIST | `/api/stays/check-in` | POST |
| Check out | RECEPTIONIST | `/api/stays/check-out` | POST |
| Do Not Disturb | RECEPTIONIST, CUSTOMER | `/api/rooms/{room_id}/do-not-disturb` | PATCH |
| Make Up Room | CUSTOMER | `/api/rooms/{room_id}/make-up-room` | POST |

Mỗi nút có sẵn 1 form nhỏ ngay cạnh (vì backend yêu cầu input riêng cho từng action —
không thể bấm nút trơn không có dữ liệu):
- Check in: `reservation_id, room_id, username, number_of_guests, expected_arrival_date, expected_departure_date`
- Check out: `stay_id`
- Do Not Disturb: `room_id`, toggle bật/tắt (`status`)
- Make Up Room: `room_id`

**Khi bấm nút:** gọi API tương ứng, sau đó **`console.log()` toàn bộ response** (hoặc
`console.error()` nếu lỗi) ra DevTools Console — không cần hiển thị kết quả lên UI, theo
đúng yêu cầu demo. Ví dụ:

```ts
async function handleCheckIn(payload: CheckInRequest) {
    try {
        const res = await checkIn(payload);
        console.log("[Check-in] success:", res.data);
    } catch (err) {
        console.error("[Check-in] error:", err.response?.data ?? err);
    }
}
```

(`Housekeeping hoàn thành dọn phòng` — `PATCH /api/rooms/{room_id}/service` — chưa có nút
riêng trong bản demo này; có thể thêm sau nếu cần test luồng RECEPTIONIST hoàn thành
make-up-room, xem mục Future Features.)

---

## Routing

```
/register  → Register
/login     → Login
/actions   → Actions (cần đã login)
```

---

## API Errors

Hiển thị/log theo mã lỗi backend trả về (đều có dạng `{ message, status: "error" }`):

| Code | Ý nghĩa |
|---|---|
| 400 | Dữ liệu request không hợp lệ |
| 401 | Thiếu token hoặc token hết hạn — yêu cầu login lại |
| 403 | Role hiện tại không có quyền gọi action này |
| 404 | Không tìm thấy phòng / stay |
| 409 | Conflict — vd. số điện thoại/email đã tồn tại, hoặc stay đã check-out trước đó |
| 500 | Lỗi server |

---

## Coding Convention

- Strict TypeScript
- Không dùng `any`
- Component dạng Function
- Mỗi component một file
- Dùng hooks cho business logic
- Không gọi API trực tiếp trong component
- Dùng `interface` cho object
- Dùng `type` cho union

---

## Future Features

- `GET /api/rooms` + trang Home hiển thị danh sách phòng (backend hiện chưa có endpoint
  đọc dữ liệu nào — chỉ có action/mutation).
- Trang Housekeeping (danh sách phòng đang `make_up_room = true`) — cần thêm endpoint
  đọc tương ứng ở backend trước.
- Nút "Hoàn thành dọn phòng" gọi `PATCH /api/rooms/{room_id}/service`.
- Dashboard tổng hợp, WebSocket realtime, MQTT integration, Push Notification, Dark Mode,
  Responsive Mobile, i18n (English/Vietnamese), Unit Test (Vitest), E2E Test (Playwright).
