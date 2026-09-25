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

initWebRoutes(app);

let port = process.env.PORT || 8081;
app.listen(port, () => {
    console.log("Backend nodejs running sucess on port :" + port)
})