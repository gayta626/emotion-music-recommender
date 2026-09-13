require('dotenv').config();
const express = require("express")
const initWebRoutes = require("./routes/web")
const cors = require("cors");


let app = express()

app.use(express.json());
app.use(cors());

initWebRoutes(app);

let port = process.env.PORT || 8081;
app.listen(port, () => {
    console.log("Backend nodejs running sucess on port :" + port)
})