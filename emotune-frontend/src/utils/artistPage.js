// Hàm thuần cho trang ca sĩ (ArtistPage): xếp bài, chọn bài hợp tâm trạng, tính % cảm xúc.
import { NEGATIVE } from './moodStats';

// bài nghe nhiều nhất của người này lên đầu; bằng nhau → bài mới thêm (id lớn) trước
export const rankByPlays = (songs, plays) => [...songs].sort(
    (a, b) => (plays[b.id]?.total || 0) - (plays[a.id]?.total || 0) || b.id - a.id
);

// "Fits your mood now": chọn 1 bài của ca sĩ theo cảm xúc quét gần nhất.
// Đang buồn/giận kéo dài (cheerUp bật) → bài vui cho tươi lại, giống cách backend chọn bài động viên;
// còn lại → bài cùng cảm xúc. Không có bài đúng cảm xúc → bài nghe nhiều nhất.
// Trả { song, target, cheered, exact } hoặc null khi ca sĩ chưa có bài / chưa quét.
// exact = false: ca sĩ không có bài đúng cảm xúc, đã lấy bài nghe nhiều nhất thay thế.
export const pickForMood = (songs, lastEmotion, cheerUpOn, plays) => {
    if (!songs.length || !lastEmotion) return null;
    const cheered = cheerUpOn && NEGATIVE.includes(lastEmotion);
    const target = cheered ? 'happy' : lastEmotion;
    const ranked = rankByPlays(songs, plays);
    const match = ranked.find((s) => s.emotion === target);
    return { song: match || ranked[0], target: match ? target : ranked[0].emotion, cheered: cheered && Boolean(match), exact: Boolean(match) };
}

// [{emotion, count}] → thêm phần trăm (làm tròn, cộng lại có thể lệch 1 — chỉ để hiển thị)
export const moodShares = (moods) => {
    const total = moods.reduce((s, m) => s + m.count, 0);
    return total ? moods.map((m) => ({ ...m, percent: Math.round((m.count / total) * 100) })) : [];
}
