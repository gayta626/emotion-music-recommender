// messages.js - Mẫu câu gợi ý theo từng cảm xúc, chọn ngẫu nhiên mỗi lần

const MESSAGES = {
    happy: [
        "Bạn có vẻ đang vui! Nghe bài này nhé?",
        "Tâm trạng tốt ghê, để mình giữ nhịp vui này cho bạn nhé!",
        "Thấy bạn đang phấn khích, bài này chắc hợp đó!",
    ],
    sad: [
        "Có vẻ bạn đang buồn, nghe bài này cho nhẹ lòng nhé?",
        "Hôm nay không được vui lắm phải không? Thử bài này xem sao.",
        "Mình thấy bạn hơi trầm, để bài nhạc này đồng hành nhé.",
    ],
    angry: [
        "Có vẻ bạn đang bực, nghe bài này để xả bớt nhé?",
        "Thấy hơi căng thẳng, thử bài này xem có dịu hơn không?",
    ],
    neutral: [
        "Tâm trạng bình thường, nghe thử bài này cho có không khí nhé?",
        "Để mình gợi ý 1 bài nhẹ nhàng cho lúc này.",
    ],
    surprise: [
        "Ồ, có vẻ bất ngờ nhỉ! Thử nghe bài này xem sao.",
        "Trông bạn khá ngạc nhiên, đây là gợi ý mới lạ cho bạn.",
    ],
    encouragement: [
        "Mấy hôm nay thấy bạn hơi trầm, đổi gió bằng bài vui này nhé!",
        "Dạo này có vẻ không được vui lắm, nghe thử bài này cho phấn chấn lên nào!",
    ],
};

const REQUEST_SONG_CONFIRM = [
    "Có phải bạn đang tìm bài này không: {title}?",
    "Ý bạn là bài {title} phải không nhỉ?",
    "Mình tìm thấy bài {title}, đúng bài bạn muốn nghe chứ?",
    "Bạn đang nhắc đến {title} đúng không?",
    "Hình như bạn muốn nghe {title}, có đúng không?",
];

function getRequestSongMessage(songTitle) {
    const pool = REQUEST_SONG_CONFIRM;
    const template = pool[Math.floor(Math.random() * pool.length)];
    return template.replace("{title}", songTitle);
}

let getRandomMessage = (emotion, isEncouragement) => {
    const pool = isEncouragement ? MESSAGES.encouragement : (MESSAGES[emotion] || MESSAGES.neutral);
    return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { getRandomMessage, getRequestSongMessage };