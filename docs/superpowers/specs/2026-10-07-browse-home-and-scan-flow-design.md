# Trang chủ duyệt nhạc + luồng quét cảm xúc mới — thiết kế

> Ngày: 07/10/2026 · Trạng thái: **đã duyệt 07/10** (thêm quy tắc "rảnh 60s → tự quét lại") · Phần 1/2 (phần 2: trợ lý giọng nói AI, thiết kế riêng sau)
> Figma: khung `58:14` (header + sidebar), nội dung trang chủ `58:112` ("Frame 13"), màn trình phát `92:301`.

## 1. Mục tiêu (người dùng đã chốt)

- Nút **Home** mở **trang chủ duyệt nhạc** kiểu Spotify (Figma `58:112`), không còn là màn quét mặt.
- **Mỗi lần mở web (mỗi phiên)**: màn đầu tiên vẫn là màn chào + quét mặt như hiện tại. Quét xong → phát nhạc.
- Sau đó màn quét **thu thành icon `bi:record-circle`** trên header (bên trái "Explore Premium"). Bấm icon = quét lại.
- **Khi người dùng đang lướt** (trang chủ, playlist, thống kê…) camera **không tự bật**; hết bài thì NYX chọn bài tiếp theo theo **cảm xúc quét gần nhất**.
- Trang thống kê cảm xúc (đang ở `/mood`) là **trang riêng** `/stats`, không gắn với logo AI. Logo AI để dành cho phần 2 (trợ lý giọng nói).
- Hộp nhạc Pi: **để sau**, không nằm trong phần này.

## 2. Màn hình và đường dẫn

| Đường dẫn | Hiện gì |
|---|---|
| `/` | Phiên **chưa quét**: màn chào (nút Start) → quét mặt / chọn cảm xúc. Phiên **đã quét**: trang chủ duyệt nhạc (`BrowsePage`) |
| `/scan` | Màn quét mặt / chọn cảm xúc (mở bằng icon record-circle) |
| `/now-playing` | Màn phát lớn hiện tại (tên bài, lời gợi ý, sóng âm, Up next, hàng đợi). Mở bằng: bấm ảnh/tên bài ở thanh phát dưới, hoặc tự chuyển tới sau khi quét xong |
| `/playlist/:id` | Giữ nguyên |
| `/stats` | Trang thống kê cảm xúc (đổi tên từ `/mood`, nội dung giữ nguyên) |
| `/survey`, `/login`, `/register`, `/settings` | Giữ nguyên |

"Phiên đã quét" = `sessionStorage['emotune_scanned']` (đóng tab là mất → lần mở sau lại quét trước).

## 3. Luồng chính

1. Mở web → `/` → màn chào → Start → quét (hoặc chọn cảm xúc bằng tay khi không có camera) → có bài → ghi `emotune_scanned`, lưu **cảm xúc gần nhất** `{ emotion, at }` → chuyển `/now-playing`, nhạc phát.
2. Bấm Home → `/` giờ là trang chủ duyệt nhạc; nhạc vẫn chạy ở thanh dưới (giữ cơ chế "bộ phát luôn sống" hiện có).
3. **Hết bài ở chế độ cảm xúc**:
   - đang ở `/scan` → quét lại như cũ;
   - người dùng **đang rảnh** (≥ 60 giây không chuột / bàn phím / chạm / cuộn; sau này phần 2 thêm "không nói gì") → coi như đang nghe thụ động → **tự chuyển `/scan` và quét lại**;
   - còn lại (đang lướt) → **không mở camera**: gọi `POST /suggest { emotion: cảm xúc gần nhất }` rồi phát bài trả về.
4. Icon record-circle trên header:
   - viền màu theo cảm xúc gần nhất (màu vibe đang dùng ở trình phát);
   - rê chuột: "Mood: Sad · scanned 12 min ago"; chưa quét: "Scan my mood";
   - cảm xúc cũ hơn **30 phút** → icon nhấp nháy nhẹ (nhắc quét lại);
   - bấm → `/scan`.

## 4. Trang chủ duyệt nhạc (`/`, Figma `58:112`)

Nền khung `#1a1a1a`, bo 20px. Thẻ bài 200×200 bo 8, nền mặc định `#211c2b`, tên bài DM Sans 14 Medium trắng, ca sĩ 12 `#a79fc9`, khoảng cách thẻ 26px; trên màn hẹp các hàng cuộn ngang.

| Mục (Figma) | Trên web | Dữ liệu |
|---|---|---|
| Chip All / Music / Podcasts | **All / pop / ballad / rap / thư giãn** | `GET /genres`; lọc các hàng bài hát bên dưới |
| Getting started: banner + 3 thẻ | Banner **"CREATE YOUR OWN PLAYLIST"** (ảnh nền tím từ Figma, font Jomolhari; nút "Browse" = tạo playlist rồi mở trang playlist; "Show more tips" = mở `/survey` để chỉnh gu) + **3 playlist của bạn** | `GET /playlists`, `POST /playlists` |
| Popular albums and singles | **Made for you** — 5 bài hợp gu nhất | **API mới** `GET /songs/for-you` |
| Popular artists | **Popular artists** — vòng tròn 200px | `GET /artists`; bấm = phát các bài của ca sĩ đó như một playlist tạm |
| New releases for you | **Recently added** — 5 bài mới thêm vào kho | `GET /songs` (sắp `id` giảm dần) |
| "Bật các playlists này lên…" | **Your playlists** | `GET /playlists` |
| Thẻ podcast lớn `#471824` | **Your mood this week** — tóm tắt (số lần quét, cảm xúc nhiều nhất, Cheer-up mode) + nút mở `/stats` | `GET /mood-history` |

Bấm thẻ bài = phát bài đó (như ô tìm kiếm). Rê chuột thẻ → nút ▶ tròn tím ở góc. Thẻ không có ảnh ca sĩ → nền màu theo vibe bài + ♪.

### API mới: `GET /songs/for-you` (cần đăng nhập)
Điểm mỗi bài = **tổng điểm nghe thật** của người này cho bài đó (`preferences.score`, mọi cảm xúc) + **điểm thưởng khảo sát** (`TASTE_BONUS` hiện có: +0.5 ca sĩ, +0.5 thể loại). Sắp giảm dần, hoà điểm thì bài mới trước; trả tối đa 10 bài, cùng dạng `song` với `/songs`, thêm `score`. Người mới chưa có dữ liệu → toàn 0 → ra theo thứ tự mới nhất (vẫn hiển thị được).

## 5. Thay đổi cấu trúc code

- `HomePage` (đang giữ trình phát + quét) tách thành:
  - **`PlayerHost`** — luôn được `MainLayout` vẽ; giữ trạng thái phát (chế độ cảm xúc / playlist, hàng đợi), vẽ thanh phát dưới, và vẽ khung phát lớn khi ở `/now-playing`.
  - **`ScanPage`** — màn chào + `EmotionScanner` (dùng ở `/` khi phiên chưa quét và ở `/scan`). Có kết quả → báo `PlayerHost` phát.
  - **`BrowsePage`** — trang chủ duyệt nhạc.
- Hook **`useIdle(60000)`** (`src/hooks/useIdle.js`): nghe `mousemove`, `mousedown`, `keydown`, `touchstart`, `wheel`, `scroll` trên `window`; trả hàm `isIdle()` (đọc thời điểm tương tác cuối, không render lại mỗi lần chuột động).
- `PlaybackProvider` thêm: `lastMood { emotion, at }` (đồng thời lưu `sessionStorage`), `startFromScan(result)`, `playQueue({ name, songs }, startIndex)` (dùng cho "phát các bài của ca sĩ"; `playPlaylist(id)` gọi lại hàm này sau khi tải playlist).
- Header: thêm nút record-circle (icon vẽ theo Bootstrap Icons `record-circle`, 30px, trắng); thứ tự bên phải: **record-circle → Explore Premium → chuông → tài khoản → Log out**, cách đều 20px, cùng căn giữa dọc. Logo AI tạm chưa làm gì (phần 2). Bấm tên tài khoản → `/stats`.
- Thanh phát dưới: bấm ảnh/tên bài → `/now-playing`.

## 6. Lỗi và trường hợp biên

- Không có camera ở `/` lần đầu → hiện 5 nút chọn cảm xúc (đã có).
- `/suggest` lỗi khi tự chọn bài tiếp → chuyển sang `/scan` để người dùng chọn lại (không im lặng dừng nhạc).
- Vào thẳng `/now-playing` khi chưa có bài → chuyển về `/`.
- Playlist / ca sĩ không có bài → nút phát mờ đi.
- Trang chủ khi kho trống hoặc API lỗi → mỗi hàng hiện dòng chữ nhỏ "Couldn't load…" thay vì vỡ trang.

## 7. Kiểm tra

- Backend: unit test cho hàm thuần tính điểm "for you" (nếu tách được khỏi SQL) + curl `GET /songs/for-you` với tài khoản có/không có khảo sát.
- Frontend: lint + build; Playwright: (a) phiên mới → màn quét → phát → `/now-playing`; (b) Home → trang chủ, nhạc không dừng; (c) hết bài khi đang ở trang chủ và vừa động chuột → bài mới tự phát, không bật camera, không gọi `/scan-and-suggest`; (c2) hết bài sau > 60 giây không động chuột → tự chuyển `/scan`; (d) bấm record-circle → `/scan`; (e) chip thể loại lọc đúng; (f) bấm ca sĩ → phát hết bài của ca sĩ; (g) màn 390px không tràn ngang.

## 8. Ngoài phạm vi

Trợ lý giọng nói (phần 2), hộp nhạc Pi / Task 6–7, trang ca sĩ riêng, album/podcast thật, 3 khung xám trống trong Figma.
