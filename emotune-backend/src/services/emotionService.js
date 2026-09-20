const axios = require("axios")

let getEmotionFromImage = async (imageData) => {
    try {
        const response = await axios.post(
            "http://localhost:5000/predict",
            {
                image: imageData
            }
        );
        return response.data;
    } catch (err) {
        throw (err);
    }
}

module.exports = {
    getEmotionFromImage: getEmotionFromImage
}