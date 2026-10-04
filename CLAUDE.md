# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EmoTune: "hộp nhạc cảm xúc" — webcam chụp mặt → AI nhận diện cảm xúc → backend chọn bài hát hợp cảm xúc → web phát nhạc và chấm điểm theo mức nghe hết bài. Chạy trên Raspberry Pi (OLED + 2 nút chạm TTP223 + cảm biến có người) hoặc trên PC. `NOTES.md` là nhật ký phiên làm việc (trạng thái phần cứng, sơ đồ chân, việc còn dở); đọc nó trước khi đụng tới phần cứng.

### Một codebase, hai môn học

| Môn | Yêu cầu | Hệ quả khi code |
|---|---|---|
| **HIC** (deadline 15/10/2026) | Có phần cứng (Pi, OLED, nút chạm, cảm biến) | Dùng `gpio-service/`. Model AI: **thử Edge Impulse** để so với ViT. |
| **Xây dựng hệ thống thông minh** | Hệ thống có **> 2 module** và thể hiện được "sự thông minh"; **không cần phần cứng** | Phần mềm lõi (AI, backend, gợi ý, frontend) phải chạy **độc lập, không cần `gpio-service`**. Cần cải thiện model AI nghiêm túc (xem bên dưới). |

Vì vậy: đừng làm lõi phụ thuộc phần cứng (mọi lời gọi `gpio-service` đã `.catch(() => {})`, giữ như vậy). Các module "thông minh" của môn hệ thống thông minh: (1) nhận diện cảm xúc, (2) gợi ý nhạc (xu hướng cảm xúc 1–3 ngày + điểm sở thích học từ phản hồi nghe, và thiết kế "gợi ý theo gu" 65/35 chưa code), (3) giao diện/phản hồi người dùng.

## Model AI: kế hoạch build lại (đề xuất, chưa chốt)

Hiện trạng: ViT fine-tune từ FER2013, 10 người / 1.934 ảnh; chỉ **72.5%** trên người lạ, lớp `angry` chỉ 26% (bị đoán thành neutral), overfit mạnh (train loss 0.004), `load_best_model_at_end` không nạp bản tốt nhất, `dat` thiếu `surprise`. Số 92.5% cũ là ảo (chia theo ảnh).

- **HIC — Edge Impulse (thí nghiệm):** MobileNetV2 trên ảnh đã cắt mặt, để 2 người ở tập Testing như `VAL_PEOPLE`, so với 72.5% của ViT trên **cùng 2 người**. Chạy thẳng trên Pi. Không thay model chính khi chưa so xong. Xin phép từng người trước khi upload ảnh mặt lên cloud.
- **Hệ thống thông minh — cải thiện model:**
  1. *Dữ liệu*: thêm người (≥ 30) và trộn thêm bộ công khai (RAF-DB/AffectNet/FER+); soi lại nhãn `angry`; cân bằng lớp; mọi người đủ 5 cảm xúc.
  2. *Huấn luyện*: giữ chia theo người, thêm `GroupKFold` theo người; tăng augmentation (xoay, sáng, che mặt một phần), label smoothing, ít epoch + early stopping; sửa `metric_for_best_model` để thật sự nạp checkpoint tốt nhất; có thể đóng băng các lớp đầu.
  3. *Đánh giá*: báo **macro-F1 + confusion matrix theo từng người lạ**, không chỉ accuracy; ghi vào `AI_NOTES.md` (đang cũ).
  4. *Suy luận (thể hiện thông minh)*: gộp xác suất qua N khung hình liên tiếp thay vì 1 ảnh, ngưỡng tin cậy → trả "chưa chắc" thay vì đoán bừa, test-time augmentation (lật ngang).
  5. *Tuỳ chọn*: thêm kênh thứ hai (giọng nói qua mic hoặc văn bản) rồi hợp nhất — chỉ khi còn thời gian.

## Cách làm việc với người dùng (quan trọng)

Người dùng **tự code phần frontend và backend** để hiểu hệ thống; Claude là **người hướng dẫn**, không phải người viết code chính.

- **Không tự viết/sửa logic** (React component, state, gọi API, route/controller/service/model, SQL, AI) trừ khi được yêu cầu rõ ràng. Thay vào đó: giải thích khái niệm, chỉ file cần sửa, gợi ý từng bước, review code người dùng viết, chỉ lỗi và gợi ý hướng sửa.
- **Claude được làm thay** các việc không cốt lõi: viết **CSS/SCSS** (bố cục, màu, kích thước theo Figma), tải asset, cấu hình lặt vặt, tài liệu (`CLAUDE.md`, `NOTES.md`), script phụ. Khi làm giao diện: người dùng viết JSX/cấu trúc, Claude viết style khớp với class name họ đặt.
- Giải thích ngắn gọn bằng tiếng Việt, từng bước một; khi người dùng nhờ "cách làm" thì đưa hướng đi + ví dụ nhỏ, không dán cả file hoàn chỉnh.
- **Mỗi bước hướng dẫn phải kèm một chú thích nhỏ** (2–3 dòng) trả lời: *đang làm gì* và *có ý nghĩa gì cho hệ thống* (nó phục vụ tính năng nào, dữ liệu đi đâu tiếp theo, thiếu nó thì hệ thống bị gì). Ví dụ: "📌 Model chỉ lấy dữ liệu thô từ DB → service sẽ biến nó thành dạng frontend cần. Tách riêng để sau này đổi DB không phải sửa logic."
- Hướng dẫn **từng file / từng bước một**, chờ người dùng viết xong và gửi code để review rồi mới sang bước sau.
- **Cần đến đâu viết đến đó**: chỉ hướng dẫn viết hàm/file khi bước hiện tại **thật sự dùng tới nó**, không bảo viết trước cho "đủ bộ" (vd không viết `findUserById` lúc làm đăng ký/đăng nhập, để đến lúc làm `GET /auth/me` mới viết). Người dùng muốn tư duy theo kiểu "cần cái gì thì tạo cái đó" để hiểu lý do tồn tại của từng hàm. Plan có liệt kê hàm ở task trước thì dời sang task dùng nó.
- **`TIEN_DO.md` (gốc repo) là bảng tiến độ của người dùng**: mỗi khi người dùng xong một phần (một bước/task, đã kiểm tra chạy đúng), Claude đánh dấu ✅ + ngày, chuyển 🔄 sang việc tiếp theo, cập nhật mục "📍 Đang ở đâu", bảng tổng quan và "Nhật ký hoàn thành". Việc mới phát sinh thì thêm dòng vào đúng giai đoạn.
- Lưu ý lịch sử: ở phiên 03/10 Claude đã chỉnh Header/SideBar/MainLayout (đã có sẵn do người dùng viết) cho khớp Figma và viết `GET /artists` (model/service/controller/route + SideBar gọi API). Người dùng bảo bỏ qua, không cần làm lại; từ nay chỉ hướng dẫn.

## Kiến trúc: 4 service chạy riêng, nối bằng HTTP

```
Trình duyệt (React :5173) ──► emotune-backend (Node/Express :8080) ──► emotion-scanner (Flask :5000, model ViT)
        │                              │
        │                              └─► PostgreSQL
        └──────────────► gpio-service (Flask :5001, chỉ chạy trên Pi: OLED + nút + PIR)
```

- **emotion-scanner/** (Python): `3_backend_server.py` là Flask `POST /predict` (nhận ảnh base64 → cắt mặt bằng OpenCV → model HuggingFace ở `my_emotion_model/`, lưu bằng Git LFS). `1_capture_data.py` thu ảnh, `2_finetune_model.py` train, `analyze_confusion.py` đánh giá. Train/val **chia theo người** (tên người lấy từ tên file `<ten>_<camxuc>_<timestamp>.jpg`), không chia theo ảnh, nếu không số liệu bị ảo. Năm nhãn: neutral, happy, sad, angry, surprise. Dùng `PYTHONUTF8=1` trên Windows.
- **emotune-backend/** (Node, Express 5, `pg`): theo mẫu `routes/web.js → controllers → services → model` (model là nơi duy nhất chứa SQL, dùng `config/db.js`). Luồng chính `POST /scan-and-suggest`: `scanController` → `emotionService` (gọi Flask) → `suggestService.generateSuggestion` (xét xu hướng cảm xúc 1–3 ngày, chọn bài, bài "động viên" khi buồn/giận kéo dài) → trả `{song, message, isEncourage}`. `GET /artists` (bảng `artists`: `id, name, avatar`) cấp danh sách nghệ sĩ cho sidebar, ảnh ở `emotune-backend/avatars/` phục vụ qua `/avatars/<file>`. `POST /listen-report` cập nhật điểm sở thích (bảng `preferences`) và `recently_played` để tránh lặp 3 bài gần nhất. `/music/<file>` phục vụ mp3 từ `emotune-backend/music/`. Toàn bộ bảng + dữ liệu mẫu nằm trong **một file `db/setup.sql`**; cấu hình DB qua `.env` (xem `.evn.example`; `config/db.js` mặc định cổng 5433 nên `.env` phải ghi `DB_PORT`). 10 bảng: `artists`, `genres`, `songs` (khoá ngoại `artist_id` → `artists`, `genre_id` → `genres`; không còn cột chữ `artist`, query trả tên ca sĩ bằng `LEFT JOIN artists a ... a.name AS artist`), `preferences`, `mood_history`, `recently_played`, `survey_artists`, `survey_genres` (5 bảng này có `user_id` → **mọi câu SQL đụng tới phải lọc/ghi `user_id`**), `users` (username + `password_hash` bcrypt, `survey_done_at` NULL = chưa làm khảo sát gu; tài khoản demo `demo`/`demo1234`), `devices` (dòng `'box'`, `current_user_id` = ai đang giữ hộp nhạc). Đăng nhập bằng JWT (`JWT_SECRET` trong `.env`); đang chuyển sang nhiều tài khoản theo plan `docs/superpowers/plans/2026-10-04-multi-user-accounts.md`. Spec "gợi ý theo gu" cũ ghi `songs.genre TEXT` — nay thể loại là bảng `genres`.
- **emotune-frontend/** (React 19 + Vite + **SCSS**, svgr, react-router 6; không dùng Tailwind): `MainLayout` (CSS grid: Header / SideBar / `<main>`) bọc các trang trong `pages/`. `HomePage` điều phối vòng lặp: Bắt đầu → `EmotionScanner` quét → có kết quả thì gỡ scanner (tắt camera) và hiện `MusicPlayer` → hết bài/bỏ qua thì quét bài mới. URL các service ở `src/config.js` (`API_URL`, `GPIO_URL`). Màu/token ở `:root` trong `src/index.css`. Giao diện theo Figma file `lycGTr71v02BpzYgjmZZS3` (node `58:14`).
- **gpio-service/** (Python, gpiozero + `oled.py` tự viết driver SSD1306): trình duyệt gọi thẳng `localhost:5001`, backend Node không biết service này. `POST /led {state}` vẽ chữ lên OLED (tên `/led` giữ từ bản dùng đèn LED); `GET /buttons` trả bộ đếm `{next, pause, present}` — web hỏi mỗi 300ms (`src/hardware.js`, `useHardwareButtons`). Việc đếm 30s "vắng người" nằm trong service, web chỉ đọc `present`. Service chết thì nhạc vẫn chạy (mọi lời gọi `.catch(() => {})`).

Spec/plan thiết kế nằm ở `docs/superpowers/` (đáng chú ý: gợi ý theo "gu" 65/35 — **đã thiết kế, chưa code**).

## Lệnh thường dùng

```bash
# AI (trong emotion-scanner/): python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt
# (requirements.txt khoá opencv-python 4.x: OpenCV 5 đã bỏ cv2.CascadeClassifier dùng để cắt mặt)
# Model nằm trong Git LFS: máy mới cần `git lfs pull` để có my_emotion_model/model.safetensors
python 3_backend_server.py                       # :5000
PYTHONUTF8=1 python 2_finetune_model.py          # ~4h CPU
PYTHONUTF8=1 python analyze_confusion.py

# Backend (trong emotune-backend/)
npm run dev                                      # nodemon, :8080 (PORT trong .env; mặc định code là 8081)
npm run db:setup                                 # XOÁ và tạo lại toàn bộ DB từ db/setup.sql (bảng + dữ liệu mẫu)
npm run rename-music -- --apply                  # chuẩn hoá tên file mp3 cho khớp cột file_path trong setup.sql

# Frontend (trong emotune-frontend/)
npm run dev                                      # :5173
npm run build
npm run lint

# GPIO (trong gpio-service/)
python3 gpio_service.py                          # :5001, trên Pi
GPIOZERO_PIN_FACTORY=mock python gpio_service.py # chạy thử trên PC, không cần phần cứng
python test_presence.py                          # test tự động logic có người/vắng (mock pin), in "ALL OK"
python3 test_hardware.py                         # thử nút + PIR trên Pi thật
```

Database: máy mới chạy `npm run db:setup` một lần (cần PostgreSQL + `.env`). File này **xoá sạch** điểm và lịch sử, nên khi DB đã có dữ liệu thật thì **không chạy lại**; thay đổi schema sau này viết thành file `db/migrate_xxx.sql` riêng (dùng `ALTER TABLE ... IF NOT EXISTS`) và cập nhật luôn `setup.sql` cho lần cài mới. Backend có unit test bằng `node:test` (`npm test` chạy `emotune-backend/test/**/*.test.js`, chỉ cho hàm thuần); frontend chưa có test; `eslint` hiện báo sẵn 1 lỗi ở `AIAssistantContext.jsx` và 1 cảnh báo ở `EmotionScanner.jsx` (có từ trước).

## Lưu ý

- Bốn service phải chạy cùng lúc mới có vòng lặp đầy đủ; trên Pi, Chromium cần cờ `--autoplay-policy=no-user-gesture-required` để nút chạm bắt đầu được nhạc.
- Trên Pi, code từng được chép bằng `scp` (không qua git) → trước khi `git pull` trên Pi xem mục 5 của `NOTES.md`.
- Model trong `my_emotion_model/` là model cũ (đang dùng để demo); model mới train lại không nằm trong git.
- Bình luận trong code và ghi chú dự án viết bằng tiếng Việt; người dùng là sinh viên, thích hướng dẫn từng bước rõ ràng.
