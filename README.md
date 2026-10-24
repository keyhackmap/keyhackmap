# HPU2 Study Monitor — bảng theo dõi slide chạy trên máy chủ

Một ứng dụng Node.js + Playwright chạy Chromium **trên máy chủ**. Bạn dùng iPhone để điều khiển từ xa, theo dõi slide hiện tại trên tổng số slide và có thể đóng Safari mà phiên trình duyệt trên máy chủ vẫn còn chạy.

> **QUAN TRỌNG:** Đây không phải phần mềm của Trường ĐHSP Hà Nội 2. Chỉ dùng với tài khoản của chính bạn, tuân thủ quy định lớp học. Không đảm bảo trường ghi nhận số phút học, tiến độ hay hoàn thành. Ứng dụng chỉ hỗ trợ điều hướng; bạn vẫn chịu trách nhiệm học và kiểm tra nội dung.

## Mới trong bản V2: Trả lời câu hỏi ngay trên iPhone

Khi ứng dụng phát hiện câu hỏi dạng **A/B/C/D**, **ô nhập chữ**, **radio/checkbox**, hoặc bấm Tiếp nhưng slide không chuyển, nó dừng tại đúng phiên trình duyệt đang chạy trên server và hiển thị một ô vàng **Cần bạn thao tác trên bài học**.

1. Mở trang quản lý trên iPhone. Nếu có câu hỏi chặn, ô vàng sẽ hiện ngay dưới tiến độ slide. Đây là cảnh báo **khi bạn mở trang**, chưa phải push notification khi iPhone đã khóa.
2. Bấm **Mở màn hình để trả lời**. Tại ảnh xem trước HPU2, chạm vào đáp án, ô nhập, nút kiểm tra, hoặc nút Thử lại. Nếu ứng dụng đọc được chính xác 4 phương án, có thể chọn nhanh A/B/C/D ngay tại ô vàng; nút bấm chỉ chọn đáp án bạn quyết định, không tự gửi bài thi.
3. Nếu là câu tự luận/điền chữ, chạm đúng ô trên ảnh rồi dùng **Gõ chữ**, **Thay nội dung ô**, **Enter/Tab** bên dưới.
4. Khi thấy slide chuyển tiếp hoặc câu hỏi biến mất sau thao tác, máy chủ sẽ thử xác nhận và tự chạy tiếp. Nếu giao diện không đọc được, bấm **Kiểm tra & tiếp tục**. Khi không xác thực được dù bạn đã tự hoàn thành, bấm **Tôi xác nhận đã xong**, xác nhận lại trên hộp thoại.
5. Nếu câu hỏi vẫn chặn hoặc bài có phản hồi sai, hệ thống **không tự kết luận đã hoàn thành**. Bạn có thể xem ảnh, bấm Thử lại và tiếp tục thao tác.

**Giới hạn:** Dạng câu hỏi hiển thị trong Canvas, iframe đặc biệt hoặc yêu cầu tương tác phức tạp có thể không được nhận diện ngay. Nếu slide không chuyển, chương trình dừng và đợi bạn kiểm tra. Không có thông báo đẩy khi trình duyệt điện thoại đã đóng. Việc hoàn thành bài 1 **không tự mở bài 2** vì chưa xác định được cách nền tảng liên kết các bài; phải mở bài 2 và đặt tổng số slide tương ứng.

### Cập nhật repo GitHub đã có

Nếu bạn đã đưa bản V1 lên GitHub: thay các file `server.js`, `public/index.html`, `README.md` của bản cũ bằng bản trong ZIP V2 (không sửa `APP_PASSWORD`). Sau khi commit, redeploy dịch vụ Docker từ repo. **Không chỉ up ZIP lên GitHub Pages rồi mong chạy nền:** ZIP phải được giải nén, và mã cần được triển khai trên dịch vụ chạy Node/Chromium luôn bật.

## Vì sao KHÔNG chỉ tải `index.html` lên GitHub Pages?

GitHub Pages chỉ chạy HTML/CSS/JavaScript trong trình duyệt điện thoại. Khi iPhone khóa hoặc thoát Safari, JavaScript sẽ bị hạn chế/chấm dứt và trình duyệt không còn chạy. Phải có **máy chủ luôn bật** chạy Node.js + trình duyệt headless Chromium.

GitHub dùng để **lưu mã nguồn**. Để chạy thật, triển khai repo đó lên nhà cung cấp hỗ trợ **Docker và dịch vụ luôn bật** (ví dụ Railway/VPS; lựa chọn gói theo điều kiện dịch vụ tại thời điểm triển khai).

## Cách đưa mã lên GitHub và chạy

1. Giải nén `HPU2_Study_Monitor_GitHub.zip` trên máy hoặc dùng GitHub web để tải toàn bộ các file và thư mục của dự án vào **một repository private**. Giữ nguyên `Dockerfile`, `server.js`, `package.json` và `public/index.html`.
2. Từ Railway (hoặc một dịch vụ Docker tương đương), tạo project mới từ GitHub repository đó. Dịch vụ nhận `Dockerfile`, tự cài Node và Chromium.
3. Trong biến môi trường dịch vụ đặt `APP_PASSWORD` thành mật khẩu quản lý **riêng** mạnh (tối thiểu 12 ký tự, không phải mật khẩu HPU2). `NODE_ENV=production`. Không lưu bất kỳ mật khẩu nào trong GitHub.
4. Bật địa chỉ HTTPS public domain của dịch vụ (Generate Domain trong nhà cung cấp, nếu có). Mở **địa chỉ của dịch vụ máy chủ** trên điện thoại. Không dùng URL `github.io` để chạy automation.
5. Đảm bảo dịch vụ **không sleep khi không có lượt truy cập**, đủ RAM chạy Chromium, và không tự restart quá thường xuyên. Nếu nhà cung cấp ngưng ứng dụng, phiên học cũng ngưng.

### Trên điện thoại

1. Đăng nhập **bảng điều khiển** bằng `APP_PASSWORD` đã đặt trên máy chủ.
2. Nhập tài khoản HPU2 của chính bạn để đăng nhập, hoặc bấm trên ảnh để tự đăng nhập. **Chỉ dùng trên HTTPS.**
3. Điều hướng tới bài học có 51 slide qua ảnh xem trước. Có thể dán URL bài học của chính bạn (chỉ `https://*.hpu2.edu.vn`).
4. Nhấn `Chọn nút sang slide`, rồi **chạm đúng nút chuyển tiếp trên ảnh** để ứng dụng ghi vị trí và phần tử. Lệnh này không chuyển slide ngay.
5. Đặt tổng slide **51**, thời gian đứng ở một slide (ví dụ 55 giây), tùy chọn thử lại câu hỏi **luyện tập** A/B/C/D, lưu cấu hình rồi bấm **Bắt đầu**.
6. Bạn có thể khóa điện thoại. Khi mở lại, app hiện trạng thái từ máy chủ. Nếu app gặp bài có điểm, câu hỏi không đọc được hoặc không nhận biết phản hồi, app dừng để bạn thao tác.

## Những gì ứng dụng làm được

- Chạy trình duyệt từ xa ở viewport 430 × 900 trên server.
- Đăng nhập HPU2 từ giao diện riêng; mật khẩu trường được gửi qua HTTPS và **không ghi vào file**, database hay log ứng dụng.
- Xem ảnh trình duyệt, chạm để click, cuộn, nhập phím, Enter/Tab/Esc.
- Tự click phần tử/nút được bạn chỉ sau khoảng chờ cho mỗi slide.
- Đọc số dạng **`2/51`** ở nội dung các iframe khi có thể. Nếu không đọc được, có thể hiện **tiến độ ước tính** từ số lần bấm; cần xem ảnh để kiểm tra.
- Nhận diện các lựa chọn luyện tập **A/B/C/D** dựa trên nhãn HTML. Chế độ thử đáp án có giới hạn tối đa 4, chỉ tiếp tục khi có dấu hiệu phản hồi **đúng/sai** rõ ràng, dùng `Thử lại` khi sai. Dừng khi không nhận diện được hoặc đối với bài kiểm tra có điểm.

## Giới hạn thực tế

- Mã nguồn **chưa được test với tài khoản HPU2 cá nhân hoặc player SHCDSV** vì cần đăng nhập thật. Nhiều player SCORM/H5P dùng iframe, canvas hoặc HTML tùy biến nên không thể cam kết tự bấm đúng mọi slide/quiz. Bạn cần thử, quan sát nhật ký, và điều chỉnh nếu cần.
- Có bài yêu cầu xem video, chờ bộ đếm thời gian hoặc thao tác thực; bấm Next không đồng nghĩa hoàn tất bài.
- Đúng/sai và số lần thử có thể bị trường giới hạn. Ứng dụng không tự vượt CAPTCHA, xác thực 2 yếu tố, không tự nộp bài thi và không lấy đáp án được giấu.
- Server restart hoặc sleep sẽ làm mất trình duyệt đang chạy, bạn phải đăng nhập lại. Số tiến độ trên HPU2 nếu đã lưu có thể còn.
- Screenshot có thể chứa dữ liệu cá nhân; giữ repository private, link máy chủ và mật khẩu riêng.
- Không đăng nhập ứng dụng ở máy chủ của người lạ. HTTPS là bắt buộc khi nhập tài khoản trường.

## Chạy thử trên máy tính riêng

Có Node.js 20+ và Chromium/Playwright:

```sh
npm install
export APP_PASSWORD='mat-khau-quan-ly-rieng-cua-ban'
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/usr/bin/chromium' # nếu Chromium cài sẵn
export NODE_ENV='development'
npm start
```

Mở `http://localhost:3000`. Trên máy tính để máy ngủ hoặc tắt thì automation cũng dừng.

## Bảo mật kỹ thuật

- Chỉ một phiên người dùng; truy cập bằng cookie HttpOnly SameSite=Strict.
- Không đặt thông tin đăng nhập trường trong repo/URL/biến môi trường.
- Chặn mở trang điều hướng ngoài HTTPS ở `hpu2.edu.vn` và subdomain của trường.
- Không có endpoint chia sẻ screenshot công khai, yêu cầu mật khẩu quản lý.
- Không có lưu log thao tác nhập mật khẩu trường.
- Đây là công cụ cá nhân / bản thử nghiệm, không phải sản phẩm đã kiểm toán bảo mật để cho nhiều người dùng chung.
