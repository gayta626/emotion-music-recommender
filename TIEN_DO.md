# Tiến độ EmoTune

> Claude cập nhật file này **mỗi khi xong một phần** (đánh dấu + ghi ngày). Chi tiết từng task: plan `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`; nhật ký: `NOTES.md`.
>
> ✅ xong · 🔄 đang làm · ⬜ chưa làm · ⏸ tuỳ chọn / làm nếu kịp · **Bạn** = bạn tự code (Claude hướng dẫn) · **Claude** = Claude làm

## 📍 Đang ở đâu

**Giai đoạn A — Task 5:** thêm `user_id` vào gợi ý, chấm điểm, lịch sử (Bạn). Xong task này web quét/chấm điểm chạy lại được.
Trước đó: **commit Task 3 + 4** (chưa commit).

## Tổng quan

| Giai đoạn | Hạn | Tiến độ |
|---|---|---|
| 0. Nền tảng (trước 04/10) | — | ✅ 10 / 10 |
| A. Backend: nhiều tài khoản + đăng nhập | trước 15/10 (phần ⭐) | 🔄 5 / 11 |
| F. Giao diện (frontend) | trước 15/10 (phần ⭐) | 🔄 4 / 17 |
| B. Hoàn thiện phần cứng + demo HIC | **15/10/2026** | ⬜ 0 / 8 |
| C. Môn Xây dựng hệ thống thông minh | chưa biết | ⬜ 0 / 11 |

---

## 0. Nền tảng — đã có trước phiên 04/10

| # | Việc | Trạng thái |
|---|---|---|
| 0.1 | AI nhận diện cảm xúc (ViT, 10 người, chia train/val theo người — 72.5% với người lạ) | ✅ 27/09 |
| 0.2 | Backend: quét → gợi ý (xu hướng 1–3 ngày, bài động viên) → chấm điểm theo mức nghe hết bài | ✅ |
| 0.3 | Frontend: vòng lặp Bắt đầu → quét → phát → quét bài mới | ✅ |
| 0.4 | gpio-service: OLED hiện trạng thái | ✅ 28/09 |
| 0.5 | 2 nút chạm TTP223 (bắt đầu / bài tiếp, tạm dừng) chạy trọn vòng với web trên Pi | ✅ 30/09 |
| 0.6 | Cảm biến có người PIR: code xong (cảm biến báo nhầm → thay LD2410C) | ✅ code · ⚠ phần cứng |
| 0.7 | Mạng demo qua hotspot laptop | ✅ |
| 0.8 | Máy mới: PostgreSQL 17, model AI (Git LFS), venv, nhạc | ✅ 03/10 |
| 0.9 | DB một file `setup.sql` + `npm run db:setup`; bảng `artists`, `genres` | ✅ 03/10 |
| 0.10 | Giao diện NYX theo Figma (header, sidebar, layout) + `GET /artists`; Figma form khảo sát gu | ✅ 04/10 |

---

## A. Backend: nhiều tài khoản + đăng nhập

⭐ = tối thiểu cho demo HIC 15/10 · số Task = số trong plan `2026-10-04-multi-user-accounts.md` (Task 9–12 là frontend → nằm ở mục F)

| Task | Việc | Ai | Trạng thái |
|---|---|---|---|
| 0 ⭐ | Commit việc dở, ghi quyết định mua LD2410C | Claude | ✅ 04/10 |
| 1 ⭐ | DB mới: bảng `users`, `devices`, `user_id` ở 5 bảng, tài khoản `demo`/`demo1234`; cài `bcryptjs`, `jsonwebtoken`, `JWT_SECRET` | Claude | ✅ 04/10 |
| 2 ⭐ | `authValidation.js`: kiểm tra username / mật khẩu (+ 2 test mẫu) | Bạn | ✅ 04/10 |
| 3 ⭐ | **Đăng ký + đăng nhập** | Bạn | ✅ 04/10 |
| | ↳ 3.1 `userModel.js`: `createUser`, `findUserByUsername` | Bạn | ✅ 04/10 |
| | ↳ 3.2 `authService.js`: `register`, `login`, `signToken`, `toPublicUser` | Bạn | ✅ 04/10 |
| | ↳ 3.3 `authController.js` + route `POST /auth/register`, `POST /auth/login` | Bạn | ✅ 04/10 |
| | ↳ 3.4 Thử bằng curl/Postman (6 trường hợp) + commit | Bạn + Claude | ✅ 04/10 |
| 4 ⭐ | Middleware `requireAuth` + `GET /auth/me` (+ `findUserById`) | Bạn | ✅ 04/10 |
| 5 ⭐ | Thêm `user_id` vào gợi ý, chấm điểm, lịch sử (web) — sau task này quét lại chạy được | Bạn | 🔄 |
| 6 ⭐ | `resolveUser`: hộp nhạc mượn tài khoản người đang giữ hộp (tự nhả sau 30 phút) | Bạn | ⬜ |
| 7 ⭐ | API hộp nhạc: `claim` / `release` / `current` | Bạn | ⬜ |
| 8 | `GET /genres`, `GET/POST /profile` (khảo sát gu theo từng người) | Bạn | ⬜ |
| 13 | OLED màn chờ đăng nhập | Claude | ⏸ |
| 14 ⭐ | Đưa lên Pi + thử thật: laptop A + điện thoại B qua hotspot | Bạn + Claude | ⬜ |

---

## F. Giao diện (frontend)

Cách làm: **Bạn** viết JSX + state + gọi API · **Claude** viết SCSS theo class name bạn đặt (khớp Figma `lycGTr71v02BpzYgjmZZS3`) và sửa Figma.
⭐ = tối thiểu cho demo HIC 15/10

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| F1 | Nền: font (DM Sans, Inter, Playfair), màu ở `:root`, layout grid Header / SideBar / `<main>` | Claude | ✅ 03/10 |
| F2 | Header NYX theo Figma (logo, nút home, ô tìm kiếm, nút) | Bạn + Claude | ✅ 04/10 |
| F3 | Sidebar "Your Library": danh sách ca sĩ lấy từ `GET /artists` | Bạn + Claude | ✅ 04/10 |
| F4 | Figma: thiết kế form khảo sát gu (`255:5`, `257:114`) | Claude | ✅ 04/10 |
| F5 ⭐ | Figma: sửa Sign in / Sign up (Email → Tên đăng nhập, bỏ ngày sinh + Apple/Facebook) | Claude | ⬜ (Figma MCP đang hết lượt gọi) |
| F6 ⭐ | `config.js` đọc `VITE_*` (Claude) + `src/api.js` tự gắn token, 401 → về trang đăng nhập (Bạn) — *plan Task 9* | Claude + Bạn | ⬜ |
| F7 ⭐ | Trang **Đăng nhập** + **Đăng ký**, chặn route khi chưa đăng nhập — *plan Task 10* | Bạn + Claude | ⬜ |
| F8 ⭐ | Header: hiện tên người dùng + nút đăng xuất — *plan Task 10* | Bạn + Claude | ⬜ |
| F9 ⭐ | **Trang chủ — phần giữa** theo Figma: nút Bắt đầu, khung camera đang quét, thông báo "không thấy mặt" (hiện chỉ là nút + chữ trần) | Bạn + Claude | ⬜ |
| F10 ⭐ | **Trình phát nhạc** theo Figma: tên bài, ca sĩ, cảm xúc + lời nhắn, "bài động viên", nút bài tiếp / tạm dừng, thanh thời gian (hiện chỉ là `<audio>` trần) | Bạn + Claude | ⬜ |
| F11 ⭐ | Nút **"Dùng hộp nhạc" / "Rời hộp nhạc"** + **màn chờ trên Pi** ("Xin chào, {tên}") — *plan Task 12* | Bạn + Claude | ⬜ |
| F12 | **Form khảo sát gu** lần đầu (tìm ca sĩ/thể loại không dấu, "Xem thêm", "Bỏ qua") — *plan Task 11* | Bạn + Claude | ⬜ |
| F13 | Sidebar: ca sĩ không có ảnh → hiện chữ viết tắt (5 ca sĩ đang hiện ảnh lỗi) | Bạn + Claude | ⬜ |
| F14 | Co giãn cho **điện thoại** (360px, không cuộn ngang) — cần để đăng nhập + bấm "Dùng hộp nhạc" trên điện thoại | Claude | ⬜ |
| F15 | Nút **từ chối bài** (`/feed-back`) và **xin bài** (`/request-song`) — API có sẵn, chưa có giao diện | Bạn + Claude | ⬜ |
| F16 | Trang **lịch sử cảm xúc 7 ngày** (biểu đồ từ `GET /mood-history`) — thể hiện "thông minh" cho môn HTTM; chưa có thiết kế Figma | Bạn + Claude | ⏸ |
| F17 | Ô tìm kiếm trên header chạy thật (tìm bài / ca sĩ) — hiện chỉ là giao diện | Bạn | ⏸ |

> Khi Figma MCP dùng lại được: Claude đối chiếu file Figma để bổ sung màn hình còn thiếu vào bảng (vd Figma đã có thiết kế cho trình phát nhạc / trang chủ chưa).

---

## B. Hoàn thiện phần cứng + demo HIC (hạn 15/10)

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| B1 | Đặt mua radar **LD2410C** (shop giao nhanh) | Bạn | 🔄 đã chốt mua 04/10 |
| B2 | Lắp LD2410C thay PIR (hàng trên thứ 1/3/8) → `test_hardware.py` → thử toàn luồng 6 tình huống (chào / quét / ngồi yên 1 phút không dừng / đi ra 40s → tạm dừng / quay lại → phát tiếp / tự chạm dừng thì không tự phát) | Bạn + Claude | ⬜ |
| B3 | Đồng bộ Pi qua git (bỏ bản `scp`) + DB mới | Bạn + Claude | ⬜ (gộp với A-14) |
| B4 | Vỏ hộp: thử bằng carton → hộp gỗ (bản vẽ: artifact "Hộp nhạc EmoTune") | Bạn | ⬜ |
| B5 | Tự khởi động khi cắm điện: systemd cho 4 service + Chromium kiosk (bỏ VNC) | Claude | ⬜ |
| B6 | Sửa slide + kịch bản: "đèn LED + nút" → OLED + nút chạm + cảm biến có người + đăng nhập | Claude + Bạn | ⬜ |
| B7 | Tập demo trọn vòng trên Pi qua hotspot | Bạn | ⬜ |
| B8 | Thí nghiệm Edge Impulse (MobileNetV2) so với ViT 72.5% trên cùng 2 người | Bạn + Claude | ⏸ |

---

## C. Môn Xây dựng hệ thống thông minh (sau 15/10)

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| C1 | Điểm thưởng khảo sát gu (+0.5 cùng ca sĩ, +0.5 cùng thể loại) trong `suggestService` | Bạn | ⬜ |
| C2 | Thêm nhạc: ≥ 8–10 bài mỗi cảm xúc trong `setup.sql` | Bạn + Claude | ⬜ |
| C3 | Gợi ý theo gu 65/35 (plan có sẵn: `docs/superpowers/plans/2026-09-27-taste-based-recommendation.md`, thêm `user_id`) | Bạn | ⬜ |
| C4 | AI — đo mốc: macro-F1 + confusion matrix theo từng người lạ | Bạn + Claude | ⬜ |
| C5 | AI — dữ liệu: thêm người (≥ 30) + bộ công khai (RAF-DB / FER+), soi lại nhãn `angry`, đủ 5 cảm xúc mỗi người | Bạn | ⬜ |
| C6 | AI — huấn luyện: augmentation, label smoothing, early stopping, sửa nạp checkpoint tốt nhất, GroupKFold theo người | Bạn + Claude | ⬜ |
| C7 | AI — suy luận thông minh: gộp N khung hình + ngưỡng tin cậy ("chưa chắc") + lật ngang | Bạn | ⬜ |
| C8 | Cập nhật `AI_NOTES.md` với số liệu mới | Bạn + Claude | ⬜ |
| C9 | Sửa xu hướng cảm xúc: hiện chỉ đếm `sad` (bỏ sót `angry`) | Bạn | ⬜ |
| C10 | Sửa lỗi cũ: `EmotionScanner` gửi ảnh khi camera chưa mở; `mood_history` có thể ghi `suggested` 2 lần | Bạn | ⬜ |
| C11 | (Tuỳ chọn) kênh thứ hai: giọng nói hoặc văn bản, hợp nhất với khuôn mặt | Bạn | ⏸ |

---

## Nhật ký hoàn thành

| Ngày | Xong |
|---|---|
| 04/10 | A-0 commit việc dở · A-1 DB nhiều tài khoản · A-2 `authValidation` · A-3 đăng ký + đăng nhập (`userModel`, `authService`, `authController`, route) · A-4 `requireAuth` + `GET /auth/me` |
