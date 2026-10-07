# Tiến độ EmoTune

> Claude cập nhật file này **mỗi khi xong một phần** (đánh dấu + ghi ngày). Chi tiết từng task: plan `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`; nhật ký: `NOTES.md`.
>
> ✅ xong · 🔄 đang làm · ⬜ chưa làm · ⏸ tuỳ chọn / làm nếu kịp · **Bạn** = bạn tự code (Claude hướng dẫn) · **Claude** = Claude làm

## 📍 Đang ở đâu

**Giai đoạn F — F11/F12:** F9 + F10 (trang chủ, trình phát) xong 07/10. Còn thiếu mp3 trong `music/` để thử phát thật (A-15). (Từ 07/10 chuyển sang vibe coding: Claude tự viết code.)
F7 xong 07/10: `/login`, `/register`, `RequireAuth` chặn trang chủ khi chưa có token. Task 6 + 7 (hộp nhạc) **để sau** (quyết định 04/10); dự phòng nếu không kịp: Pi tự đăng nhập bằng tài khoản `demo`.

## Tổng quan

| Giai đoạn | Hạn | Tiến độ |
|---|---|---|
| 0. Nền tảng (trước 04/10) | — | ✅ 10 / 10 |
| A. Backend: nhiều tài khoản + đăng nhập | trước 15/10 (phần ⭐) | 🔄 7 / 11 |
| F. Giao diện (frontend) | trước 15/10 (phần ⭐) | 🔄 9 / 17 |
| P. Playlist cá nhân (chế độ không quét) | trước 15/10 nếu kịp | 🔄 2 / 5 |
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
| 5 ⭐ | Thêm `user_id` vào gợi ý, chấm điểm, lịch sử — mọi API cá nhân cần đăng nhập | Bạn + Claude | ✅ 04/10 |
| | ↳ 5.1 Luồng gợi ý: `suggestModel` → `suggestService` → `suggestController` + `scanController`, route có `requireAuth` | Bạn + Claude | ✅ 04/10 |
| | ↳ 5.2 Luồng chấm điểm: `POST /listen-report` (`listenReportModel` → service → controller) | Claude | ✅ 04/10 |
| | ↳ 5.3 Từ chối bài + xin bài: `POST /feed-back`, `POST /request-song` (`feedBackModel` dùng chung) | Claude | ✅ 04/10 |
| | ↳ 5.4 Lịch sử cảm xúc: `GET /mood-history` | Claude | ✅ 04/10 |
| | ↳ 5.5 Thử 2 tài khoản A/B (preferences tách riêng) + commit | Claude | ✅ 04/10 (chờ commit) |
| 6 ⭐ | `resolveUser`: hộp nhạc mượn tài khoản người đang giữ hộp (tự nhả sau 30 phút) | Bạn | ⬜ để sau (04/10) |
| 7 ⭐ | API hộp nhạc: `claim` / `release` / `current` | Bạn | ⬜ để sau (04/10) |
| 8 | `GET /genres`, `GET/POST /profile` (khảo sát gu theo từng người) | Claude | ✅ 07/10 (đã thử curl 2 tài khoản, chưa commit) |
| 13 | OLED màn chờ đăng nhập | Claude | ⏸ |
| 15 ⭐ | **Chép lại 10 file mp3 vào `emotune-backend/music/`** (đang trống → nhạc không phát, `/music/<file>` trả 404). Lấy từ Pi bằng `scp` rồi `npm run rename-music -- --apply` nếu cần | Bạn | ⬜ (phát hiện 07/10) |
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
| F6 ⭐ | `config.js` đọc `VITE_*` + `src/api.js` tự gắn token, 401 → về trang đăng nhập; 3 component dùng `api` — *plan Task 9* | Claude | ✅ 04/10 |
| F7 ⭐ | Trang **Đăng nhập** + **Đăng ký**, chặn route khi chưa đăng nhập — *plan Task 10* | Claude | ✅ 07/10 (code + lint + build OK; chờ bạn thử trên trình duyệt) |
| F8 ⭐ | Header: hiện tên người dùng + nút đăng xuất — *plan Task 10* | Claude | ✅ 07/10 (`AuthContext` gọi `GET /auth/me`; chờ bạn thử trên trình duyệt) |
| F9 ⭐ | **Trang chủ — phần giữa**: màn chào + nút Start, khung camera tròn khi quét, thông báo "không thấy mặt". *Figma không có thiết kế phần này (frame `58:14` chỉ có header + sidebar) → Claude tự dựng theo style NYX* | Claude | ✅ 07/10 (lint + build OK; chờ bạn xem trên trình duyệt) |
| F10 ⭐ | **Trình phát nhạc**: huy hiệu cảm xúc + lời nhắn, "bài động viên", đĩa xoay, tên bài / ca sĩ, thanh thời gian tua được, nút Play/Pause + Next (màu theo cảm xúc). Tự dựng như F9 | Claude | ✅ 07/10 (chưa thử phát thật vì thiếu mp3) |
| F10b ⭐ | **Làm lại trình phát theo Figma** (trang `homepage signup`, frame `screen play nhạc`): ảnh bìa lớn ở giữa + thanh phát nhạc cố định ở dưới (tên bài/ca sĩ, Play/Next, thanh thời gian, âm lượng) + huy hiệu cảm xúc/lời nhắn. Cần **link frame** từ bạn (chuột phải frame → Copy link) | Claude | ⬜ chờ link Figma |
| F11 ⭐ | Nút **"Dùng hộp nhạc" / "Rời hộp nhạc"** + **màn chờ trên Pi** ("Xin chào, {tên}") — *plan Task 12* | Bạn + Claude | ⬜ |
| F12 | **Form khảo sát gu** lần đầu (tìm ca sĩ/thể loại không dấu, "Xem thêm", "Bỏ qua") — *plan Task 11* | Bạn + Claude | ⬜ |
| F13 | Sidebar: ca sĩ không có ảnh → hiện chữ viết tắt (5 ca sĩ đang hiện ảnh lỗi) | Bạn + Claude | ⬜ |
| F14 | Co giãn cho **điện thoại** (360px, không cuộn ngang) — cần để đăng nhập + bấm "Dùng hộp nhạc" trên điện thoại | Claude | ⬜ |
| F15 | Nút **từ chối bài** (`/feed-back`) và **xin bài** (`/request-song`) — API có sẵn, chưa có giao diện | Bạn + Claude | ⬜ |
| F16 | Trang **lịch sử cảm xúc 7 ngày** (biểu đồ từ `GET /mood-history`) — thể hiện "thông minh" cho môn HTTM; chưa có thiết kế Figma | Bạn + Claude | ⏸ |
| F17 | Ô tìm kiếm trên header chạy thật (tìm bài / ca sĩ) — hiện chỉ là giao diện | Bạn | ⏸ |

> Khi Figma MCP dùng lại được: Claude đối chiếu file Figma để bổ sung màn hình còn thiếu vào bảng (vd Figma đã có thiết kế cho trình phát nhạc / trang chủ chưa).

---

## P. Playlist cá nhân (chốt 07/10)

**Hai chế độ phát:** (1) *Playlist* — người dùng chọn playlist của mình rồi Play → **không quét camera**, phát lần lượt; (2) *Cảm xúc (AI)* — như hiện tại: quét → chọn bài → hết bài quét lại.
**Hết playlist → quét 1 lần → AI chọn bài → chuyển sang chế độ cảm xúc.** Chế độ playlist **không** gọi `/listen-report` (điểm sở thích gắn với cảm xúc, playlist không có cảm xúc). Thêm bài vào playlist bằng nút **⋯ (3 gạch)** trên trình phát → "Add to playlist". `queue-screen` trong Figma = danh sách bài còn lại của playlist.

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| P1 | DB: bảng `playlists` (`id`, `user_id`, `name`) + `playlist_songs` (`playlist_id`, `song_id`, `position`); viết `db/migrate_playlists.sql` + cập nhật `setup.sql` | Claude | ✅ 07/10 (đã chạy migrate lên DB đang dùng; thêm `npm run db:migrate`) |
| P2 | Backend: `GET /playlists`, `GET /playlists/:id`, `POST /playlists/:id/songs`, `DELETE /playlists/:id/songs/:songId` (mọi câu SQL lọc `user_id`; tự tạo "My Playlist" cho người chưa có) | Claude | ✅ 07/10 (thử curl 15 trường hợp, 2 tài khoản; chưa commit) |
| P3 | Frontend: nút ⋯ trên trình phát → menu "Add to playlist" | Claude | ⬜ |
| P4 | Frontend: sidebar tab Playlists hiện playlist của mình, bấm Play → vào chế độ playlist (+ `queue-screen` nếu muốn) | Claude | ⬜ |
| P5 | `HomePage`: state chế độ; phát playlist không quét; hết playlist → quét 1 lần → chuyển sang chế độ cảm xúc | Claude | ⬜ |

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
| 07/10 | P1 bảng playlist + P2 API playlist · (chốt thiết kế chế độ Playlist — mục P) · F9 trang chủ + khung quét · F10 trình phát (tự dựng, Figma không có thiết kế) · A-8 `GET /genres`, `GET/POST /profile` · F8 header tên người dùng + Log out (`AuthContext`) · F7 trang Đăng nhập + Đăng ký + `RequireAuth` (Claude viết; đổi thông báo lỗi `authService` sang tiếng Việt) |
| 04/10 | A-0 commit việc dở · A-1 DB nhiều tài khoản · A-2 `authValidation` · A-3 đăng ký + đăng nhập (`userModel`, `authService`, `authController`, route) · A-4 `requireAuth` + `GET /auth/me` · A-5 gợi ý, chấm điểm, từ chối/xin bài, lịch sử theo từng người · F6 `api.js` gắn token |
