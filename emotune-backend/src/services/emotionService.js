const axios = require("axios")

// body gui sang Flask: web moi gui nhieu tam chup lien nhau trong 1 luot quet ({images: [...]})
// -> Flask doan tung tam roi lay trung binh; web cu gui 1 tam ({image}) van chay nhu truoc
let predictBody = ({ image, images }) => {
    return Array.isArray(images) ? { images } : { image };
}

let getEmotionFromImage = async (frames) => {
    try {
        const response = await axios.post(
            "http://localhost:5000/predict",
            predictBody(frames)
        );
        return response.data;
    } catch (err) {
        throw (err);
    }
}

module.exports = {
    getEmotionFromImage: getEmotionFromImage,
    predictBody: predictBody
}
