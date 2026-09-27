# Kế hoạch: EmoTune thành "hộp nhạc cảm xúc" — Giai đoạn 1: LED RGB + 2 nút (demo 28/09)

## Context
Demo ngày mai chạy tốt (hotspot `gayta626`, 3 server trên Pi, loa BT) nhưng Pi lúc này chỉ là "máy tính nhỏ":
vẫn cần màn hình, chuột, trình duyệt → phần cứng chưa có ý nghĩa. Đã chốt hướng **A + C**: biến đồ án thành
một **thiết bị** tương tác vật lý (đèn báo cảm xúc, nút bấm, ảnh xử lý tại chỗ, không rời thiết bị).
Linh kiện có sẵn: **LED RGB + điện trở + dây**, **nút bấm + breadboard**. Cần có phần cứng chạy được **ngày mai**.

**Giai đoạn 1 (hôm nay → demo mai):** LED RGB báo trạng thái/cảm xúc + 2 nút vật lý điều khiển nhạc.
**Giai đoạn 2 (sau demo, trước 15/10):** tự khởi động khi cắm điện (systemd + Chromium kiosk), không cần VNC;
có thể thêm PIR / màn OLED nếu mua được. Giai đoạn 2 viết spec riêng sau.

## Thiết kế

### Phần cứng (đã duyệt Phần 1, thêm nút 2)
| Linh kiện | Chân Pi (số vật lý) |
|---|---|
| LED R / G / B | GPIO17 (11) / GPIO27 (13) / GPIO22 (15), mỗi màu 1 điện trở 220–330Ω |
| Chân chung LED | GND (9) nếu catot chung; 3.3V (1) nếu anot chung |
| Nút 1 — Bắt đầu / Bài tiếp | GPIO5 (29) ↔ GND (30), pull-up trong |
| Nút 2 — Tạm dừng / Phát tiếp | GPIO6 (31) ↔ GND (34), pull-up trong |
⚠️ Tắt Pi trước khi cắm/rút dây.

### Trạng thái đèn
| Trạng thái | Đèn |
|---|---|
| Chưa bắt đầu | tắt |
| Đang quét (camera bật) | **trắng nhấp nháy** — đèn báo camera (ý C: riêng tư) |
| Đang phát | màu cảm xúc: happy vàng · sad xanh dương · angry đỏ · surprise tím · neutral trắng |

### Kiến trúc — service GPIO riêng, frontend gọi trực tiếp
Trình duyệt chạy ngay trên Pi (`localhost`) nên frontend gọi thẳng `http://localhost:5001`. **Backend Node không đổi.**
Service không chạy (trên PC) → fetch lỗi → bỏ qua im lặng, web vẫn chạy như cũ.

1. **`gpio-service/gpio_service.py`** (mới, ~60 dòng) — Flask + flask-cors + gpiozero, cổng 5001.
   - `RGBLED(17, 27, 22, active_high=...)`; biến môi trường `LED_COMMON_ANODE=1` để đảo nếu LED anot chung.
   - `Button(5)`, `Button(6)` (pull-up mặc định); `when_pressed` tăng bộ đếm `next_count` / `pause_count`.
   - `POST /led {state}`: `off` | `scanning` (`led.blink` trắng) | 5 cảm xúc (`led.color = ...`); state lạ → 400.
   - `GET /buttons` → `{"next": n, "pause": m}` (bộ đếm tăng dần).
   - Chạy bằng **python3 hệ thống** của Pi OS (đã có gpiozero + lgpio cho Pi 5): `sudo apt install python3-flask python3-flask-cors`.
   - Test không có Pi: `GPIOZERO_PIN_FACTORY=mock`.
2. **`emotune-frontend/src/config.js`** — thêm `GPIO_URL = "http://localhost:5001"`.
3. **`emotune-frontend/src/hardware.js`** (mới)
   - `setLed(state)`: `axios.post(GPIO_URL/led)`, `.catch(() => {})`.
   - Hook `useHardwareButtons({ onNext, onPause })`: `setInterval` 300ms gọi `GET /buttons`; lần đầu chỉ lưu mốc,
     lần sau số tăng → gọi handler; lỗi bỏ qua; cleanup `clearInterval`. Handler giữ trong `useRef` để luôn dùng bản mới.
4. **`pages/HomePage.jsx`**
   - `useEffect([started, suggestResult])`: `!started` → `setLed('off')`; chưa có bài → `'scanning'`; có bài → `setLed(suggestResult.emotion)`.
   - `useHardwareButtons({ onNext: () => setStarted(true) })` — nút 1 thay nút ▶ Bắt đầu.
5. **`components/MusicPlayer.jsx`**
   - `useHardwareButtons({ onNext: finishAndSend, onPause: () => audio.paused ? audio.play() : audio.pause() })`.
   - Tái sử dụng `finishAndSend` sẵn có (đã có cờ `reportedRef` chống gửi 2 lần).

### Chromium trên Pi
Bấm nút vật lý không tính là "người dùng thao tác" → trình duyệt chặn tự phát nhạc. Mở Chromium bằng:
`chromium-browser --autoplay-policy=no-user-gesture-required --kiosk http://localhost:5173`
(nếu lệnh không có, thử `chromium`). Thoát kiosk: Alt+F4.

### Ngoài phạm vi giai đoạn 1
Tự khởi động (systemd), PIR, OLED, nút 👍, nút tắt camera, đổi backend.

## Phân công
**Claude viết code** (bước 3, 5, 7) và giải thích từng file. **Người dùng nối mạch** (bước 1–2) song song, chạy lệnh trên Pi (bước 4, 6).
Sau khi duyệt: lưu thiết kế vào `docs/superpowers/specs/2026-09-27-gpio-led-buttons-design.md`.

## Các bước làm
1. Xác định LED catot/anot chung: nối chân chung vào GND, thử 1 màu; không sáng → chuyển sang 3.3V.
2. Nối mạch theo bảng (Pi đã tắt).
3. Viết `gpio_service.py`, test trên PC với mock (curl `/led`, `/buttons`), commit.
4. Trên Pi: `git pull`, `sudo apt install python3-flask python3-flask-cors`, chạy `python3 gpio-service/gpio_service.py`,
   test `curl -X POST localhost:5001/led -H "Content-Type: application/json" -d '{"state":"happy"}'` → đèn vàng; bấm nút → `curl localhost:5001/buttons` tăng.
5. Viết `hardware.js`, sửa `config.js`, `HomePage.jsx`, `MusicPlayer.jsx`; test trên PC (không có service → web vẫn chạy bình thường).
6. Pi: `git pull`, chạy 4 service (thêm gpio-service), Chromium với cờ autoplay, test toàn luồng.
7. Cập nhật NOTES.md (mạch, cách chạy gpio-service, cờ Chromium), commit + push.

## Verification (trên Pi)
- Nút 1 lúc chưa bắt đầu → web bắt đầu, đèn trắng nhấp nháy, camera bật.
- Nhận mặt → nhạc phát ra loa BT, đèn đổi đúng màu cảm xúc.
- Nút 2 → nhạc dừng/phát tiếp. Nút 1 lúc đang phát → `mood_history` có dòng `bad`, đèn trắng nhấp nháy, quét lại.
- Tắt gpio-service → web vẫn chạy bình thường (chỉ mất đèn/nút).
- Trên PC: web chạy như cũ, không lỗi.
