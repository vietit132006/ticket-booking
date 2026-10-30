# Phần C — Không bán vượt tồn kho khi có nhiều Backend instance

**Câu hỏi:** Hệ thống còn đúng 1 vé, hai khách đặt đồng thời và có nhiều
Backend instance. Thiết kế thế nào để không bán vượt tồn kho?

Đây là **phương án thiết kế**, chưa triển khai trong dự án. Backend Express và
Frontend React hiện vẫn dùng dữ liệu in-memory, chạy một Backend instance.

## 1. Race condition xảy ra thế nào?

Nếu tách bước đọc tồn và cập nhật tồn, hai request có thể xen kẽ:

1. Khách A đọc `stock = 1`, thấy đủ vé.
2. Khách B cũng đọc `stock = 1` trước khi A cập nhật.
3. Cả hai cùng tạo booking cho 1 vé: hệ thống đã bán 2 vé dù chỉ có 1.

Nếu cả hai cùng ghi `stock = 0`, số tồn nhìn vẫn đúng nhưng đã có hai đơn;
nếu cùng trừ tồn mà không kiểm tra điều kiện, tồn có thể âm.

## 2. Vì sao in-memory không an toàn với nhiều instance?

Mỗi instance có bộ nhớ riêng. A vào instance 1, B vào instance 2 thì cả hai
đều có thể thấy bản sao `stock = 1` và bán thành công. Khóa trong JavaScript
chỉ bảo vệ được tiến trình đó, không đồng bộ được instance khác. Bộ đếm mã
booking cũng có thể trùng; dữ liệu mất khi tiến trình khởi động lại.

Trong bản demo hiện tại, kiểm tra và cập nhật chạy đồng bộ trong cùng một
tiến trình, không có `await` ở giữa. Test hiện có không chứng minh an toàn
cho nhiều instance.

## 3. Thiết kế với MySQL chung và transaction

Tất cả instance dùng **cùng một MySQL**, với bảng `tickets` và `bookings` dùng
**InnoDB**. `tickets.id` là khóa chính; ID booking do database cấp và có ràng
buộc duy nhất. Mỗi lần đặt vé dùng **cùng một connection, cùng một transaction**
cho cả trừ tồn và tạo booking.

Luồng xử lý:

1. Validate `ticketId`, `quantity` là số nguyên dương; bắt đầu transaction.
2. Đọc vé và giá bằng `SELECT ... FOR UPDATE` để khóa hàng vé đến khi kết thúc
   transaction. Không tìm thấy vé thì `ROLLBACK`, trả 404.
3. Trừ tồn bằng câu lệnh có điều kiện, truyền tham số
   `[quantity, ticketId, quantity]`:

   ```sql
   UPDATE tickets
   SET stock = stock - ?
   WHERE id = ? AND stock >= ?;
   ```

   Điều kiện tương đương `stock >= quantity`; không ghi tồn mới từ một giá trị
   đã đọc trước đó ở bộ nhớ ứng dụng.
4. Kiểm tra **`affectedRows`**: phải bằng **1** mới được tạo booking. Bằng **0**
   nghĩa là không trừ được tồn; `ROLLBACK`, trả 409 và không tạo đơn.
5. Tính tiền từ giá trong database, `INSERT` booking trên cùng connection.
   Chỉ `COMMIT` khi trừ tồn và lưu booking đều thành công; chỉ trả 201 sau commit.
6. Nếu insert hoặc thao tác khác lỗi, `ROLLBACK` toàn bộ transaction để hoàn
   lại tồn kho. Luôn trả connection về pool trong `finally`.

`SELECT ... FOR UPDATE` có thể dùng như sau, trước câu `UPDATE`:

```sql
START TRANSACTION;
SELECT id, price FROM tickets WHERE id = ? FOR UPDATE;
-- UPDATE có điều kiện; backend kiểm tra affectedRows.
-- Chỉ INSERT booking và COMMIT nếu trừ tồn thành công.
-- Nhánh thất bại/lỗi: ROLLBACK.
```

Transaction bảo đảm trừ tồn và lưu đơn cùng thành công hoặc cùng bị hủy.
Khóa hàng của InnoDB cùng điều kiện `UPDATE` bảo vệ tồn kho tại database dùng
chung, kể cả khi request đến từ các instance khác nhau.

## 4. Ví dụ hai khách tranh vé cuối

Giả sử A và B đều mua 1 vé, `stock = 1`:

| Bước | Khách A — instance 1 | Khách B — instance 2 |
| --- | --- | --- |
| 1 | Bắt đầu transaction, khóa hàng vé | Bắt đầu transaction, chờ khóa cùng hàng |
| 2 | UPDATE: tồn 1 → 0, `affectedRows = 1` | Tiếp tục chờ |
| 3 | Tạo booking và COMMIT, nhả khóa | Lấy được khóa, thấy tồn đã là 0 |
| 4 | Nhận 201 | UPDATE không thỏa điều kiện, `affectedRows = 0`; ROLLBACK, trả 409 |

Kết quả: **chỉ một booking thành công, tồn kho bằng 0**. Nếu A lỗi và rollback,
tồn trở lại 1, B có thể mua được vé. Nếu gặp deadlock, backend rollback và có
thể thử lại toàn bộ transaction với số lần giới hạn.

Tham khảo MySQL: [khóa hàng với FOR UPDATE](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html),
[UPDATE](https://dev.mysql.com/doc/refman/8.4/en/update.html),
[transaction, COMMIT và ROLLBACK](https://dev.mysql.com/doc/refman/8.4/en/commit.html).
