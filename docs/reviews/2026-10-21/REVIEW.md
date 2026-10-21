# Rà soát business logic và UI EmoTune — 21/10/2026

> **Trạng thái (21/10 tối): đã sửa cả 7 lỗi**, chi tiết ở `NOTES.md` phiên 21/10 (tối). `reproduce.cjs` khẳng định hành vi lỗi cũ nên giờ báo sai là đúng; test hồi quy mới: `emotune-backend/test/moodFix.test.js`, `emotune-frontend/test/listenSpans.test.js`.

## Kết quả

Phát hiện **7 lỗi có tình huống tái hiện**. Một lỗi được xác minh trực tiếp trên trình duyệt; sáu lỗi được tái hiện bằng source hiện tại với dependency/state giả lập, không ghi vào DB thật. Chưa sửa source ứng dụng.

Kiểm tra nền: **177/177 test backend**, **9/9 test frontend**, `npm run lint` thành công, `npm run build` thành công. Build có cảnh báo bundle JS lớn hơn 500 kB, không phải lỗi nghiệp vụ.

## 1. P2 — Đổi tài khoản vẫn dùng cảm xúc của tài khoản trước

- Vị trí: `emotune-frontend/src/utils/moodSession.js:3–4`, `emotune-frontend/src/contexts/AuthProvider.jsx:18–20`.
- Tái hiện: A quét/chọn cảm xúc sad → đăng xuất → B đăng nhập trong cùng tab. `logout()` chỉ xóa token; `emotune_last_mood` và `emotune_scanned` vẫn còn, không phân biệt tài khoản.
- Thực tế: script chạy hàm lưu mood và logout thật; khi chuyển token sang B, `loadLastMood()` vẫn trả sad, `hasScanned()` vẫn true.
- Ảnh hưởng: B bị bỏ qua màn giới thiệu/quét đầu phiên và các gợi ý tiếp theo có thể dựa trên cảm xúc của A. PlaybackProvider đọc mood này lúc khởi tạo; PlayerHost dùng nó cho `/suggest`.
- Sửa đề xuất: xóa trạng thái phiên lúc logout và khi tài khoản đổi, hoặc lưu theo user ID; xử lý cả trường hợp token hết hạn.

## 2. P2 — Nghe liên tục qua MP3 và MV bị chấm thiếu

- Vị trí: `emotune-frontend/src/components/MusicPlayer.jsx:343–354`.
- Tái hiện: bài/MV cùng dài 200 giây; nghe 100 giây đầu bằng MP3, chuyển MV và nghe 100 giây cuối.
- Mong đợi: đã nghe trọn bài, tỷ lệ 1.0 → điểm +1.
- Thực tế: `listenedFraction()` lấy `max(0.5, 0.5)` = **0.5**, backend chỉ cộng **0.3**. Script chạy nguyên hàm lấy từ component với trạng thái media giả lập.
- Ảnh hưởng: học gu và tỷ lệ nghe hết bài sai khi đổi chế độ phát.
- Sửa đề xuất: theo dõi các đoạn đã nghe trên cùng trục tiến độ bài, hợp nhất đoạn giao nhau giữa MP3/MV/karaoke rồi tính tỷ lệ.

## 3. P2 — View playlist không mở hàng đợi ở trang nghệ sĩ/trang khác

- Vị trí: `emotune-frontend/src/components/MusicPlayer.jsx:698–700,861`; `emotune-frontend/src/pages/HomePage.scss:63–70`.
- Đã tái hiện trên trình duyệt bằng tài khoản mẫu `demo30`:
  1. Mở Ed Sheeran, bấm **Play Ed Sheeran**.
  2. Vẫn ở `/artist/47`, bấm **Playlist options → View playlist**.
  3. Menu đóng nhưng hàng đợi không hiện: kiểm tra visibility trả false.
  4. Bấm **Open now playing**: cùng hàng đợi hiện ra, visibility trả true.
- Nguyên nhân: QueuePanel nằm trong `.player-stage`, trong khi CSS đặt vùng này `display: none` khi không ở `/now-playing`.
- Sửa đề xuất: mở hàng đợi qua portal ngoài vùng bị ẩn, hoặc điều hướng tới Now playing khi chọn View playlist.
- Bằng chứng: [Hàng đợi bị ẩn](queue-hidden.jpg), [Hàng đợi hiện ở Now playing](queue-visible-now-playing.jpg).

## 4. P2 — Sửa cảm xúc thất bại làm mất lịch sử và không thể thử lại cùng lượt quét

- Vị trí: `emotune-backend/src/services/moodFixService.js:62–67`.
- Tái hiện: có scanId và historyId; chọn mood không có bài phù hợp (hoặc chọn bài mới gặp lỗi DB).
- Thực tế: service xóa scan khỏi Map, xóa suggestion cũ trước khi tạo suggestion mới. Script giả lập không có bài: lần đầu trả 404, history cũ đã bị xóa; thử lại cùng scanId trả 410.
- Ảnh hưởng: lịch sử cảm xúc bị mất; frontend phải fallback sang `/suggest`, mất liên kết với dự đoán AI ban đầu và thông tin correction.
- Sửa đề xuất: tạo/thay thế suggestion trong transaction, chỉ tiêu thụ scan khi thành công; giữ scan để thử lại khi lỗi. Cần kiểm soát hai request sửa đồng thời.

## 5. P2 — Một lần lỗi mạng khiến ô tìm kiếm không thử tải lại

- Vị trí: `emotune-frontend/src/components/HeaderSearch.jsx:19–21`.
- Tái hiện: lần đầu focus ô tìm kiếm, `/songs` lỗi tạm thời → mạng phục hồi → focus/gõ lại.
- Thực tế: catch gán `songs = []`; lần sau `if (songs) return` luôn đúng vì mảng rỗng là truthy. Script mô phỏng hai lần focus chỉ ghi nhận một request.
- Ảnh hưởng: UI báo không có bài phù hợp dù kho nhạc có dữ liệu; chuyển trang trong cùng MainLayout không khởi tạo lại HeaderSearch, thường phải reload.
- Sửa đề xuất: phân biệt trạng thái chưa tải/lỗi/danh sách rỗng; cho thử lại và hiện thông báo lỗi tải thay vì “No song matches”.

## 6. P2 — Listen-report nhận dữ liệu tiến độ sai nhưng vẫn cập nhật điểm

- Vị trí: `emotune-backend/src/controllers/listenReportController.js:4–7`.
- Tái hiện: gửi emotion/songId hợp lệ, nhưng bỏ `finishPercent`, gửi null, chuỗi `abc` hoặc object.
- Thực tế với controller/service thật và model giả lập:
  - Bỏ trường, `abc`, `{}`: HTTP 200, cộng 0.3.
  - null: HTTP 200, trừ 1.
- Nguyên nhân: chỉ so sánh `< 0` và `> 1`; ép kiểu JavaScript cho phép dữ liệu sai lọt qua.
- Ảnh hưởng: ghi lịch sử và học gu từ báo cáo không hợp lệ. Trình phát bình thường gửi số, nên lỗi này nằm ở hợp đồng API/khả năng xử lý client lỗi.
- Sửa đề xuất: bắt buộc `typeof finishPercent === 'number'`, `Number.isFinite`, phạm vi [0,1]; kiểm tra emotion và songId trước khi ghi.

## 7. P2 — Scan quá 30 phút vẫn được chấp nhận nếu không có lượt quét mới

- Vị trí: `emotune-backend/src/services/moodFixService.js:32–43,57–62`.
- Tái hiện: nhớ một scan, cho đồng hồ tiến quá `SCAN_TTL_MS`, không gọi `rememberScan()` thêm, rồi sửa mood.
- Mong đợi: HTTP 410 để frontend dùng fallback.
- Thực tế: service vẫn trả bài. Dọn scan hết hạn chỉ chạy khi có scan mới; `fixMood()` không kiểm tra `scan.at`.
- Ảnh hưởng: sửa kết quả cũ ngoài thời hạn thiết kế; dữ liệu ảnh trong RAM cũng có thể tồn tại quá 30 phút khi hệ thống không nhận scan mới.
- Sửa đề xuất: kiểm tra tuổi scan khi truy cập và dọn định kỳ để thực thi cả thời hạn lưu trong RAM.

## Phạm vi và cách kiểm tra lại

- Đã thử UI: đăng nhập tài khoản mẫu, tìm kiếm, phát/tạm dừng bài, trang nghệ sĩ, phát hàng đợi, mở menu hàng đợi và Now playing. File nhạc được phát thành công. Không chụp mặt, không đổi quyền tài khoản, không chỉnh dữ liệu thư viện.
- Script tái hiện gọi controller/service bằng VM với dependency giả; các hàm frontend được lấy nguyên văn từ file source, mock state/media/storage. Đây là bằng chứng ở mức logic, không thay thế toàn bộ kiểm thử tích hợp với PostgreSQL/trình duyệt.
- Chưa kiểm thử đầy đủ: camera/AI thực tế, micro/nhận dạng giọng nói, phát YouTube thật, karaoke qua microphone, các thao tác ghi của admin, mọi kích thước màn hình. Không kết luận toàn project chỉ có bảy lỗi này.
- Chạy từ gốc repository: `node docs/reviews/2026-10-21/reproduce.cjs`. Script không cần DB, không dùng credentials và không sửa dữ liệu. Các assertion xác nhận hành vi lỗi hiện tại; sau khi sửa đúng, chúng có thể thất bại và cần chuyển thành regression test cho hành vi mong đợi.
- Kết quả chạy lưu ở [reproduction-results.json](reproduction-results.json).

Ưu tiên sửa: cách ly mood giữa tài khoản, tính tỷ lệ nghe, hiển thị hàng đợi; tiếp theo là luồng sửa mood và xử lý lỗi đầu vào/mạng.
