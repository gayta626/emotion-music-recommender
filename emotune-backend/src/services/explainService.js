// I2 - "Vi sao NYX chon bai nay?" (AI giai thich duoc - XAI): moi ly do lay tu DUNG cac diem da dung de xep hang bai
// (suggestModel: score / taste_artist / taste_genre / like_bonus; similarUsers: knn_fans; suggestService: isEncourage; hanh trinh I4)
// -> khong bia ly do. Giao dien tieng Anh nen cau tieng Anh. HAM THUAN -> unit test duoc.

const MAX_REASONS = 3;

// cach noi tung cam xuc (surprise hien la "Explore" = tam trang muon kham pha)
const MOOD_WORD = {
    happy: "happy",
    sad: "down",
    angry: "tense",
    neutral: "calm",
    surprise: "in the mood to explore",
};

// ly do theo tinh huong (cam xuc + cach NYX biet cam xuc do)
// source: scan (camera) | pick (tu chon cam xuc) | fix (sua lai cam xuc AI doan) | auto (web tu chon bai tiep)
//         | voice (C11: noi cam xuc luc quet)
const moodReason = (emotion, source) => {
    const word = MOOD_WORD[emotion] || emotion;
    if (source === "scan") return { kind: "mood", text: `You look ${word}` };
    if (source === "voice") return { kind: "mood", text: `You told NYX you feel ${word}` };
    if (source === "auto") return { kind: "mood", text: `Still matching your last mood (${word})` };
    return { kind: "mood", text: `You said you feel ${word}` };
};

// song: 1 bai sau khi xep hang (co score, taste_artist, taste_genre, like_bonus, knn_fans)
const personalReasons = (song) => {
    const out = [];
    if (Number(song.like_bonus) > 0) out.push({ kind: "like", text: "You ♥ this song" });
    const score = Number(song.score || 0);
    if (score >= 1) out.push({ kind: "history", text: "You usually listen to it all the way through" });
    else if (score > 0) out.push({ kind: "history", text: "You enjoyed it before" });
    // hanh vi nghe that (cua minh, roi cua nguoi giong minh) truoc khao sat gu: khao sat chi la khai bao ban dau
    const fans = Number(song.knn_fans || 0);
    if (fans > 0) out.push({ kind: "similar", text: `${fans} listener${fans > 1 ? "s" : ""} with taste like yours enjoyed it` });
    if (Number(song.taste_artist) > 0 && song.artist) out.push({ kind: "taste", text: `By ${song.artist}, an artist you picked` });
    if (Number(song.taste_genre) > 0 && song.genre) out.push({ kind: "taste", text: `${song.genre[0].toUpperCase()}${song.genre.slice(1)} is one of your genres` });
    return out;
};

// ctx: { emotion (cam xuc that), source, isEncourage, journey: { step (0..), total } | null }
// -> toi da MAX_REASONS ly do [{ kind, text }], ly do tinh huong truoc, roi ly do ca nhan
const explainPick = (song, ctx) => {
    const reasons = [moodReason(ctx.emotion, ctx.source)];
    if (ctx.journey) {
        const { step, total } = ctx.journey;
        reasons.push({
            kind: "journey",
            text: step === 0 ? "Starts close to how you feel"
                : step === total - 1 ? "Ends your mood journey on a brighter note"
                    : `Step ${step + 1}/${total}: easing toward brighter songs`,
        });
    } else if (ctx.isEncourage) {
        reasons.push({ kind: "encourage", text: "You've seemed low for a while, so NYX picked something brighter" });
    }
    const personal = personalReasons(song);
    // khong co ly do ca nhan nao: bai moi voi nguoi nay (hoac 20% luot NYX thu bai khac) -> noi that
    if (!personal.length) personal.push({ kind: "new", text: "Something new for you: skipping or finishing it teaches NYX" });
    return [...reasons, ...personal].slice(0, MAX_REASONS);
};

module.exports = { MAX_REASONS, explainPick, personalReasons, moodReason };
