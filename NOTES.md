# NOTES.md — EmoTune Project Session Log

> Phiên gần nhất: **30/09 – 02/10/2026** (trên **laptop**, hostname `vinh`). Deadline dự án **15/10/2026**.
> Trạng thái: vòng lặp cốt lõi (camera → AI → nhạc → chấm điểm) **chạy trên Pi qua hotspot laptop**. **OLED** + **2 nút chạm TTP223** chạy trọn vòng với web ✅. **PIR HC-SR501**: code xong (chào trên OLED + vắng 30s thì tạm dừng nhạc) nhưng **cảm biến không đáng tin** (báo nhầm khi phòng trống, có lúc bỏ sót người ngồi yên) → định thay bằng radar **LD2410C**. Model AI trên Pi vẫn là **model cũ**. Code phiên này **đã commit + push lên `master` (02/10)**; Pi vẫn đang chạy bản chép bằng `scp`.
> Người dùng: sinh viên, cần hướng dẫn từng bước rõ ràng; phiên này nhờ Claude code trực tiếp. Lắp phần cứng: **mỗi tin nhắn 1 bước**, chờ người dùng báo xong; chỉ chân Pi theo kiểu **"hàng trên/dưới, chân thứ N"** tính từ lỗ ốc. Lệnh cho Git Bash phải **ngắn, mỗi lệnh 1 dòng** (lệnh dài bị cắt dòng).

---

## 1. Mục tiêu của phiên này (30/09 – 02/10)
1. Đọc `NOTES.md` + `graphify-out/GRAPH_REPORT.md`, tóm tắt việc đã làm / cần làm.
2. Lắp và chạy **2 module chạm TTP223** thay nút bấm cơ.
3. Thêm **cảm biến chuyển động PIR HC-SR501**: có người lại gần → OLED chào; vắng người 30s → tạm dừng nhạc, quay lại → phát tiếp.
4. Khi PIR không ổn: tìm cảm biến thay thế.

(Mục tiêu các phiên trước 27–28/09: mạng demo qua hotspot, GPIO/OLED, slide + kịch bản báo cáo 28/09, train lại AI chia theo người, thiết kế "gợi ý theo gu".)

## 2. Những việc đã làm xong

| Việc | File / kết quả |
|---|---|
| **Mạng demo** | Hotspot laptop `gayta626` (mật khẩu: xem Settings → Mobile hotspot, 2.4 GHz, **Share over = Wi-Fi**, **Power saving = Off**). Pi có connection NetworkManager `demo-hotspot` (priority 10) → tự vào hotspot. Gọi Pi bằng `raspberrypi.local` (IP hotspot `192.168.137.x`). Đã tập demo trọn vòng qua hotspot, OK. |
| **GPIO service** (commit `bc9eb8b`) | `gpio-service/gpio_service.py` (Flask :5001 + gpiozero: `POST /led {state}`, `GET /buttons` → bộ đếm `{next, pause}`); `emotune-frontend/src/hardware.js` (`setLed`, `useHardwareButtons` hỏi mỗi 300ms); sửa `config.js` (`GPIO_URL`), `pages/HomePage.jsx` (màu đèn theo trạng thái, nút 1 = Bắt đầu), `components/MusicPlayer.jsx` (nút 1 = bài tiếp, nút 2 = tạm dừng). Test bằng mock pin, **chưa test mạch thật**. Spec: `docs/superpowers/specs/2026-09-27-gpio-led-buttons-design.md`. |
| **Slide báo cáo** (commit `2d482ad`) | `docs/EmoTune_bao_cao_28-09.pptx` — 12 slide, có speaker notes, tạo bằng plugin **PPT Master**. Nội dung gốc `docs/slide-bao-cao-28-09.md` (⚠ slide 5 trong file .md đã cũ, .pptx mới đúng). Project PPT Master: `~/.claude/plugins/cache/ppt-master/ppt-master/projects/emotune_bao_cao_ppt169_20260927/`. |
| **Kịch bản thuyết trình** | `docs/script-thuyet-trinh-28-09.md` — checklist trước giờ, lời nói từng slide + thời gian, kịch bản demo 7 bước, 10 câu hỏi dự phòng. **Chưa commit.** |
| **Đo model cũ** (14/09, nền FER2013, 977 ảnh / 5 người) | Chia theo ảnh (cùng người): **92.5%** — ảo. Trên 4 người mới (mom, nhat, phuc, trung): **71.5%** (neutral 49%, sad 60%). |
| **Chia train/val theo người** (commit `585044a`) | `emotion-scanner/2_finetune_model.py` + `analyze_confusion.py`: `GroupShuffleSplit`, `VAL_PEOPLE = 2`, seed 42 → val = **ducvinh, vanquynh**. Tên người lấy từ tên file `<ten>_<camxuc>_<timestamp>.jpg`. |
| **Dữ liệu** (commit `c457776`) | **1.934 ảnh, 10 người** (thêm `dat`, 161 ảnh, **không có surprise**). vui 402 · buồn 405 · giận 403 · ngạc nhiên 322 · bình thường 402. |
| **Train lại** (~4h CPU) | Tốt nhất epoch 19 (`train_checkpoints/checkpoint-3629`): **72.5%** trên 2 người lạ — angry **26%** (→ neutral), happy 94, neutral 63, sad 84, surprise 95. Train loss 0.004 → overfit. |
| **Model** | `emotion-scanner/my_emotion_model/` = **model cũ** (khớp Git LFS, sha256 `3aae7340bd…`). Backup cũ: `Documents/HIC/model_backup_2026-09-14/`. Model mới: `Documents/HIC/model_new_2026-09-27_best/` (sha256 `8912cdaac7…`, **không** trong git). |
| **Thiết kế "gợi ý theo gu"** (commit `6cf8fc1`, `189a92e`) | Spec `docs/superpowers/specs/2026-09-27-taste-based-recommendation-design.md`, plan `docs/superpowers/plans/2026-09-27-taste-based-recommendation.md` (7 task). **Chưa code.** |
| Ghi chép AI | `AI_NOTES.md` (người dùng viết; số liệu 977 ảnh / 85% trong đó đã cũ). |
| Cài trên laptop | Plugin PPT Master (`/plugin install ppt-master@ppt-master`) + `pip install -r requirements.txt` của nó (cần `PYTHONUTF8=1`). |

### Phiên 28/09 (sáng)
| Việc | File / kết quả |
|---|---|
| **Slide tiếng Việt** | `docs/EmoTune_bao_cao_28-09.pptx`: điền tên (Nhóm 6 · Nguyễn Đức Vinh, Hoàng Tuấn Phát, Phạm Thế Vỹ · GV Nguyễn Trọng Kiên); slide "Gợi ý nhạc" đổi **65/35** (ghi rõ "bản nâng cấp, đang code"); thêm slide **"Gợi ý theo gu"** (3 nguồn: âm thanh / thẻ ID3 / nhãn tay + công thức điểm + ví dụ ballad). Sau đó **người dùng tự bỏ 3 slide** (AI nhận diện, Xử lý ảnh, Khó khăn) trong PowerPoint → còn **10 slide**; ⚠ số trang góc dưới vẫn ghi "/ 13", sửa tay nếu dùng. |
| **Slide tiếng Anh** | `docs/EmoTune_report_28-09_EN.pptx` — 10 slide đúng bản người dùng giữ lại, số trang "/ 10", speaker notes tiếng Anh, tiêu đề bìa "The Mood Music Box". Project PPT Master: `~/.claude/plugins/cache/ppt-master/ppt-master/projects/emotune_report_en_ppt169_20260928/` (bản VN: `.../emotune_bao_cao_ppt169_20260927/`, hiện 13 slide). |
| **Kịch bản thuyết trình** | `docs/script-thuyet-trinh-28-09.md` cập nhật theo bản 13 slide (thêm slide 8 "Gợi ý theo gu", 65/35, câu hỏi về librosa/kho nhạc). **Chưa khớp bản 10 slide**, chưa có bản tiếng Anh. |
| **Đã mua linh kiện** | Breadboard, dây đực–đực, dây đực–cái, **màn hình OLED**, **cảm biến chuyển động (PIR)** — xem "Checklist linh kiện" ở mục 4. |
| **Hỏi đáp (chưa làm gì)** | Micro: thử **micro có sẵn trong webcam C270** trước (`arecord -l`), cần thì mua mic USB mini. Loa: thay Bluetooth bằng **loa vi tính USB (tiếng qua USB)**. Edge Impulse: làm được (MobileNetV2, upload ảnh đã cắt mặt, để 2 người ở "Testing") — nên làm như **thí nghiệm so sánh** với ViT 72.5%, chưa thay model chính; lưu ý xin phép trước khi upload ảnh mặt lên cloud. |

### Phiên 28/09 (chiều) — lắp phần cứng
| Việc | File / kết quả |
|---|---|
| **Đèn LED RGB → bỏ** | LED là loại **anot chung** (chân chung phải nối 3.3V). Cắm trên breadboard bị lệch cột nhiều lần: chỉ lên được xanh dương, đỏ + xanh lá hở. Người dùng quyết định **bỏ đèn, dùng OLED**. |
| **OLED 0.96" I2C — chạy ✅** | `gpio-service/oled.py` (mới): tự điều khiển SSD1306 qua I2C bằng `smbus2` + vẽ chữ bằng Pillow (không cần thư viện OLED). `python3 oled.py` = hiện thử 4 cảnh. OLED mua về **chưa hàn chân** → đã nhờ tiệm hàn. Nối bằng **dây cái–cái thẳng vào Pi** (qua breadboard thì `i2cdetect` không thấy). `i2cdetect -y 1` thấy **`3c`**. |
| **`gpio_service.py` sửa** | Bỏ RGBLED; `POST /led {state}` giờ **vẽ chữ lên OLED** (giữ tên `/led` để **web không phải sửa**): off → "San sang", scanning → "Dang quet...", happy/sad/angry/surprise/neutral → VUI/BUON/GIAN/NGAC NHIEN/BINH THUONG (không dấu, chữ dài tự thu nhỏ). OLED lỗi/chưa cắm thì service vẫn chạy. Đã test mock trên laptop + chạy thật trên Pi với web: **đúng**. |
| **Nút bấm → chưa chạy ❌** | Đổi chân nút sang **GPIO17 (11) / GPIO27 (13)**, GND chung (dễ đếm hơn 29/31). `test_hardware.py` giờ chỉ thử nút + in trạng thái lúc đầu. Nối thẳng dây GPIO17 ↔ GND thì Pi **nhận được** → Pi + code tốt. Nhưng qua **breadboard** (nút 4 chân) và qua **nút xám 6 chân** (bấm không đổi mạch, `pinctrl get 17` không đổi) đều **không ăn**. Chưa rõ breadboard hỏng hay nút. → **Thay bằng module chạm TTP223** (3 chân VCC/GND/SIG, dây cái–cái, chạm xuyên vách gỗ mỏng). |
| **Thiết kế vỏ hộp** | Artifact "Hộp nhạc EmoTune": https://claude.ai/artifact/4gG9bMeum3LbByggG66QK1 — hộp gỗ nắp bản lề 22×15×12 cm; mặt trước: lưới loa trái, camera Ø15 / OLED 26×15 / 2 nút Ø12 bên phải (có bảng toạ độ tâm lỗ); Pi góc sau phải, quạt dưới khe nắp, cổng USB-C ra sau. Làm thử bằng carton trước. (Nếu dùng TTP223 thì không cần khoét lỗ nút.) Chưa biết kích thước loa Bluetooth — đang chừa ~6 cm. |
| Cách chép code sang Pi | Code OLED được **`scp` từ laptop** (`scp gpio-service/*.py vinh@raspberrypi.local:~/emotion-music-recommender/gpio-service/`), chưa qua git → xem mục 5 trước khi `git pull` trên Pi. |

### Phiên 30/09 – 02/10 — nút chạm TTP223 + cảm biến PIR
| Việc | File / kết quả |
|---|---|
| **2 module TTP223 — chạy ✅** | Nhãn chân (trái→phải): **GND · I/O · VCC**. Dây cái–cái thẳng vào Pi. Module 1: VCC 3.3V (17) / GND (25) / I/O GPIO17 (11). Module 2: VCC **GPIO22 (15)** (code bật sẵn mức cao, vì chân 3.3V còn lại đã dành cho OLED) / GND (39) / I/O GPIO27 (13). |
| Code TTP223 | `gpio-service/gpio_service.py`, `gpio-service/test_hardware.py`: `Button(pin, pull_up=None, active_state=True)` + `DigitalOutputDevice(22, initial_value=True)`. `test_hardware.py` OK; **toàn luồng với web + Chromium cờ autoplay OK** (chạm 1 = bắt đầu / bài tiếp, chạm 2 = tạm dừng / phát tiếp). |
| **PIR — code xong** (thiết kế bounded, chốt trong chat, không có file spec) | `gpio-service/gpio_service.py`: `DigitalInputDevice(23, pull_up=False)` (không `bounce_time`), `PRESENCE_TIMEOUT = 30`; "có người" = PIR đang mức cao **hoặc** báo trong 30s gần nhất (bắt cả lúc báo qua `when_activated` lẫn lúc giữ cao qua `is_active`); **chưa báo lần nào từ lúc bật → coi như có người** (PIR rút ra thì nhạc không tự dừng). `GET /buttons` trả thêm `"present"`. OLED tự chọn màn: chờ + có người → `GREETING` "Xin chao! / Cham de quet"; đang phát + vắng → `PAUSED` "Khong thay ai / Tam dung"; đang quét luôn "Dang quet..."; chỉ vẽ lại khi đổi (luồng `watch_presence` 0.5s). |
| PIR — web | `emotune-frontend/src/hardware.js`: `useHardwareButtons` gọi thêm `onAway` (present true→false) / `onBack` (false→true). `emotune-frontend/src/components/MusicPlayer.jsx`: `pausedByAwayRef` — vắng thì dừng, quay lại **chỉ phát tiếp nếu chính PIR đã dừng** (tự chạm nút 2 dừng thì không tự phát). Tạm dừng vì vắng **không** gửi listen-report. eslint + `npm run build` OK. |
| PIR — file thử | `gpio-service/test_hardware.py`: thử 2 nút + PIR, in `CO NGUOI` tối đa 2s/lần, in "30 giay khong thay ai" khi vắng 30s (cùng cách tính với service). Bỏ `from signal import pause` (dùng vòng lặp). |
| Test tự động (mock pin) | `gpio-service/test_presence.py` (chạy trên laptop, cần `gpiozero flask flask-cors`): chào / 29s vẫn có người / 31s vắng → Tam dung / quay lại / đang quét / không vẽ lại / xung PIR ngắn / PIR giữ cao > 30s / nút vẫn đếm → **ALL OK**. |
| **PIR trên mạch thật — chưa ổn ❌** | Nối đúng (úp cốc thì `pinctrl get 23` đứng yên `lo`). Núm **trái = thời gian giữ** (đang ở min, ngược chiều kim đồng hồ hết), núm **phải = độ nhạy**; jumper để nguyên. Kết quả: ngồi nghe nhạc ở độ nhạy nửa vòng có lúc báo đều 6–7s/lần (tốt), nhưng (1) **phòng trống vẫn báo nhầm** mỗi 10–40s (cả khi độ nhạy max lẫn nửa vòng), (2) có lúc **bỏ sót người ngồi yên** > 30s. **Úp cốc làm lệch nắp vòm** → PIR "mù", phải lắc mới báo. **Chưa thử toàn luồng PIR với web/nhạc.** |
| Chọn cảm biến thay thế | Khuyên mua **Hlk-ld2410c** (radar 24GHz, bắt cả người ngồi im/nhịp thở, không bị nhiệt/gió; chân 2.54mm cắm dây cái–cái; VCC 5V, OUT 3.3V → **cắm đúng 3 chỗ của PIR, code gần như không đổi**). Đừng mua LD2410/LD2410B (chân 1.27mm), LD1010/1020/2411/2420 (loại khác), không cần "Dòng 2,54MM 5P". Shop Shopee đã xem: giao **4–14/10** → sát deadline, nên tìm shop cùng thành phố / hỏa tốc / tiệm linh kiện. Rẻ hơn: HC-SR04 (siêu âm, ~15–25k, bắt người ngồi im nhưng chùm hẹp, ECHO 5V cần 2 điện trở hạ áp, sửa code nhiều) · RCWL-0516 (~10–20k, vẫn bắt chuyển động, hay báo nhầm — **không khuyên**). **Người dùng chưa chốt mua loại nào.** |
| Sự cố scp | Lệnh `scp hardware.js MusicPlayer.jsx` bị cắt dòng (thiếu đích Pi) → **ghi đè `MusicPlayer.jsx` trên laptop** bằng nội dung `hardware.js`. Đã khôi phục bằng `git checkout` + sửa lại phần PIR. |
| Ghi nhớ | Memory `pin-counting.md`: chỉ chân theo "hàng trên/dưới, chân thứ N". |

## 3. Các quyết định quan trọng và lý do

| Quyết định | Lý do |
|---|---|
| Demo ở trường qua **hotspot laptop**, gọi Pi bằng `raspberrypi.local` | Không phụ thuộc wifi trường; IP đổi theo mạng. |
| Hướng đồ án **"hộp nhạc cảm xúc"**: thiết bị tự chạy, tương tác bằng đèn + nút, ảnh xử lý tại chỗ | Để Pi có ý nghĩa hơn một máy tính nhỏ (trả lời "tại sao dùng Pi"). |
| GPIO = **service Python riêng**, **trang web gọi thẳng** `localhost:5001` (backend Node không đổi) | Trình duyệt chạy trên Pi; service chết thì nhạc vẫn chạy. |
| Nút bấm dùng **bộ đếm + web hỏi mỗi 300ms** | Server không tự gọi được trình duyệt; bộ đếm không mất / không xử lý 2 lần lần bấm. |
| Bảng nối chân slide 10 để **SVG thường** (`pin-table=no`) | Tránh rủi ro xuất bảng native. |
| **Chia train/val theo người** | Chia theo ảnh gây identity leakage → số ảo (92.5% vs 71.5% thật). |
| Mai **demo bằng model cũ** | Model cũ đã học mặt ducvinh (người demo); model mới giữ ducvinh làm tập kiểm tra. |
| **Bỏ đèn LED, dùng OLED** (28/09 chiều) | LED cắm breadboard lệch cột mãi không lên đủ màu; OLED chỉ 4 dây, hiện được chữ → demo dễ hiểu hơn. |
| OLED giữ API **`POST /led`** | Web không phải sửa; chỉ `gpio_service.py` đổi từ đổi màu sang vẽ chữ. |
| Tự viết driver SSD1306 (`oled.py`) thay vì `luma.oled` | Chỉ cần gói apt (`python3-smbus2`, `python3-pil`), không phải `pip --break-system-packages` trên Pi. |
| Nối OLED bằng **dây cái–cái thẳng vào Pi** | Ít điểm tiếp xúc hơn qua breadboard; qua breadboard `i2cdetect` không thấy. |
| Nút: **thay bằng module chạm TTP223** | Nút cơ trên breadboard / nút 6 chân đều không ăn, trong khi Pi + code đã được chứng minh tốt; TTP223 cắm thẳng 3 dây cái–cái, chạm xuyên vách hộp. |
| Demo 28/09: **OLED + nút trên màn hình** | Không phí thêm giờ gỡ nút trước báo cáo. |
| TTP223 #2 lấy điện từ **GPIO22 bật cao** | Pi chỉ có 2 chân 3.3V; chân 1 cho OLED, chân 17 cho TTP223 #1. Module chỉ tốn vài mA. |
| PIR: có người lại gần → **chỉ chào** trên OLED, vẫn phải chạm nút 1 mới quét | Không tự bật camera khi người chỉ đi ngang; demo chủ động thời điểm quét. |
| PIR: vắng **30s** → tạm dừng, quay lại → **tự phát tiếp** (chỉ khi PIR dừng, không khi tự bấm dừng) | Người dùng chọn 30s (1 phút quá lâu so với bài vài phút). |
| Đếm 30s + chọn màn OLED nằm **trong `gpio-service`**, web chỉ đọc `present` | Web không phải sửa phần OLED; giống cách bộ đếm nút. |
| PIR chưa báo lần nào → coi như **có người** | Chân GPIO đọc `lo` khi rút PIR → nếu không thì nhạc tự dừng sau 30s. |
| PIR OUT ở **GPIO23 (hàng trên thứ 8)** thay vì GPIO4 (hàng dưới thứ 4) | Hàng dưới chật, người dùng không cắm được. |
| **Không dùng `bounce_time`** cho PIR | PIR báo thành nhiều nhịp < 0.1s → chống rung lọc mất hết; báo 1 hay 10 nhịp đều chỉ làm mới mốc thời gian. |
| Thay PIR bằng **radar LD2410C** (đề xuất, chờ người dùng mua) | PIR (cảm biến nhiệt) không thể vừa bắt người ngồi im vừa không báo nhầm; chỉnh núm chỉ đổi lỗi này lấy lỗi kia. LD2410C cắm thay thẳng, code giữ nguyên. |
| Trong lúc chờ: đề xuất **PIR chỉ dùng để chào, tắt tự dừng nhạc** ("cách 3") | Báo nhầm chỉ làm OLED chào nhầm, không ảnh hưởng nhạc. **Chưa được người dùng duyệt, chưa code.** |
| "Gợi ý theo gu": cảm xúc vẫn là tiêu chí chính; gu chỉ xếp hạng **trong** cùng cảm xúc; hiểu bài từ âm thanh (librosa) + thẻ ID3 + nhãn tay (tùy chọn); 65/35 | Giữ đúng đề tài + tính năng chăm sóc cảm xúc; chạy được cả khi không ai điền nhãn. |

## 4. Các lệnh đã chạy và cách chạy lại dự án

### Đã chạy trong phiên
```bash
# Pi: thêm wifi hotspot (chạy từng lệnh ngắn — lệnh dài dán vào Git Bash hay bị cắt)
sudo nmcli connection add type wifi con-name demo-hotspot ifname wlan0 ssid gayta626
sudo nmcli connection modify demo-hotspot wifi-sec.key-mgmt wpa-psk wifi-sec.psk <MAT_KHAU_HOTSPOT>
sudo nmcli connection modify demo-hotspot connection.autoconnect-priority 10
# Laptop: train lại (trong emotion-scanner/, ~4h CPU)
PYTHONUTF8=1 venv/Scripts/python 2_finetune_model.py
PYTHONUTF8=1 venv/Scripts/python analyze_confusion.py
# Laptop: xuất lại slide (PPT Master) — S = thư mục skill, P = thư mục project PPT Master
python $S/scripts/svg_quality_checker.py $P --canonical-authoring --stage final --json
python $S/scripts/total_md_split.py $P && python $S/scripts/finalize_svg.py $P && python $S/scripts/svg_to_pptx.py $P

# --- Phiên 30/09 – 02/10 ---
# Laptop (Git Bash, thư mục dự án): chép code sang Pi — MỖI LỆNH 1 DÒNG, đích Pi phải nằm cùng dòng
scp gpio-service/*.py vinh@raspberrypi.local:~/emotion-music-recommender/gpio-service/
cd ~/Documents/HIC/emotion-music-recommender/emotune-frontend/src
scp hardware.js vinh@raspberrypi.local:~/emotion-music-recommender/emotune-frontend/src/
scp components/MusicPlayer.jsx vinh@raspberrypi.local:~/emotion-music-recommender/emotune-frontend/src/components/
# Pi: thử nút chạm + PIR (Ctrl+C thoát)
cd ~/emotion-music-recommender/gpio-service && python3 test_hardware.py
# Pi: xem tín hiệu thô PIR (lo / hi)
watch -n 0.2 pinctrl get 23
# Laptop: test mock service (cần venv có gpiozero + flask + flask-cors; in "ALL OK")
cd gpio-service && PYTHONUTF8=1 python test_presence.py
# Laptop: kiểm tra web
cd emotune-frontend && npx eslint src/hardware.js src/components/MusicPlayer.jsx && npm run build
```

### Chạy demo trên Pi
1. Laptop bật hotspot `gayta626` (Power saving Off). Bật Pi, loa Bluetooth, cắm webcam C270, đợi ~1 phút.
2. Laptop mở 3 Git Bash → `ssh vinh@raspberrypi.local` (không vào được → `ipconfig /flushdns`):
```bash
cd ~/emotion-music-recommender/emotion-scanner && source venv/bin/activate && python 3_backend_server.py
cd ~/emotion-music-recommender/emotune-backend && npm start
cd ~/emotion-music-recommender/emotune-frontend && npm run dev
cd ~/emotion-music-recommender/gpio-service && python3 gpio_service.py   # OLED + nút chạm + PIR (cửa sổ thứ 4)
#   cài 1 lần: sudo raspi-config nonint do_i2c 0
#              sudo apt install -y i2c-tools python3-smbus2 python3-pil python3-flask python3-flask-cors
#   thử riêng: i2cdetect -y 1 (thấy 3c) · python3 oled.py · curl -X POST localhost:5001/led -H "Content-Type: application/json" -d '{"state":"happy"}'
```
3. RealVNC Viewer → `raspberrypi.local` → Chromium `localhost:5173` → ▶ Bắt đầu → Allow camera.
   (Khi dùng nút chạm: **đóng hẳn Chromium**, mở Terminal trong VNC chạy `chromium-browser --autoplay-policy=no-user-gesture-required http://localhost:5173` — không có lệnh thì dùng `chromium`.)
   PIR mới cấp điện cần ~30–60s ổn định → bật Pi sớm.
4. Xem DB: `sudo -u postgres psql -d emotune -c "select id, emotion, action, created_at from mood_history order by id desc limit 5"`

### Chạy trên PC / laptop
```bash
# DB: DBeaver Alt+X db/schema.sql rồi db/seed.sql  (.env: DB_NAME=postgres)
cd emotion-scanner && venv\Scripts\activate && python 3_backend_server.py   # :5000
cd emotune-backend && npm run dev                                           # :8080
cd emotune-frontend && npm run dev                                          # :5173
```

### Checklist linh kiện (mua / chưa mua)

| Món | Trạng thái | Ghi chú |
|---|---|---|
| Raspberry Pi 5 + nguồn, webcam Logitech C270, loa Bluetooth | ✅ có | C270 có micro sẵn |
| LED RGB 4 chân (trong suốt), điện trở 220Ω | ✅ có · **không dùng nữa** | LED là loại **anot chung** |
| Nút 4 chân núm đen, nút 6 chân xám (nhấn nhả) | ✅ có · **không dùng** | đã thay bằng TTP223 |
| Breadboard 830 lỗ, dây đực–cái, dây đực–đực | ✅ mua 28/09 | nghi breadboard có chỗ không thông |
| **Dây cái–cái** | ✅ có | nối thẳng module → Pi; mua thêm loại **dài 20 cm** khi lắp hộp |
| **Màn hình OLED 0.96" I2C** (thứ tự chân: **VCC GND SCL SDA**) | ✅ **chạy** | đã nhờ tiệm hàn chân; SSD1306, địa chỉ `0x3C` |
| **Cảm biến chuyển động PIR HC-SR501** | ✅ có · code xong · **không đáng tin** | chân VCC · OUT · GND; báo nhầm khi phòng trống; đừng úp cốc (lệch nắp vòm) |
| **Radar LD2410C** (chọn ô **Hlk-ld2410c**) | ⬜ **nên mua** | thay PIR, cắm đúng 3 chỗ của PIR; tìm shop giao nhanh (deadline 15/10) |
| **2 module chạm TTP223** | ✅ **chạy** (30/09) | chân GND · I/O · VCC |
| Hộp gỗ nắp bản lề ~22×15×12 cm | ⬜ chưa mua | xem artifact "Hộp nhạc EmoTune" (mục 2) |
| Loa vi tính USB (tiếng qua USB) | ⬜ chưa mua · tùy chọn | thay loa Bluetooth cho ổn định |
| Micro USB mini | ⬜ chưa mua · tùy chọn | chỉ khi làm giọng nói và mic C270 không đủ rõ |
| Module MAX98357A + loa 3W 4Ω | ⬜ chưa mua · để sau | loa gắn liền mạch, **phải hàn** |

### Sơ đồ nối dây
Chân 1 = đầu hàng 40 chân **gần lỗ ốc**, cổng nguồn ở dưới bên trái. **Hàng dưới** (sát tản nhiệt) = chân lẻ 1, 3, 5…; **hàng trên** (sát mép hộp) = chân chẵn. ⚠ Hàng trên chân thứ 1–2 (chân 2, 4) là **5V**.

| Linh kiện | Chân Pi (số vật lý) · vị trí đếm từ trái | Trạng thái |
|---|---|---|
| OLED VCC / SDA / SCL / GND | 3.3V (1) / GPIO2 (3) / GPIO3 (5) / GND (9) · hàng dưới thứ 1 / 2 / 3 / 5 | ✅ chạy |
| TTP223 #1 VCC / GND / I/O | 3.3V (17) / GND (25) / GPIO17 (11) · hàng dưới thứ 9 / 13 / 6 | ✅ chạy |
| TTP223 #2 VCC / GND / I/O | GPIO22 (15) / GND (39) / GPIO27 (13) · hàng dưới thứ 8 / 20 (cuối) / 7 | ✅ chạy |
| PIR (sau này LD2410C) VCC / GND / OUT | 5V (2) / GND (6) / GPIO23 (16) · **hàng trên** thứ 1 / 3 / 8 | nối đúng; cảm biến không đáng tin |

⚠ Dây **OUT** không bao giờ cắm vào hàng trên thứ 1–2 (5V). Dây GND OLED ở hàng dưới **thứ 5** (thứ 4 để trống).

⚠ Tắt Pi (`sudo shutdown now`) và rút điện trước khi cắm/rút dây.

## 5. Lỗi đang gặp hoặc việc còn dở
- **Đã commit + push (02/10)**: `gpio-service/gpio_service.py`, `test_hardware.py`, `test_presence.py`, `emotune-frontend/src/hardware.js`, `components/MusicPlayer.jsx`, `NOTES.md`, `.gitignore` (+ bỏ `__pycache__` khỏi git). Vẫn chưa track: `docs/EmoTune_Group6_Report_EN.pptx`, `docs/EmoTune_report_EN_v2.pptx`, `docs/EmoTune_report_EN_v3.pptx`, `docs/script-presentation-EN.md`, `docs/script-thuyet-trinh-VI.md` (người dùng tự làm, chưa rõ bản nào là cuối). Cũng chưa track: `emotion-scanner/docs/`.
- **Trên Pi, code được chép bằng `scp`** (gpio-service + 2 file web) → lần `git pull` sau sẽ báo trùng file. **Commit + push trên laptop trước**, rồi trên Pi (trong `~/emotion-music-recommender`): `git checkout -- gpio-service emotune-frontend/src` · xoá file chưa track bị báo trùng · `git pull`.
- **PIR không đáng tin** (mục 2): báo nhầm khi phòng trống, có lúc bỏ sót người ngồi yên. **Toàn luồng PIR với web + nhạc chưa thử** (OLED chào / Tam dung / tự phát tiếp). Không chắc 2 file web (`hardware.js`, `MusicPlayer.jsx`) đã được scp sang Pi thành công — chép lại cho chắc.
- Đang chờ người dùng: (1) chốt mua cảm biến nào (LD2410C khuyên dùng), (2) có làm "cách 3" (PIR chỉ chào, tắt tự dừng nhạc) trong lúc chờ không.
- Trang web còn comment/tên hàm cũ nói "đèn LED" (`hardware.js` `setLed`, `HomePage.jsx`) — chạy đúng, chỉ là tên cũ.
- **Laptop chưa chạy dự phòng được**: DB laptop còn bản cũ 15 bài, `emotune-backend/music/` trống.
- **AI**: 72.5% với người lạ; lớp **giận yếu** (26%, bị đoán thành bình thường); overfit mạnh; `load_best_model_at_end` **không nạp** bản tốt nhất (phải lấy tay từ checkpoint); `dat` thiếu ảnh surprise; `AI_NOTES.md` đã cũ, `check_data_quality.py` được nhắc nhưng không có trong repo.
- Kịch bản thuyết trình chưa khớp bản 10 slide; slide VN còn số trang "/ 13". Slide/kịch bản vẫn nói "đèn LED + nút" → nên sửa thành **OLED + nút chạm TTP223 + cảm biến có người**.
- Cũ, chưa sửa: `EmotionScanner` gửi ảnh khi camera chưa mở; `mood_history` có thể ghi `suggested` 2 lần; camera CSI không nhận; mỗi lần bật Pi phải mở tay các server qua SSH.
- Global Python laptop có sẵn xung đột cũ (tensorflow-intel 2.17, facenet-pytorch) — không liên quan dự án, đừng "sửa".

## 6. Bước tiếp theo nên làm
1. **Cảm biến có người:** chốt mua **Hlk-ld2410c** (shop giao nhanh). Trong lúc chờ, nếu người dùng đồng ý → làm "cách 3": PIR chỉ chào, tắt `onAway/onBack` (hoặc 1 cờ trong `gpio_service.py`). Khi LD2410C tới: tắt Pi → cắm VCC/GND/OUT vào hàng trên thứ 1/3/8 (thay PIR) → `test_hardware.py` → bật lại tự dừng → **thử toàn luồng** (bảng 6 tình huống: chào / quét / ngồi 1 phút không dừng / đi ra 40s → Tam dung / quay lại → phát tiếp / tự chạm dừng thì không tự phát). Hướng dẫn **1 bước mỗi tin nhắn**.
2. **Đồng bộ Pi qua git** (code đã push): làm theo mục 5 để bỏ bản scp rồi `git pull`.
3. **AI:** xem lại ảnh "giận" của ducvinh/vanquynh; thử giảm overfit (augmentation mạnh hơn, ít epoch, mở 1 lớp); sửa lấy best checkpoint; sau đó **train bản cuối trên đủ 10 người** → commit model (Git LFS) → trên Pi `git pull && git lfs pull` → restart `3_backend_server.py`. Cập nhật `AI_NOTES.md`.
4. **Gợi ý theo gu:** người dùng đọc plan rồi chọn cách thực hiện (Native / Subagent / tự code). Cần thêm bài hát (≥ 8–10 bài mỗi cảm xúc) thì tính năng mới có ý nghĩa.
5. **Vỏ hộp:** theo artifact "Hộp nhạc EmoTune"; làm thử bằng carton; gửi Claude kích thước loa Bluetooth để chỉnh bản vẽ. Thêm lỗ cho cảm biến có người ở mặt trước (LD2410C nhìn xuyên được vách gỗ/nhựa mỏng → có thể không cần khoét).
5b. Sửa slide/kịch bản: "đèn LED + nút" → "OLED + nút chạm + cảm biến có người".
6. **Giai đoạn 2 phần cứng:** cắm điện là chạy (systemd cho các service + Chromium kiosk), không cần VNC.
7. (Tùy chọn) Thí nghiệm Edge Impulse so với ViT trên cùng 2 người kiểm tra.
8. Laptop dự phòng: `scp` mp3 từ Pi về, chạy lại `schema.sql` + `seed.sql`.
