require('dotenv').config();
const path = require("path");
const express = require("express")
const initWebRoutes = require("./routes/web")
const cors = require("cors");


let app = express()

// 2mb: luot quet gui 5 tam anh base64 (~20KB/tam), mac dinh 100kb cua express khong du
app.use(express.json({ limit: "2mb" }));
app.use(cors());

// phuc vu file nhac: GET /music/happy_01.mp3 -> emotune-backend/music/happy_01.mp3
app.use("/music", express.static(path.join(__dirname, "..", "music")));

// anh dai dien nghe si: GET /avatars/son-tung.png -> emotune-backend/avatars/son-tung.png
app.use("/avatars", express.static(path.join(__dirname, "..", "avatars")));

// anh bia bai hat: GET /covers/gia_nhu.jpg -> emotune-backend/covers/gia_nhu.jpg (do `npm run fetch-images` tai ve)
app.use("/covers", express.static(path.join(__dirname, "..", "covers")));

// loi bai hat: GET /lyrics/gia_nhu.lrc -> emotune-backend/lyrics/gia_nhu.lrc (do `npm run fetch-lyrics` tai ve)
app.use("/lyrics", express.static(path.join(__dirname, "..", "lyrics")));

// karaoke (AI tach giong): GET /karaoke/gia_nhu.beat.mp3 (nhac dem) + /karaoke/gia_nhu.json (cao do giong ca si)
// -> emotune-backend/karaoke/ (do `npm run make-karaoke` tao ra)
app.use("/karaoke", express.static(path.join(__dirname, "..", "karaoke")));

initWebRoutes(app);

let port = process.env.PORT || 8081;
app.listen(port, () => {
    console.log("Backend nodejs running sucess on port :" + port)
})