# Bloomie - Website bán hoa tươi

Website thương mại điện tử bán hoa viết bằng HTML, CSS và JavaScript thuần, không cần cài thư viện.

## Cách chạy
- Cách nhanh nhất: mở file `index.html` bằng trình duyệt (cần Internet để tải phông chữ Google Fonts).
- Hoặc chạy máy chủ tĩnh trong thư mục này: `python -m http.server 8000`, rồi mở http://localhost:8000.

## Cấu trúc
```
index.html      Khung trang: header, menu, chân trang, giỏ hàng nhanh
css/style.css   Toàn bộ giao diện (có chế độ sáng/tối, responsive)
js/art.js       Vẽ hình bó hoa bằng SVG (không dùng ảnh)
js/data.js      Dữ liệu sản phẩm, mô tả, kích cỡ, mã giảm giá, khung giờ giao
js/app.js       Router, giỏ hàng, thanh toán, đơn hàng, tài khoản
```

## Chức năng
- Trang chủ: banner trượt, danh mục, sản phẩm nổi bật, ưu đãi.
- Danh sách sản phẩm: lọc theo danh mục và mức giá, tìm kiếm không dấu, sắp xếp.
- Chi tiết sản phẩm: chọn kích cỡ (đổi giá), số lượng, thêm giỏ, mua ngay, sản phẩm liên quan.
- Giỏ hàng nhanh, trang thanh toán (kiểm tra dữ liệu, ngày và khung giờ giao, giao nhanh, lời nhắn, mã giảm giá BLOOM10 và FREESHIP, miễn phí giao từ 500.000đ).
- Đơn hàng: trang xác nhận, tiến độ (mô phỏng), hủy đơn, tra cứu theo mã.
- Tài khoản: đăng ký, đăng nhập, sửa thông tin, lịch sử đơn.
- Yêu thích, liên hệ, trang dịch vụ.

## Lưu ý
Dữ liệu (giỏ hàng, tài khoản, đơn hàng) lưu trong localStorage của trình duyệt, nên chỉ dùng để học và demo.
Mật khẩu được băm SHA-256 nhưng vẫn nằm ở phía trình duyệt, không an toàn như tài khoản thật.
Muốn chạy thật cần thêm máy chủ và cơ sở dữ liệu (ví dụ Spring Boot + MySQL) rồi thay các hàm đọc/ghi localStorage
trong `js/app.js` (`orders()`, `users()`, `placeOrder()`, `doAuth()`) bằng các lệnh gọi API.
