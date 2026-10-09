# Tiến độ EmoTune

> Claude cập nhật file này **mỗi khi xong một phần** (đánh dấu + ghi ngày). Chi tiết từng task: plan `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`; nhật ký: `NOTES.md`.
>
> ✅ xong · 🔄 đang làm · ⬜ chưa làm · ⏸ tuỳ chọn / làm nếu kịp · **Bạn** = bạn tự code (Claude hướng dẫn) · **Claude** = Claude làm

## 📍 Đang ở đâu

**09/10 tối (laptop):** **C12 trang thống kê `/stats` mới ✅ + `npm run seed-demo` + giao diện neon** (donut, lưới chấm, cột mảnh phát sáng, **biểu đồ hoa hồng** cho độ tự tin AI; review cả nhánh xong, `npm test` 62/62, Playwright 1440 / 1000 / 390px). **H6 trợ lý giọng nói ✅** (đã chỉnh theo góp ý) và **H13 trang Mix/Radio ✅** (Figma frame 25 `79:75`, route `/mix/:key`). **Toàn bộ việc tối 09/10 đã commit + push cuối phiên.** Còn chờ người dùng: xem `/stats` neon (`demo30`/`demo1234`) + trang Mix, thử micro thật. Tiếp theo: spec **C13** (gợi ý theo người dùng tương tự) và **giai đoạn B (Pi), hạn 15/10**. Chi tiết: `NOTES.md` phiên 09/10 tối.
**09/10 (laptop, sáng–chiều):** H8, H10, H11 xong, commit `7ee0951`; **H12 màn lời bài hát ✅** (commit `9e57d5e` + push).
**08/10 (PC):** H7 trang chủ kiểu Spotify xong bản đầu (chờ người dùng góp ý từng mục, chưa thử 390px), **H9 ảnh bìa + ảnh ca sĩ thật ✅**, H8 trang ca sĩ ✅ 09/10 (code + thử trình duyệt, chưa commit). Việc 08/10 **đã commit `93c2b9e` + push**. **Phiên sau dùng laptop → làm NOTES.md "🧭 TỔNG KẾT NGÀY 08/10" mục 0 trước** (pull, `.env`, migrate `migrate_images.sql`, `npm run fetch-images`). Sau đó H8 → H6 trợ lý giọng nói → giai đoạn B (Pi).
Từ 07/10 **vibe coding**: Claude tự viết code (cột "Ai" ở các dòng cũ giữ nguyên để làm lịch sử). Task 6 + 7 (hộp nhạc) **để sau**; dự phòng nếu không kịp: Pi tự đăng nhập bằng tài khoản `demo`.

## Tổng quan

| Giai đoạn | Hạn | Tiến độ |
|---|---|---|
| 0. Nền tảng (trước 04/10) | — | ✅ 10 / 10 |
| A. Backend: nhiều tài khoản + đăng nhập | trước 15/10 (phần ⭐) | 🔄 8 / 11 |
| F. Giao diện (frontend) | trước 15/10 (phần ⭐) | 🔄 18 / 20 (còn F5 Figma, F11 hộp nhạc) |
| P. Playlist cá nhân (chế độ không quét) | trước 15/10 nếu kịp | ✅ 6 / 6 |
| H. Trang chủ duyệt nhạc + luồng quét mới | trước 15/10 | ✅ 13 / 13 |
| B. Hoàn thiện phần cứng + demo HIC | **15/10/2026** | ⬜ 0 / 8 |
| C. Môn Xây dựng hệ thống thông minh | chưa biết | 🔄 4 / 13 (C1, C9, C10, C12 xong) |

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
| 15 ⭐ | **Chép lại 10 file mp3 vào `emotune-backend/music/`** (máy khác bị trống → `/music/<file>` 404). Lấy từ Pi bằng `scp` rồi `npm run rename-music -- --apply` nếu cần | Bạn | ✅ 07/10 (máy này đã có đủ 10 bài, phát thử OK) |
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
| F10b ⭐ | **Làm lại trình phát theo Figma** (frame `92:301` "screen play nhạc"): khung gradient lớn **đổi màu theo vibe bài** + ảnh bìa (ảnh ca sĩ) + thanh phát cố định dưới (tên bài/ca sĩ, Play/Next, thanh thời gian, âm lượng) + huy hiệu cảm xúc/lời nhắn. Shuffle/prev/repeat/mic/queue hiện mờ (chưa có chức năng) | Claude | ✅ 07/10 (lint + build + Playwright 3 vibe; chưa commit) |
| F10c ⭐ | **Chọn cảm xúc bằng tay** khi không có camera (5 nút Happy/Sad/Angry/Surprised/Neutral → `POST /suggest`), có camera thì hiện link "Pick my mood instead". Không gửi ảnh rỗng khi camera chưa mở (một nửa lỗi C10). `/suggest` nhận thêm `surprise` | Claude | ✅ 07/10 (Playwright: không camera → chọn Surprised → phát bài vibe surprise) |
| F10d ⭐ | **Sóng âm** giữa trình phát thay ảnh bìa (nhấp nhô theo nhạc thật, đập theo bass); bỏ huy hiệu cảm xúc, chỉ còn lời gợi ý; tên ca sĩ nhỏ + mờ hơn tên bài | Claude | ✅ 07/10 (Playwright: bài sad + happy đều nhảy rõ, có tiếng) |
| F11 ⭐ | Nút **"Dùng hộp nhạc" / "Rời hộp nhạc"** + **màn chờ trên Pi** ("Xin chào, {tên}") — *plan Task 12* | Bạn + Claude | ⬜ |
| F12 | **Form khảo sát gu** lần đầu theo Figma `255:5` (`/survey`): người chưa làm tự được chuyển tới; tìm thể loại/ca sĩ không dấu, "Show more artists", Skip / Done | Claude | ✅ 07/10 (Playwright: đăng ký → /survey → chọn → về trang chủ) |
| F13 | Ca sĩ không có ảnh → chữ viết tắt (NP, GU, TS, DL, RM) theo style Figma, dùng chung `ArtistAvatar` cho sidebar + khảo sát | Claude | ✅ 07/10 |
| F14 | Co giãn cho **điện thoại** (390px) + màn vừa (1100px): header 2 hàng, thư viện thành dải cuộn ngang, thanh phát 2 hàng (giữ nút ☰, 👎), trang playlist/mood/khảo sát xếp lại; không tràn ngang | Claude | ✅ 07/10 (Playwright đo 390 / 1100 / 1440px) |
| F15 | Nút 👎 **"Not for me"** cạnh tên bài (`/feed-back`, −1 điểm rồi chuyển bài) + menu ☰ **"Request a song"** (gõ không dấu, gợi ý ngay, `/request-song` +1 điểm rồi phát) | Claude | ✅ 07/10 (Playwright + kiểm tra điểm trong DB) |
| F16 | Trang **Your mood** (`/mood`, bấm biểu tượng AI giữa header): 3 ô tóm tắt (số lần quét, cảm xúc nhiều nhất, **Cheer-up mode On/Off + giải thích vì sao**), biểu đồ cột chồng 7 ngày (màu đã kiểm tra mù màu, rê chuột xem chi tiết, nút Show table) | Claude | ✅ 07/10 (Playwright với dữ liệu mẫu) |
| F17 | Ô tìm kiếm trên header chạy thật (`HeaderSearch`): tìm bài/ca sĩ không dấu, phím ↑↓ + Enter, bấm là phát ngay | Claude | ✅ 07/10 |

> Khi Figma MCP dùng lại được: Claude đối chiếu file Figma để bổ sung màn hình còn thiếu vào bảng (vd Figma đã có thiết kế cho trình phát nhạc / trang chủ chưa).

---

## P. Playlist cá nhân (chốt 07/10)

**Hai chế độ phát:** (1) *Playlist* — người dùng chọn playlist của mình rồi Play → **không quét camera**, phát lần lượt; (2) *Cảm xúc (AI)* — như hiện tại: quét → chọn bài → hết bài quét lại.
**Hết playlist → quét 1 lần → AI chọn bài → chuyển sang chế độ cảm xúc.** Chế độ playlist **không** gọi `/listen-report` (điểm sở thích gắn với cảm xúc, playlist không có cảm xúc). Thêm bài vào playlist bằng nút **⋯ (3 gạch)** trên trình phát → "Add to playlist". `queue-screen` trong Figma = danh sách bài còn lại của playlist.

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| P1 | DB: bảng `playlists` (`id`, `user_id`, `name`) + `playlist_songs` (`playlist_id`, `song_id`, `position`); viết `db/migrate_playlists.sql` + cập nhật `setup.sql` | Claude | ✅ 07/10 (đã chạy migrate lên DB đang dùng; thêm `npm run db:migrate`) |
| P2 | Backend: `GET /playlists`, `GET /playlists/:id`, `POST /playlists/:id/songs`, `DELETE /playlists/:id/songs/:songId` (mọi câu SQL lọc `user_id`; tự tạo "My Playlist" cho người chưa có) | Claude | ✅ 07/10 (thử curl 15 trường hợp, 2 tài khoản; chưa commit) |
| P3 | Frontend: nút ☰ trên thanh phát → menu: chế độ cảm xúc = **"Add to playlist"** (chọn playlist, báo Added / Already in); chế độ playlist = **"View playlist"** | Claude | ✅ 07/10 |
| P4 | Sidebar tab **Playlists** (bấm là phát) + **cột hàng đợi** (Now playing / Next from…, bấm bài để nhảy tới). Còn thiếu: trang playlist riêng theo Figma "Page playlist khi đã có nhạc" (cần link frame) | Claude | ✅ 07/10 (phần sidebar + hàng đợi) |
| P5 | `HomePage`: chế độ playlist (không quét, không `/listen-report`), hết playlist → về chế độ cảm xúc. **Thẻ "Up next" kiểu YouTube**: 15 giây cuối mờ dần hiện, vòng đếm ngược, bấm để phát luôn, ✕ để ẩn; bài cuối báo "End of playlist" | Claude | ✅ 07/10 (Playwright: thêm 2 bài, phát, tự chuyển bài, hàng đợi, hết playlist → màn chọn cảm xúc) |
| P6 | **Trang playlist** `/playlist/:id` (theo ảnh Figma "Page playlist khi đã có nhạc"): bảng bài (đang phát tô tím), bấm tên để đổi tên, ⋯ xoá playlist, xoá bài, tìm bài để thêm, **Recommended** (cùng ca sĩ +2, cùng thể loại +1, cùng vibe +0.5). Nút + ở sidebar tạo playlist. API mới: `POST/PATCH/DELETE /playlists`, `GET /songs`. **Nhạc không tắt khi đổi trang** (HomePage luôn giữ trong MainLayout); nút Home trên header chạy | Claude | ✅ 07/10 (curl + Playwright, nhạc chạy liên tục 64s→66s→67s qua 2 lần đổi trang) |

---

## H. Trang chủ duyệt nhạc + luồng quét mới (chốt 07/10)

Spec `docs/superpowers/specs/2026-10-07-browse-home-and-scan-flow-design.md` · plan `docs/superpowers/plans/2026-10-07-browse-home-and-scan-flow.md`

| # | Việc | Ai | Trạng thái |
|---|---|---|---|
| H1 | Backend `GET /songs/for-you` (điểm nghe thật + thưởng khảo sát, hàm thuần `rankForYou` + 4 test); `/suggest`, `/scan-and-suggest` trả `detectedEmotion`; `/suggest` nhận `auto: true` → không ghi lịch sử | Claude | ✅ 07/10 (`npm test` 13/13) |
| H2 | `utils/moodSession` (phiên đã quét, cảm xúc gần nhất), `hooks/useIdle` (rảnh 60s), `utils/moodStats` (dùng chung trang chủ + /stats) | Claude | ✅ 07/10 |
| H3 | Tách `HomePage` → `PlayerHost` (luôn sống, thanh phát + khung lớn ở `/now-playing`) + `ScanPage` (`/` lần đầu phiên, `/scan`). Hết bài: đang lướt → bài theo cảm xúc gần nhất, không bật camera; **rảnh ≥ 60s → tự quét lại**. `/mood` → `/stats` | Claude | ✅ 07/10 (Playwright đủ 7 luồng) |
| H4 | Header: icon **record-circle** (viền màu cảm xúc, "Mood: Sad · 12 min ago", nhấp nháy sau 30 phút, bấm → `/scan`); thứ tự icon mới; bấm tên tài khoản → `/stats`; logo AI mở trợ lý giọng nói (H6) | Claude | ✅ 07/10 |
| H5 | **Trang chủ duyệt nhạc** theo Figma `58:112`: chip thể loại, banner Create your own playlist, Made for you, Popular artists (bấm = phát bài của ca sĩ), Recently added, Your playlists, thẻ Your mood this week | Claude | ✅ 07/10 (1440 + 390px) |
| H6 | **Trợ lý giọng nói** (bấm logo AI, Figma `284:120`): nói (Web Speech `vi-VN`) hoặc gõ để phát bài/ca sĩ/playlist, bài tiếp, tạm dừng, chuyển trang, nói cảm xúc. Backend `POST /assistant`: luật `assistantRules` trước, Claude Haiku 5.5 (`assistantLlm`) dự phòng khi có `ANTHROPIC_API_KEY`, kết quả LLM được kiểm lại với danh mục. Overlay `VoiceAssistant` + sóng `VoiceWave`, nhạc tự nhỏ khi trợ lý nghe/nói, `control(command)` trong `PlaybackProvider` | Claude | ✅ 09/10: Playwright bằng ô gõ 9/9 trường hợp + 2 lượt chồng nhau; review cả nhánh → sửa F1–F6 (khớp tên theo đoạn chữ liền, câu cảm xúc thắng tên playlist kiểu "Nhạc Buồn", thêm "tắt nhạc"/"bật tiếng"/"mình tức"…, playlist rỗng mở trang). **Chỉnh theo góp ý tối 09/10:** lời dẫn có tên bài → nghỉ 1s → tắt màn hình → mới phát (Esc giữa chừng = huỷ); icon thanh phát to ~1.3 lần; sóng âm theo từng dải tần như trình phát; nền radial trong suốt. `npm test` **43/43**, lint + build sạch. **Chưa thử LLM thật (không key), chưa thử micro thật**; đã commit + push 09/10 |
| H7 | **Làm lại trang chủ cho giống thiết kế** (người dùng: "chưa sát design"; tham khảo Spotify web + Figma `58:112`) — chi tiết các điểm khác biệt ở NOTES.md mục "🧭 TỔNG KẾT NGÀY 07/10" → 5 | Claude | 🔄 07/10: bản Spotify-style xong (Shelf + mũi tên + Show all, thẻ chia đều theo độ rộng, ảnh bìa tự vẽ theo vibe, hàng Mixes, 2 thẻ lớn cuối trang); lint + build OK; **chưa thử 390px, chưa commit**, chờ người dùng góp ý từng mục |
| H8 | **Trang ca sĩ** kiểu Spotify (bấm ca sĩ ở Popular artists): hero ảnh + tên to, ▶ / shuffle / Follow (= thêm vào gu), Popular (vibe chip, số lần nghe), "Fits your mood now", Songs lọc theo vibe, Mixes, Fans also like, About + "You & ca sĩ" (nghe khi cảm xúc nào). **Figma xong** frame `294:134` (trang "homepage signup", y = 7300) + 3 component `Song card (NYX cover)`, `Track row`, `Artist circle` | Claude | ✅ 09/10: code xong `/artist/:id` (`pages/ArtistPage.jsx/.scss`, API `GET /artists/:id/stats`, thẻ dùng chung `components/BrowseCards.jsx`); bấm ca sĩ ở Popular artists / thanh bên / Fans also like đều mở trang này. Đã thử Playwright 1440px + 390px, Follow lưu vào gu (`POST /profile`). Bỏ duration và đoạn tiểu sử trong Figma vì DB chưa có dữ liệu. Figma `294:134` đã đổi emoji → icon động (còn 1 icon thừa `298:210` trên chữ "Popular") |
| H9 | **Ảnh thật cho bài hát + ca sĩ**: cột `songs.cover`, `artists.photo` (`db/migrate_images.sql` + `setup.sql`), script `npm run fetch-images` (iTunes Search API + ảnh ca sĩ trên Apple Music; chỉ điền chỗ thiếu, có file sẵn thì không lên mạng), `/covers/<file>`, frontend ưu tiên ảnh thật, thiếu thì bìa tự vẽ (`utils/images.js`, `SongThumb`). Deezer bị mạng nhà chặn (DNS → 127.0.0.1) nên dùng iTunes | Claude | ✅ 08/10: 8/10 bài có bìa, 9/11 ca sĩ có ảnh 1000px; 09/10: thêm **Deezer API** làm nguồn dự phòng trong `fetch-images` → đủ ảnh ca sĩ 11/11 (*Phạm Hoài Nam*, *Lệ Quyên*: Deezer chỉ có ảnh album làm ảnh ca sĩ); *Meditation*, *Reduce Stress* (không có ca sĩ) dùng bìa tự vẽ `covers/meditation.png`, `reduce_stress.png` → đủ bìa 10/10 |
| H10 | **Icon cảm xúc động** thay emoji + chữ: happy = mặt trời, sad = mây mưa, angry = lửa, neutral = bông tuyết, surprise = mặt đeo kính (SVG + CSS animation, `components/MoodIcon.jsx/.scss`); dùng ở khung chọn cảm xúc, thẻ "Your mood", "Last scan", trang `/stats` | Claude | ✅ 09/10: lint + build OK, đã chụp thử 5 icon; chưa thử trong trình duyệt thật |
| H11 | **Thanh phát theo Figma `queue-screen`** (frame `186:4`, thanh `186:214`): cao 96px, nền `#131218` + viền trên, 3 cột 320/560/320; ảnh 56px, tên bài DM Sans 15px, tim gạch chéo (= Not for me), 5 nút điều khiển + nút Play vòng tròn trắng, thanh thời gian/âm lượng 4px tím; cột phải: lời bài hát, hàng đợi (menu cũ), thiết bị, loa. Icon mới `assets/icons/bar_*.svg` | Claude | ✅ 09/10: Playwright 1440/1000/390px, thử Play/Pause, tua, tắt tiếng, bấm ảnh mở /now-playing. Lời bài hát, thiết bị, shuffle/prev/repeat chưa có chức năng (làm mờ); nút mic trợ lý giọng nói bỏ khỏi thanh (làm lại ở H6) |

| H12 | **Màn lời bài hát** `/lyrics` (nút Lyrics trên thanh phát; Figma `91:283` vẽ lại kiểu NhacCuaTui): phủ toàn màn hình, trái ảnh bìa + tên + ca sĩ + "Not for me", phải lời chữ to; **lời chạy theo nhạc** (dòng đang hát sáng, tự cuộn, bấm dòng để tua); **nền = màu chủ đạo của ảnh bìa** (mỗi bài 1 màu, chuyển màu mượt) + ảnh bìa mờ. Lời tải bằng `npm run fetch-lyrics` (LRCLIB, chọn bản dài khớp mp3) vào `emotune-backend/lyrics/` (không đưa lên git) | Claude | ✅ 09/10: 6/8 bài có lời chạy theo nhạc; thiếu *Giá Như*, *Khó Giữ Chân Thành* (LRCLIB không có → tự bỏ file `.lrc`). Playwright 1440 + 390px: 3 bài 3 màu nền, tua theo dòng, đóng về trang trước nhạc vẫn chạy |
| H13 | **Trang Mix / Radio** (giống album, Figma **frame 25** `79:75`): bấm thẻ "Mixes for every mood" (trang chủ) và Mix/Radio (trang ca sĩ) → mở `/mix/:key` (`/mix/happy?genre=2`, `/mix/sad?artist=8`, `/mix/radio?artist=8`); **bỏ nút ▶ trên thẻ**. Trang: banner màu theo vibe (ảnh bìa mix 320px + tên 48px + mô tả), nút Play tròn 80px + Shuffle (icon tải từ Figma), bảng bài (# / Title / Album / Date added / Vibe / ⏱), bấm dòng = phát mix từ bài đó, "You might also like" (mix khác, bỏ trùng tên). Mix dựng lại từ `/songs` bằng hàm `buildMix` + `mixPath` (`utils/mixes.js`), dùng chung cho trang chủ, trang ca sĩ, trang mix | Claude | ✅ 09/10: lint + build sạch; Playwright 1440 + 390px (thẻ mở trang không tự phát, Play, bấm dòng 2, Radio ca sĩ, không tràn ngang). **Tối 09/10 thêm cột Album · Date added · ⏱** (kiểu Spotify, cả trang Playlist; DB mới có `songs.album/duration/added_at` qua `db/migrate_song_info.sql` + `npm run fetch-song-info`), giữ Vibe, bỏ Genre. Khác Figma: bỏ ảnh nhỏ cạnh nút Play và footer công ty |

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
| C1 | Điểm thưởng khảo sát gu (+0.5 cùng ca sĩ, +0.5 cùng thể loại) — tính trong SQL `suggestModel` (`taste_bonus`), xếp hạng theo `score + taste_bonus` | Claude | ✅ 07/10 (curl: chọn GUrbane + ballad → "Khó Giữ Chân Thành" lên đầu) |
| C2 | Thêm nhạc: ≥ 8–10 bài mỗi cảm xúc trong `setup.sql` | Bạn + Claude | ⬜ |
| C3 | Gợi ý theo gu 65/35 (plan có sẵn: `docs/superpowers/plans/2026-09-27-taste-based-recommendation.md`, thêm `user_id`) | Bạn | ⬜ |
| C4 | AI — đo mốc: macro-F1 + confusion matrix theo từng người lạ | Bạn + Claude | ⬜ |
| C5 | AI — dữ liệu: thêm người (≥ 30) + bộ công khai (RAF-DB / FER+), soi lại nhãn `angry`, đủ 5 cảm xúc mỗi người | Bạn | ⬜ |
| C6 | AI — huấn luyện: augmentation, label smoothing, early stopping, sửa nạp checkpoint tốt nhất, GroupKFold theo người | Bạn + Claude | ⬜ |
| C7 | AI — suy luận thông minh: gộp N khung hình + ngưỡng tin cậy ("chưa chắc") + lật ngang | Bạn | ⬜ |
| C8 | Cập nhật `AI_NOTES.md` với số liệu mới | Bạn + Claude | ⬜ |
| C9 | Xu hướng cảm xúc đếm cả **buồn + giận** (trước chỉ đếm buồn). Tách hàm thuần `decideTarget` + 7 unit test (`test/moodTrend.test.js`, `npm test` 9/9 pass) | Claude | ✅ 07/10 |
| C10 | `EmotionScanner`: không gửi ảnh khi camera chưa mở; **chờ AI trả lời xong mới gửi ảnh tiếp** (trước đây AI chậm > 3s thì gửi chồng → `mood_history` ghi 2 lần); hết cảnh báo lint cũ. Lint frontend giờ **sạch** (tách hook `AIAssistantContext` ra `aiAssistantStore.js`) | Claude | ✅ 07/10 |
| C11 | (Tuỳ chọn) kênh thứ hai: giọng nói hoặc văn bản, hợp nhất với khuôn mặt | Bạn | 🔄 một phần: cảm xúc từ câu nói (luật + LLM dự phòng) qua trợ lý H6 09/10; chưa hợp nhất với kết quả khuôn mặt |
| C12 | Trang thống kê mới `/stats` (2 phần "You" + "What NYX learned about you", 8 mục, 7/30 ngày, mỗi biểu đồ có "View as table") + `npm run seed-demo` (5 tài khoản **mẫu** `demo30`, `mau_ballad`, `mau_rap`, `mau_pop`, `mau_chill`) | Claude | ✅ 09/10: `npm test` **62/62**, lint + build sạch; Playwright 1440 / 1000 / 390px (`demo30` + tài khoản mới), không tràn ngang, chú thích nằm trong màn hình. Dữ liệu `demo30` / `mau_*` là **mẫu do script sinh**, khi demo phải nói rõ. ✅ 09/10 tối: **giao diện neon** theo ảnh mẫu (donut, lưới chấm, cột mảnh phát sáng, **biểu đồ hoa hồng** cho độ tự tin AI), màu đã kiểm tra mù màu, Playwright 1440 / 1000 / 390px. Đã commit + push 09/10 |
| C13 | Gợi ý theo người dùng tương tự (lọc cộng tác) | Claude | ⬜ spec riêng, dùng 4 người dùng mẫu `mau_*` của `seed-demo` |

---

## Nhật ký hoàn thành

| Ngày | Xong |
|---|---|
| 09/10 | C12 trang thống kê `/stats` (2 phần, 8 mục, 7/30 ngày; giao diện neon + biểu đồ hoa hồng) + `npm run seed-demo` · H13 trang Mix/Radio (`/mix/:key`, Figma frame 25) · H8 trang ca sĩ · H10 icon cảm xúc động · H11 thanh phát queue-screen · H12 màn lời bài hát (nền theo màu ảnh bìa) · H6 trợ lý giọng nói (luật + Haiku dự phòng, Web Speech vi-VN; chỉnh theo góp ý: lời dẫn + nghỉ, icon thanh phát to, sóng âm theo giọng, nền trong suốt) |
| 08/10 | H9 ảnh bìa bài hát + ảnh ca sĩ cỡ lớn (`npm run fetch-images`) |
| 07/10 (khuya 2) | H1–H5: trang chủ duyệt nhạc (Figma 58:112), /now-playing, /scan, icon record-circle, tự quét lại khi rảnh 60s, /songs/for-you, /stats |
| 07/10 (khuya) | F12 khảo sát gu + C1 điểm thưởng · F13 chữ viết tắt ca sĩ · P6 trang playlist (tạo/đổi tên/xoá, Recommended, nhạc không tắt khi đổi trang) · F15 👎 + xin bài · F16 trang Your mood · C9 buồn+giận · C10 quét không chồng lệnh · F17 tìm kiếm · F14 điện thoại · lint sạch |
| 07/10 (tối) | F10b trình phát theo Figma, nền đổi màu theo vibe bài · F10c chọn cảm xúc bằng tay khi không có camera · F10d sóng âm theo nhạc · P3–P5 playlist trên giao diện (menu ☰, tab Playlists, hàng đợi, thẻ Up next) · A-15 mp3 có đủ trên máy này |
| 07/10 | P1 bảng playlist + P2 API playlist · (chốt thiết kế chế độ Playlist — mục P) · F9 trang chủ + khung quét · F10 trình phát (tự dựng, Figma không có thiết kế) · A-8 `GET /genres`, `GET/POST /profile` · F8 header tên người dùng + Log out (`AuthContext`) · F7 trang Đăng nhập + Đăng ký + `RequireAuth` (Claude viết; đổi thông báo lỗi `authService` sang tiếng Việt) |
| 04/10 | A-0 commit việc dở · A-1 DB nhiều tài khoản · A-2 `authValidation` · A-3 đăng ký + đăng nhập (`userModel`, `authService`, `authController`, route) · A-4 `requireAuth` + `GET /auth/me` · A-5 gợi ý, chấm điểm, từ chối/xin bài, lịch sử theo từng người · F6 `api.js` gắn token |
