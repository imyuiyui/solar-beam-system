# 🌌 Hệ Mặt Trời 3D Tương Tác (Interactive 3D Solar System)

Một ứng dụng mô phỏng Hệ Mặt Trời theo thời gian thực được xây dựng bằng **Three.js** và **WebGL**. Dự án cung cấp góc nhìn trực quan về không gian vũ trụ với đồ họa sắc nét, hiệu ứng đổ bóng vật lý (Physically Based Rendering) và khả năng tương tác tự do.
## ✨ Tính năng nổi bật (Features)

* **Đồ họa chân thực:** Sử dụng Texture chất lượng cao kết hợp với Bump Mapping để tạo độ lồi lõm cho bề mặt hành tinh (núi non, hố thiên thạch).
* **Chi tiết thiên thể đặc thù:** * Quầng sáng lóa (Glow) quanh Mặt Trời (Additive Blending).
    * Bầu khí quyển và lớp mây di chuyển độc lập trên Trái Đất và Sao Kim.
    * Hệ thống vành đai 3D sắc nét của Sao Thổ.
    * Mặt Trăng với quỹ đạo bám sát Trái Đất.
* **Hệ thống Ánh sáng & Bóng đổ 4K:** Đổ bóng thời gian thực với độ phân giải cao (4096x4096), tạo hiệu ứng vùng nửa tối (Penumbra) chân thực khi xảy ra hiện tượng che khuất.
* **Trình quản lý tải dữ liệu (Loading Manager):** Màn hình chờ chuyên nghiệp hiển thị % tiến độ tải ảnh, loại bỏ hoàn toàn hiện tượng giật lag do mạng chậm (Texture Upload Jank).
* **Điều khiển Camera thông minh:**
    * Chuột trái để kéo/xoay góc nhìn.
    * Chuột phải để dịch chuyển tịnh tiến (Pan).
    * Cuộn chuột để Zoom.
    * **WASD / Phím mũi tên:** Bay lượn tự do trong không gian vũ trụ (First-person space flight).
* **Tương tác nhúng (Raycaster):**
    * *Hover (Di chuột):* Hiển thị Tooltip tên hành tinh.
    * *Click (Nhấp chuột):* Camera tự động khóa mục tiêu và bám đuổi theo hành tinh đang bay.
    * *Double-click (Nhấp đúp):* Camera hạ cánh sát bề mặt hành tinh (Surface view).
* **Bảng Điều Khiển (Control Panel):** Tua nhanh/chậm thời gian, thay đổi độ sáng Mặt Trời, Bật/Tắt đường quỹ đạo và cấu hình Đổ bóng/Shader.

## 🛠️ Công nghệ sử dụng (Tech Stack)

* **HTML5 / CSS3**: Xây dựng cấu trúc UI và bảng điều khiển.
* **JavaScript (ES6)**: Xử lý logic vận hành.
* **Three.js**: Thư viện lõi xử lý WebGL đồ họa 3D.

## 🚀 Hướng dẫn cài đặt (Installation)
Trước hết, hãy tải các file code và file texture theo link này: https://drive.google.com/drive/folders/1jUJ9GQRzTGnJiukw5PEs2ViQ6II99JQX?usp=sharing

Cầu trúc file chạy nên như thế này: 

├── index.html       
├── main.js         
├── textures/       
   │   ├── sun.jpg
   │   ├── earth.jpg
   │   ├── earth_clouds.jpg
   │   ├── moon.jpg
   │   └── ... (ảnh các hành tinh khác)
      └── README.md

Mở lên bằng VS Code rồi làm theo các bước dưới:
1. Cài đặt tiện ích mở rộng [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) trong VS Code.
2. Mở thư mục dự án bằng VS Code.
3. Click chuột phải vào file `index.html` và chọn **"Open with Live Server"**.
