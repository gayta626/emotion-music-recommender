# H6 — Trợ lý giọng nói (thiết kế)

> Ngày: 09/10/2026 · Trạng thái: **chờ người dùng duyệt** · Mục tiến độ: `TIEN_DO.md` H6
> Figma: file `lycGTr71v02BpzYgjmZZS3`, frame **`284:120`** (màn trợ lý giọng nói)

## 1. Mục tiêu

Bấm **logo AI** trên header → nói tiếng Việt → trợ lý hiểu và làm, rồi trả lời bằng chữ + giọng nói. Ba việc:

1. **Điều khiển nhạc**: phát / tạm dừng / tiếp tục / bài tiếp / to – nhỏ / tắt tiếng / "không thích bài này"; phát bài, ca sĩ, playlist theo tên.
2. **Nói cảm xúc → gợi ý bài** ("hôm nay mình mệt quá" → sad → `POST /suggest`). Đây là **kênh cảm xúc thứ 2** bên cạnh khuôn mặt (mục C11).
3. **Chuyển tới mọi trang** ("cho tôi xem ca sĩ Sơn Tùng MTP" → `/artist/4`). Tên khớp **1** mục → đi thẳng; khớp **nhiều** mục gần bằng nhau → **hỏi lại** để chọn.

Thành công khi: các câu ở bảng mục 4.5 cho đúng kết quả (unit test), và trên Chrome nói được trọn các luồng ở mục 8.

## 2. Quyết định đã chốt (và lý do)

| Quyết định | Lý do |
|---|---|
| Hiểu lệnh: **luật trước, LLM dự phòng** | Lệnh quen chạy tức thì, miễn phí, có test; phần "thông minh" tự viết, giải thích được khi bảo vệ. LLM chỉ lo câu tự do |
| Bộ luật ở **backend** (`POST /assistant`), là **hàm thuần** | Test bằng `node:test` như `decideTarget`; key LLM không lộ ra trình duyệt; logic ở 1 chỗ |
| Nhận giọng: **Web Speech API** của Chrome/Edge (`vi-VN`) | Đã là model speech-to-text (máy chủ Google), miễn phí, đủ chính xác. Tách thành module riêng để sau thay bằng Whisper/PhoWhisper cho Pi |
| LLM: **Claude Haiku 5.5** (`claude-haiku-5-5`), `effort: "low"` | Người dùng chọn model Claude rẻ nhất phục vụ được việc phân loại 1 câu ngắn; nhanh |
| Phản hồi: **chữ + đọc to** (`speechSynthesis`, giọng `vi-VN`) | Demo ra dáng trợ lý ảo; không có giọng Việt thì chỉ hiện chữ |
| Giao diện: **phủ toàn màn hình** theo Figma `284:120` | Người dùng chọn |
| Ngôn ngữ trợ lý: tiếng Việt (giao diện còn lại vẫn tiếng Anh) | Người dùng nói tiếng Việt; giống câu gợi ý cảm xúc của backend |
| Có **ô gõ chữ** dự phòng | Không mic / nhận sai / Firefox; Playwright cần để tự kiểm tra |

## 3. Kiến trúc

```
Logo AI ─► VoiceAssistant (overlay)
             ├─ speech.js: Web Speech → chữ (interim + final)      [module thay được]
             ├─ POST /assistant {text, pending?}
             │     assistantController → assistantService
             │        ├─ lấy danh mục: songs (+artist), artists, playlists của user   (model, lọc user_id)
             │        ├─ 1. parseCommand(text, catalog, pending)   ← hàm thuần + test
             │        └─ 2. kết quả unknown & có key → classifyWithLlm(text, catalog)
             │                 → validateLlmAction(raw, catalog)  ← hàm thuần + test
             ◄─ {action, reply, source}
             ├─ runAction(action): navigate / usePlayback() / api.post('/suggest') / control(...)
             └─ speak(reply)  + giảm nhạc khi đang nghe/nói
```

## 4. Backend

### 4.1 API `POST /assistant` (cần đăng nhập)

Vào: `{ "text": "cho tôi xem ca sĩ sơn tùng", "pending": null }`
`pending` (chỉ khi lần trước trả `choose`): `{ "intent": "navigate" | "play", "candidates": [{ "kind": "artist"|"song"|"playlist", "id": 4, "name": "Sơn Tùng M-TP" }] }`

Ra: `{ "action": <Action>, "reply": "Đang mở trang Sơn Tùng M-TP", "source": "rules" | "llm" | "none" }`

`Action` là một trong:

| `type` | Trường | Ví dụ |
|---|---|---|
| `navigate` | `path` | `{type:"navigate", path:"/artist/4"}` |
| `play` | `kind` + dữ liệu đủ để phát | `kind:"song", song:{...}` · `kind:"artist", queue:{name, songs:[...]}` · `kind:"playlist", playlistId` |
| `mood` | `emotion` (happy/sad/angry/surprise/neutral) | `{type:"mood", emotion:"sad"}` |
| `control` | `command`: `pause` `resume` `next` `volume_up` `volume_down` `mute` `not_for_me` | `{type:"control", command:"next"}` |
| `choose` | `intent`, `candidates` | hỏi lại khi trùng tên |
| `unknown` | — | "Mình chưa hiểu, bạn thử nói: …" |

Lỗi: `text` rỗng / quá 300 ký tự → 400.

### 4.2 Trang hợp lệ cho `navigate`

`/` (trang chủ) · `/scan` (quét) · `/now-playing` (đang phát) · `/lyrics` (lời bài hát) · `/stats` (thống kê / tâm trạng) · `/settings` (cài đặt) · `/survey` (khảo sát gu) · `/artist/:id` · `/playlist/:id`.

### 4.3 `parseCommand(text, catalog, pending)` — `src/services/assistantRules.js`

1. **Chuẩn hoá**: bỏ dấu (`đ`→`d`), chữ thường, bỏ dấu câu → mảng từ; thêm bản **dính liền** không khoảng trắng (để "Hiếu Thứ Hai" khớp `HIEUTHUHAI`, "M TP"/"MTP" khớp `M-TP`).
2. **Có `pending`** → chỉ so câu trả lời với `candidates` (theo tên, hoặc "đầu tiên / thứ nhất / thứ hai / cái cuối"); khớp → thực hiện `intent` với mục đó; không khớp → bỏ `pending`, xử lý như câu mới.
3. **Nhận loại lệnh theo thứ tự ưu tiên**:

| # | Loại | Từ khoá (không dấu) |
|---|---|---|
| 1 | `control` | tam dung / dung / ngung · tiep tuc / phat tiep · bai tiep / bai khac / chuyen bai / qua bai · to len / lon len / tang am luong · nho lai / be lai / giam am luong · tat tieng · khong thich bai nay |
| 2 | `navigate` trang | (xem / mo / vao / di toi / chuyen sang) + trang chu · quet · thong ke / tam trang · cai dat · loi bai hat · dang phat · khao sat |
| 3 | `navigate` / `play` có tên | **xem / trang / vao** + tên → mở trang ca sĩ / playlist (bài hát → phát) · **phat / nghe / bat / mo bai / mo nhac / cho nghe** + tên → phát · chỉ có "mo" + tên, hoặc chỉ nói tên (không động từ) → **phát** |
| 4 | `mood` | từ điển: *buon, chan, met, co don, khoc, that tinh* → sad · *tuc, buc, cau, kho chiu, gian* → angry · *vui, yeu doi, phan khoi, hanh phuc* → happy · *bat ngo, ngac nhien, soc* → surprise · *binh thuong, chill* → neutral. **Phủ định** (`khong / chang / cha / dau co` ngay trước): "không vui" → sad, "không buồn" → neutral |
| 5 | `unknown` | → LLM |

4. **Tìm tên**: điểm mỗi mục = tỉ lệ từ trong tên có mặt trong câu; khớp bản dính liền = 1.0. Ứng viên khi điểm ≥ 0.6. Chữ "bài" ưu tiên bài hát, "ca sĩ" ưu tiên ca sĩ, "playlist" ưu tiên playlist.
5. **Trùng tên**: ≥ 2 ứng viên có điểm cách cao nhất ≤ 0.15 → `choose` (tối đa 4 ứng viên). 1 ứng viên → làm luôn.
6. `reply` do luật tự tạo ("Đang mở trang …", "Đang phát …", "Bạn muốn ca sĩ nào: A hay B?").

### 4.4 LLM dự phòng — `src/services/assistantLlm.js`

- SDK `@anthropic-ai/sdk`, model `claude-haiku-5-5`, `output_config: { effort: "low", format: <JSON schema> }`, `max_tokens` nhỏ (~512), timeout ~6s, `maxRetries: 1`.
- Prompt hệ thống: vai trò trợ lý EmoTune, danh sách trang, danh mục rút gọn (id + tên bài/ca sĩ/playlist), các loại hành động; trả lời tiếng Việt ngắn.
- Schema đầu ra: `{type, path?, kind?, id?, emotion?, command?, reply}`.
- **`validateLlmAction(raw, catalog)`** (hàm thuần): `type` hợp lệ, `id` có trong danh mục, `path` thuộc mục 4.2 → dựng `Action` thật (kèm `song` / `queue`); sai → `unknown`.
- Không có `ANTHROPIC_API_KEY`, lỗi mạng, hết thời gian, `stop_reason` khác `end_turn` → trả `unknown`, `source: "none"` (không sập).
- `.env`: thêm `ANTHROPIC_API_KEY` (ghi vào `.evn.example`).

### 4.5 Ví dụ (thành unit test)

| Câu nói | Kết quả |
|---|---|
| "cho tôi xem ca sĩ Sơn Tùng MTP đi" | `navigate /artist/<id Sơn Tùng>` |
| "phát bài Giá Như" | `play song` (Giá Như) |
| "mở nhạc của Taylor Swift" | `play artist` (queue các bài Taylor Swift) |
| "bài tiếp đi" / "tạm dừng" / "phát tiếp" | `control next` / `pause` / `resume` |
| "mở trang thống kê" | `navigate /stats` |
| "hôm nay mình không vui lắm" | `mood sad` |
| "nghe hiếu thứ hai" | khớp bản dính liền → `play artist` HIEUTHUHAI (khi có bài) |
| tên khớp 2 mục gần bằng nhau (dữ liệu test) | `choose` → câu sau "cái thứ hai" → mục 2 |
| "nay sếp mắng, chẳng muốn làm gì" | `unknown` (để LLM) |

## 5. Frontend

| File | Việc |
|---|---|
| `src/utils/speech.js` (mới) | `isSpeechSupported()`, `listen({onInterim, onFinal, onError})` (Web Speech `vi-VN`, trả hàm dừng), `speak(text)` (`speechSynthesis`, chọn giọng `vi-VN`, trả Promise) |
| `src/components/VoiceAssistant.jsx/.scss` (mới) | Overlay theo Figma; trạng thái `idle → listening → thinking → replying`; gọi `/assistant`; `runAction`; giữ `pending` |
| `src/components/VoiceWave.jsx` (mới, nếu cần tách) | 45 vạch: theo mic thật (`getUserMedia` + `AnalyserNode`) khi nghe; nhịp giả lập khi nói; phẳng khi rảnh |
| `src/contexts/AIAssistantContext.jsx`, `aiAssistantStore.js` | `open / close / isOpen` (đang rỗng) |
| `src/components/Header.jsx` | Logo AI mở trợ lý (bỏ "coming soon") |
| `src/layouts/MainLayout.jsx` | Vẽ `<VoiceAssistant/>` |
| `src/contexts/PlaybackProvider.jsx` + `PlayerHost.jsx` + `MusicPlayer.jsx` | Lệnh mới `control(command)` (pause/resume/next/volume/mute/not_for_me/duck/unduck) đi cùng đường `registerPlayer`; `MusicPlayer` thực hiện như nút bấm |
| `src/assets/icons/` | Micro `fluent:mic-32-light` (Figma `198:258`); logo dùng lại `ai_icon.svg` nếu trùng `ri:voice-ai-line` (`194:63`) |

**Giao diện** (Figma `284:120`, 1440 px): nền `#261925`; logo AI 92 px giữa trên; **micro 111 px** giữa màn (là nút: bấm để nghe / dừng); **sóng 45 vạch** `#d9d9d9` rộng 13 px nửa dưới. Thêm (Figma không có): chữ đang nghe, câu trả lời, nút chọn khi `choose`, 3 câu gợi ý lúc rảnh, ô gõ chữ dưới cùng, nút ✕. Màn ≤ 900 px: thu nhỏ, sóng ít vạch hơn, không tràn ngang.

**Hành vi**:
- Mở overlay → tự bắt đầu nghe. Esc / ✕ → đóng (dừng nghe, dừng nói, trả âm lượng).
- Đang nghe / đang nói → nhạc giảm còn ~20% (`duck`), xong trả lại.
- `navigate`/`play`/`mood`/`control` xong → đọc câu trả lời → **tự đóng sau ~1.5s**. `choose`/`unknown` → giữ mở, nghe tiếp.
- `mood` → `POST /suggest {emotion}` (ghi `mood_history` như chọn tay) → `playScanResult` + `setLastMood` → `/now-playing`.
- `control` / `/now-playing` / `/lyrics` khi chưa có bài → "Chưa có bài nào đang phát".

## 6. Xử lý lỗi

| Tình huống | Trợ lý làm gì |
|---|---|
| Trình duyệt không có Web Speech | "Trình duyệt này không nhận giọng nói, bạn gõ giúp mình nhé" + ô gõ |
| Chặn quyền mic | "Bạn chưa cho phép micro…" + ô gõ |
| Không nghe thấy gì (~8s) | "Mình không nghe thấy gì, bấm micro để nói lại nhé" |
| Web Speech lỗi mạng | "Nhận giọng cần Internet, bạn gõ giúp mình nhé" |
| `/assistant` lỗi | Báo bằng chữ; nhạc không ảnh hưởng |
| Không có giọng `vi-VN` | Chỉ hiện chữ |

## 7. Ngoài phạm vi (để sau)

- Nhận giọng trên **Pi** (Chromium không có Web Speech) → thay `speech.js` bằng bản gọi Whisper/PhoWhisper (giai đoạn B nếu kịp).
- Từ đánh thức ("Hey EmoTune"), hội thoại nhiều lượt, đăng xuất bằng giọng, nút prev/shuffle/repeat (chưa có chức năng).

## 8. Kiểm tra

- `npm test` (backend): ~25 test cho `parseCommand` (bảng 4.5, phủ định, dính liền, `pending`) + `validateLlmAction`.
- curl `POST /assistant` (có token): vài câu luật + 1 câu để LLM (khi có key) + không key.
- Frontend: `npx eslint src` + `npm run build`; Playwright **gõ chữ** vào ô: chuyển trang ca sĩ, phát bài, bài tiếp, tạm dừng, nói cảm xúc → `/now-playing`, trùng tên → chọn, câu lạ; 1440 + 390 px.
- Người dùng thử nói thật trên Chrome (Playwright không có mic).
