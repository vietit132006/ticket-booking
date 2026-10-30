# Ticket Booking

Bài test đặt vé du lịch với Backend Node.js/Express và Frontend React.
Người dùng chọn vé, nhập số lượng, xem giá dự kiến và đặt vé. Backend kiểm tra
dữ liệu, tính tiền, tạo booking và cập nhật tồn kho; giao diện tải lại tồn kho
sau khi đặt thành công hoặc gặp lỗi tồn kho.

Dự án chạy **một Backend instance, dữ liệu in-memory**, không cần database
hay file `.env`. Khởi động lại Backend sẽ đặt lại toàn bộ tồn kho và booking.

## Công nghệ

- Backend: Node.js, Express 5, JavaScript CommonJS.
- Frontend: React 19, Vite 7, JavaScript, CSS, Fetch API.
- Kiểm thử: `node:test`, `node:assert/strict`, HTTP request thật bằng `fetch`.
- Quản lý dependency: npm, có lockfile riêng cho Backend và Frontend.

## Cài đặt và chạy

Yêu cầu **Node.js 22.12+** và npm để chạy cả hai phần.
Sau khi clone repository, mở terminal tại thư mục `ticket-booking`:

```sh
npm ci
npm --prefix client ci
```

### Cấu hình môi trường

File mẫu chung cho dự án: [`.env.example`](./.env.example).
Mã ứng dụng hiện không đọc biến môi trường (`process.env` hoặc `import.meta.env`)
và không có giá trị bắt buộc phải cấu hình. File mẫu chỉ chứa chú thích về các
địa chỉ chạy local an toàn. Có thể tạo bản cấu hình cá nhân từ thư mục gốc:

```sh
cp .env.example .env
```

Bước này **tùy chọn**, ứng dụng vẫn chạy khi không có `.env`. Backend hiện
không tự nạp `.env`; Frontend không đọc biến `VITE_*`, nên chưa cần file mẫu
riêng trong `client/`. Sửa `.env` chưa làm thay đổi cổng hoặc địa chỉ API.
Cấu hình hiện nằm tại `src/server.js` (Backend cổng 3000) và
`client/vite.config.js` (Frontend cổng 5173, proxy `/api` đến Backend cổng 3000).

Git bỏ qua `.env` và `.env.*` ở mọi thư mục, ngoại trừ `.env.example` để có thể
commit file mẫu. Chỉ đưa hướng dẫn và giá trị an toàn vào file mẫu.

### Khởi động ứng dụng

Terminal 1 — Backend:

```sh
npm start
```

API chạy tại `http://localhost:3000`.

Terminal 2 — Frontend, cũng từ thư mục gốc:

```sh
npm --prefix client run dev
```

Mở `http://localhost:5173`. Vite chuyển tiếp request `/api` đến Backend cổng
3000, nên development không cần cấu hình CORS riêng. Dừng bằng `Ctrl+C`.

Build Frontend:

```sh
npm --prefix client run build
```

Kết quả nằm trong `client/dist/`. Khi triển khai bản build, cần cấu hình web
server chuyển tiếp `/api` đến Backend; hướng dẫn demo trên dùng Vite dev server.

## Nghiệp vụ

| ID | Tên vé | Giá (VND) | Tồn kho ban đầu |
| --- | --- | ---: | ---: |
| 1 | Vé VinWonders | 750000 | 5 |
| 2 | Vé Safari | 650000 | 3 |

- `ticketId` và `quantity` phải là số nguyên dương an toàn của JavaScript,
  không nhận chuỗi như `"1"`.
- Tổng tiền từ 1.000.000 VND được giảm 10%, tối đa 200.000 VND;
  tiền giảm làm tròn đến VND.
- Giá và số tiền thanh toán chính thức do Backend tính; giao diện chỉ xem trước.
- Chỉ đơn thành công mới trừ tồn, lưu booking và tăng mã `BK001`, `BK002`, …
  Request bị từ chối không thay đổi dữ liệu.

## API và kiểm thử thủ công

| Method | Đường dẫn | Chức năng |
| --- | --- | --- |
| GET | `/api/tickets` | Danh sách vé, giá và tồn kho hiện tại |
| POST | `/api/bookings` | Đặt vé với body JSON gồm `ticketId`, `quantity` |

Sau khi khởi động lại Backend để có dữ liệu ban đầu:

```sh
curl -i http://localhost:3000/api/tickets

curl -i -X POST http://localhost:3000/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"ticketId":1,"quantity":2}'
```

Đơn đầu tiên trả HTTP **201**, tồn kho vé ID 1 còn 3:

```json
{
  "bookingId": "BK001",
  "ticketId": 1,
  "quantity": 2,
  "totalAmount": 1500000,
  "discountAmount": 150000,
  "finalAmount": 1350000,
  "status": "CONFIRMED"
}
```

Các trường hợp lỗi:

| HTTP | Trường hợp | Body thử với POST `/api/bookings` |
| --- | --- | --- |
| 400 | Số lượng không hợp lệ | `{"ticketId":1,"quantity":0}` |
| 400 | Thiếu/sai dữ liệu hoặc JSON không hợp lệ | `{}` |
| 404 | ID hợp lệ nhưng vé không tồn tại | `{"ticketId":999,"quantity":1}` |
| 409 | Không đủ tồn kho | `{"ticketId":1,"quantity":6}` |

Lỗi trả JSON dạng `{"message":"Không đủ tồn kho."}`.
Dùng `GET /api/tickets` kiểm tra tồn kho trước/sau mỗi lần thử.
Với Postman: chọn method, nhập URL, chọn **Body → raw → JSON** cho POST
và dùng các body ở trên.

Trên giao diện, chọn VinWonders và đặt 2 vé để kiểm tra tổng thanh toán
1.350.000 VND, mã booking và tồn kho cập nhật. Thử số lượng 0, 1.5 hoặc vượt
tồn để kiểm tra thông báo lỗi; vé hết hàng có nhãn **Đã hết vé**.

## Automated tests và kết quả thực tế

Chạy từ thư mục gốc:

```sh
npm test
npm --prefix client run build
```

Kết quả chạy lại ngày **30/10/2026**, Node.js **v22.23.4**, npm **10.9.9**:

| Kiểm tra | Kết quả |
| --- | --- |
| Backend — `npm test` | **17/17 test đạt**, 0 lỗi, 0 bỏ qua |
| Frontend — `npm --prefix client run build` | **Thành công**, Vite 7.3.7, 30 modules |

Backend gồm 11 test API và 6 test tính giá: đặt thành công, giá do server tính,
validation, JSON lỗi, vé không tồn tại, vượt/hết tồn, giữ nguyên dữ liệu khi
thất bại, ngưỡng/trần giảm giá và hai request đồng thời tranh vé cuối.
Test API mở cổng localhost ngẫu nhiên, dùng store riêng và tự đóng server;
môi trường chạy test cần cho phép mở cổng localhost.

Test tranh vé cuối chỉ kiểm tra **cùng một tiến trình**: một response 201,
một response 409, một booking và tồn kho bằng 0. Frontend được kiểm tra build;
dự án chưa có automated test giao diện.

## Phần C — thiết kế khi có nhiều Backend instance

Xem [PHAN_C.md](./PHAN_C.md): race condition, hạn chế của in-memory và phương án
MySQL chung, transaction, `UPDATE` có điều kiện, kiểm tra `affectedRows`,
`COMMIT`/`ROLLBACK`, cùng ví dụ hai khách tranh vé cuối.

**Phần C chỉ là phương án thiết kế. Dự án chưa triển khai MySQL, database
hoặc nhiều Backend instance.** Logic kiểm tra và cập nhật in-memory hiện chạy
đồng bộ, không có `await` ở giữa; bảo đảm của bản demo không áp dụng cho nhiều
instance có bộ nhớ riêng.

## Cấu trúc chính

```text
src/
  server.js          # Express, API và xử lý lỗi
  data.js            # Vé, booking và bộ đếm mã in-memory
  booking.service.js # Validation, kiểm tra tồn và đặt vé
  pricing.js         # Công thức tính tiền
test/
  booking.test.js    # 11 test API
  pricing.test.js    # 6 test tính giá
client/
  src/               # Giao diện React, gọi API và CSS
  public/            # Favicon
  vite.config.js     # Proxy development
PHAN_C.md            # Trả lời câu hỏi thiết kế
```

`.gitignore` loại trừ dependency, bản build, `.env`, log và các file khóa/token
cục bộ. Không đưa mật khẩu hay thông tin xác thực vào repository.
