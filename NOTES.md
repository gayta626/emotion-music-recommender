# NOTES.md — EmoTune Project Session Log

> Tóm tắt phiên làm việc gần nhất (25–26/09/2026) để phiên mới tiếp tục ngay.
> Deadline dự án: **15/10/2026**. Báo cáo Pi cho thầy: **Thứ 2 (28/09)**.
> Vòng lặp cốt lõi đã chạy được **trên laptop**. Việc tiếp theo: **đưa lên Pi**.
> Người dùng muốn **tự code**, Claude hướng dẫn từng nhiệm vụ nhỏ (gợi ý, không đưa code sẵn) trừ khi được nhờ làm trực tiếp.

---

## 1. Mục tiêu của phiên này
- Khép vòng lặp trên laptop: camera → cảm xúc → gợi ý → **phát nhạc** → đo thời gian nghe → `/listen-report` → quét lại.

## 2. Những việc đã làm xong
### Backend `emotune-backend/`
| File | Nội dung |
|---|---|
| `db/schema.sql` | 4 bảng. `songs.file_path` giờ **UNIQUE**. ⚠️ Có `DROP TABLE` ở đầu. |
| `db/seed.sql` | **10 bài thật** (2 bài × 5 cảm xúc), `ON CONFLICT (file_path) DO NOTHING` nên chạy lại không nhân đôi. |
| `scripts/rename-music.js` (mới) + `npm run rename-music [-- --apply]` | Đổi tên mp3 trong `music/` sang dạng `noi_nay_co_anh.mp3`. Mặc định chạy thử, `--apply` mới đổi thật. |
| `src/server.js` | `app.use("/music", express.static(...music))`. |
| `music/` | 10 mp3 đã đổi tên (**không có trong git**, `music/.gitignore`). |
| `src/services/suggestService.js` | `generateSuggestion` trả thêm `emotion: targetEmotion`. |
| `src/model/suggestModel.js` | `getMoodTrend` chỉ đếm `action = 'suggested'` (trước đó đếm cả good/bad nên lệch). |

Phân loại nhạc: happy = co_chac_yeu_la_day, muon_roi_ma_sao_con · sad = gia_nhu, kho_giu_chan_thanh · angry = meditation, reduce_stress (nhạc thư giãn) · surprise = blank_space, cilu · neutral = giac_mo_co_that, neu_nhu_ta_chang_con_feat_a_ap_uot_mi.

### Frontend `emotune-frontend/src/`
| File | Nội dung |
|---|---|
| `config.js` (mới) | `API_URL = "http://localhost:8080"`. Lên Pi chỉ sửa 1 chỗ này. |
| `components/EmotionScanner.jsx` | Dùng `API_URL`. Cờ `cancelled` trong cleanup để camera trả về trễ (StrictMode) vẫn bị tắt. |
| `components/MusicPlayer.jsx` (mới) | Props `{data, onFinish}`. `<audio autoPlay controls>`, nút **⏭ Bài tiếp**. `finishAndSend`: **số giây thực nghe** = tổng `audio.played` (tua không tính), `finishPercent = min(listened/duration, 1)` (NaN → 0), gửi `/listen-report`, `.finally(onFinish)`. `reportedRef` chống gửi trùng. `onError` (thiếu file) → bỏ qua, không chấm điểm. |
| `pages/HomePage.jsx` | Nút **▶ Bắt đầu** (Chrome chặn autoplay khi chưa có thao tác). `{!suggestResult && <EmotionScanner/>}`: đang phát thì gỡ scanner (cleanup tắt camera). `setSuggestResult(prev => prev ?? data)` bỏ kết quả về trễ. Không thấy mặt → hiện `notice`, không crash. `playNextSong` → `setSuggestResult(null)`. |

## 3. Các quyết định quan trọng và lý do
| Quyết định | Lý do |
|---|---|
| `finishPercent` tính theo **giây thực nghe** (`audio.played`), không phải `currentTime` | Ý của người dùng: tua tới cuối không được tính là nghe hết (good). |
| Không chia thư mục con trong `music/` | Cảm xúc lấy từ cột `songs.emotion`, file chỉ cần khớp `file_path`. |
| Tự động hoàn toàn: có bài → gỡ scanner; hết bài/Next → report → quét lại | Hợp với Pi không có người bấm, không ghi rác `suggested` mỗi 3 giây. |
| `/listen-report` gửi `targetEmotion` | `preferences` được tra theo targetEmotion. |
| Chỉ Play/Pause (controls) + Next, không có nút 👎 | Next sớm (<40%) đã là `bad`. |

## 4. Cách chạy lại
```bash
# DB (DBeaver: mở file -> Alt+X): db/schema.sql rồi db/seed.sql
# Backend (.env: PORT=8080, DB_HOST=localhost, DB_PORT=5432, DB_USER=postgres, DB_NAME=postgres)
cd emotune-backend && npm run dev
# Flask AI (:5000)
cd emotion-scanner && venv\Scripts\activate && python 3_backend_server.py
# Frontend (:5173)
cd emotune-frontend && npm run dev
```
Test: bấm Bắt đầu → nhìn camera → nhạc phát, đèn webcam tắt → Next sớm → `bad` trong `mood_history`.
Console `document.querySelector("audio").playbackRate = 16` để nghe nhanh hết bài → `good`.

## 5. Lỗi đang gặp / việc còn dở
- ❗ **Chưa test end-to-end trên trình duyệt** sau khi thêm nút Bắt đầu / Next (đã qua eslint + build).
- ❗ DB local đang chạy bản schema cũ (chưa UNIQUE `file_path`) → chạy lại `schema.sql` + `seed.sql`.
- ESLint warning: `EmotionScanner` useEffect thiếu dependency `onResult` (vô hại).
- Chưa có style/giao diện đẹp cho player; `Setting.jsx` vẫn placeholder.

## 6. Bước tiếp theo — lên Pi (192.168.1.191, check `hostname -I`)
1. `cd ~/emotion-music-recommender && git pull && git lfs pull` (model `emotion-scanner/my_emotion_model/model.safetensors` ~328MB).
2. Chạy `emotune-backend/db/schema.sql` + `seed.sql` (thay schema gõ tay bằng nano cũ).
3. Từ laptop: `scp -r emotune-backend/music <user>@192.168.1.191:~/emotion-music-recommender/emotune-backend/`.
4. Python venv + cài thư viện → `python 3_backend_server.py`, check `GET :5000/health`.
5. Backend `npm install && npm start`; frontend `npm install && npm run dev -- --host`.
   `API_URL`: mở trình duyệt trên Pi → giữ `localhost`; mở từ máy khác → `http://192.168.1.191:8080`.
6. **Đo độ trễ AI trên Pi** (rủi ro lớn nhất; nếu > 3s thì request dồn → tăng interval quét).
7. Nếu còn thời gian: GPIO (`gpiozero`), loa Bluetooth (`bluetoothctl`).
8. Sau báo cáo: Mood Journey chart, voice control, trang Settings, style player.
