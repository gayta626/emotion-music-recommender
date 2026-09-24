# Graph Report - HIC  (2026-09-25)

## Corpus Check
- Large corpus: 1829 files · ~1,570,050 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 268 nodes · 347 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 91% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.83)
- Token cost: 96,133 input · 0 output

## Community Hubs (Navigation)
- Frontend UI Components
- Model Fine-tuning
- Frontend Dependencies
- Backend Dependencies
- Scan & Song Suggestion
- Feedback & Song Requests
- Express Routing & Server
- Flask Emotion API
- Face Data Capture
- Webcam Test & Docs
- Listen Reports & DB Pool
- Frontend Dev Tooling
- Mood History
- Favicon
- Social Icon Sprite

## God Nodes (most connected - your core abstractions)
1. `FaceEmotionDataset` - 7 edges
2. `generateSuggestion()` - 7 edges
3. `react` - 7 edges
4. `Header()` - 7 edges
5. `WeightedTrainer` - 6 edges
6. `SideBar()` - 6 edges
7. `main()` - 5 edges
8. `main()` - 5 edges
9. `predict_emotion()` - 5 edges
10. `processRequestSong()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AI Icon (sparkle stars)` --references--> `Header()`  [EXTRACTED]
  emotune-frontend/src/assets/icons/ai_icon.svg → emotune-frontend/src/components/Header.jsx
- `Home Icon (house)` --references--> `Header()`  [EXTRACTED]
  emotune-frontend/src/assets/icons/home_icon.svg → emotune-frontend/src/components/Header.jsx
- `Notification Icon (bell)` --references--> `Header()`  [EXTRACTED]
  emotune-frontend/src/assets/icons/notification_icon.svg → emotune-frontend/src/components/Header.jsx
- `Search Icon (magnifying glass)` --references--> `Header()`  [EXTRACTED]
  emotune-frontend/src/assets/icons/search_icon.svg → emotune-frontend/src/components/Header.jsx
- `User Icon (profile avatar circle)` --references--> `Header()`  [EXTRACTED]
  emotune-frontend/src/assets/icons/user_icon.svg → emotune-frontend/src/components/Header.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Webcam capture -> backend scan -> render emotion scores flow** — emotion_scanner_test_webcam_captureandpredict, emotion_scanner_test_webcam_scan_and_suggest_api, emotion_scanner_3_backend_server, emotion_scanner_test_webcam_renderbars, emotion_scanner_test_webcam_debug_crop [INFERRED 0.85]

## Communities (15 total, 2 thin omitted)

### Community 0 - "Frontend UI Components"
Cohesion: 0.07
Nodes (31): App(), Add Icon (plus sign), AI Icon (sparkle stars), Close Toggle Icon (collapse sidebar panel), Home Icon (house), Notification Icon (bell), Open Toggle Icon (expand sidebar panel), Search Icon (magnifying glass) (+23 more)

### Community 1 - "Model Fine-tuning"
Cohesion: 0.09
Nodes (23): Dataset, compute_metrics(), FaceEmotionDataset, load_dataset_paths(), main(), BƯỚC 2/4: Fine-tune model bằng Transfer Learning (đóng băng backbone) Đề tài:…, Trainer tùy chỉnh: phạt nặng hơn khi model đoán sai các lớp CÓ ÍT ảnh. Giúp…, Đọc đường dẫn ảnh + nhãn từ thư mục data/<emotion>/*.jpg, bỏ qua lớp thiếu ảnh. (+15 more)

### Community 2 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (27): dependencies, axios, react, react-dom, react-router-dom, sass, axios, sass (+19 more)

### Community 3 - "Backend Dependencies"
Cohesion: 0.08
Nodes (25): author, dependencies, axios, cors, dotenv, express, pg, sass (+17 more)

### Community 4 - "Scan & Song Suggestion"
Cohesion: 0.10
Nodes (20): emotionService, scanAndSuggest(), suggestService, getSuggest(), suggestService, VALID_EMOTIONS, getRandomMessage(), MESSAGES (+12 more)

### Community 5 - "Feedback & Song Requests"
Cohesion: 0.12
Nodes (15): feedBackService, submitFeedBack(), postRequestSong(), requestSongService, getRequestSongMessage(), db, updateFeedBack(), db (+7 more)

### Community 6 - "Express Routing & Server"
Cohesion: 0.12
Nodes (14): express, feedBackController, listenReportController, moodHistoryController, requestSongController, router, ScanController, suggestController (+6 more)

### Community 7 - "Flask Emotion API"
Cohesion: 0.15
Nodes (15): base64, decode_base64_image(), detect_and_crop_face(), health_check(), predict_emotion(), BƯỚC 3/4: Backend Flask - phục vụ model cảm xúc cho web app Đề tài: Hệ thống…, Nhận JSON: { "image": "data:image/jpeg;base64,..." } Trả về JSON: { "emotion":…, Phát hiện khuôn mặt lớn nhất trong ảnh và cắt sát viền, giống hệt bước 1. (+7 more)

### Community 8 - "Face Data Capture"
Cohesion: 0.22
Nodes (12): cv2, ask_person_name(), count_existing_images(), crop_face(), detect_face_box(), main(), BƯỚC 1/4: Thu thập dữ liệu huấn luyện (chụp ảnh khuôn mặt có nhãn) Đề tài: Hệ…, Bỏ dấu tiếng Việt - OpenCV trên Windows dễ lỗi với đường dẫn/tên file có dấu… (+4 more)

### Community 9 - "Webcam Test & Docs"
Cohesion: 0.18
Nodes (13): emotion-scanner requirements.txt, Flask (+ flask-cors), opencv-python 4.13.0.92, PyTorch + HuggingFace Transformers stack, captureAndPredict(), debug_crop face-crop preview, EMOTION_LABEL_VI (neutral/happy/sad/angry/surprise), renderBars() (+5 more)

### Community 10 - "Listen Reports & DB Pool"
Cohesion: 0.20
Nodes (8): { Pool }, listenReportService, submitListenReport(), db, feedBackSongListened(), listenReportModel, processListenReport(), pg

### Community 11 - "Frontend Dev Tooling"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/react, @types/react-dom (+3 more)

### Community 12 - "Mood History"
Cohesion: 0.28
Nodes (6): getMoodHistory(), moodHistoryService, db, getMoodHistoryData(), getMoodHistoryTrend(), moodHistoryModel

## Ambiguous Edges - Review These
- `3_backend_server.py` → `test_webcam.html (quick emotion test page)`  [AMBIGUOUS]
  emotion-scanner/test_webcam.html · relation: conceptually_related_to

## Knowledge Gaps
- **98 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `3_backend_server.py` and `test_webcam.html (quick emotion test page)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `Frontend UI Components` to `Frontend Dependencies`?**
  _High betweenness centrality (0.568) - this node is a cross-community bridge._
- **Why does `emotune-frontend index.html` connect `Webcam Test & Docs` to `Frontend UI Components`?**
  _High betweenness centrality (0.394) - this node is a cross-community bridge._
- **Why does `POST /scan-and-suggest API (localhost:8080)` connect `Webcam Test & Docs` to `Flask Emotion API`?**
  _High betweenness centrality (0.387) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06852497096399536 - nodes in this community are weakly interconnected._
- **Should `Model Fine-tuning` be split into smaller, more focused modules?**
  _Cohesion score 0.08735632183908046 - nodes in this community are weakly interconnected._