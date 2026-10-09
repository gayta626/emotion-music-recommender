require('dotenv').config();
const path = require("path");
const express = require("express")
const initWebRoutes = require("./routes/web")
const cors = require("cors");


let app = express()

app.use(express.json());
app.use(cors());

// phuc vu file nhac: GET /music/happy_01.mp3 -> emotune-backend/music/happy_01.mp3
app.use("/music", express.static(path.join(__dirname, "..", "music")));

// anh dai dien nghe si: GET /avatars/son-tung.png -> emotune-backend/avatars/son-tung.png
app.use("/avatars", express.static(path.join(__dirname, "..", "avatars")));

// anh bia bai hat: GET /covers/gia_nhu.jpg -> emotune-backend/covers/gia_nhu.jpg (do `npm run fetch-images` tai ve)
app.use("/covers", express.static(path.join(__dirname, "..", "covers")));

// loi bai hat: GET /lyrics/gia_nhu.lrc -> emotune-backend/lyrics/gia_nhu.lrc (do `npm run fetch-lyrics` tai ve)
app.use("/lyrics", express.static(path.join(__dirname, "..", "lyrics")));

initWebRoutes(app);

let port = process.env.PORT || 8081;
app.listen(port, () => {
    console.log("Backend nodejs running sucess on port :" + port)
})