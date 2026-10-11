// Ham thuan cho `npm run import-music` (co test: test/importMusic.test.js):
// lam sach thong tin tu the ID3 (file tai tu NCT hay ghi "Lạ Lùng - Vũ", album "NhacCuaTui.com",
// 1 ca si nhieu cach viet "Vũ" / "Vũ." / "VU"), doan the loai, va DOAN VIBE TU LOI + TEN BAI.
//
// Doan vibe = phan loai cam xuc van ban bang tu dien (lexicon-based): moi vibe co 1 danh sach tu khoa
// Viet + Anh; dem so lan xuat hien trong loi (moi tu toi da 3 lan, de diep khuc lap lai khong lan at),
// tu khoa nam trong ten bai nhan 3. Vibe nhieu diem nhat thang; it bang chung / sat diem -> danh dau "can xem lai".

// "Sơn Tùng M-TP" -> "son tung m tp" (so khop khong dau, khong phan biet hoa thuong)
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ---------------- ten bai, ca si, album ----------------

// "Vũ. & Binz" -> "Vũ."; "Mark Ronson feat. Bruno Mars" -> "Mark Ronson"; "Ha Nhi x A.C Xuan Tai" -> "Ha Nhi"
const primaryArtist = (artist) => {
    if (!artist) return null;
    return artist.split(/\s*(?:,|&|\sx\s|\sfeat\.?\s|\sft\.?\s)\s*/i)[0].trim() || null;
};

// tag: ten bai trong the ID3; file: ten file (khong duoi .mp3); artist: ca si trong the
const cleanTitle = ({ tag, file, artist }) => {
    let title = (tag || "").trim();
    // NCT hay gan " - <ca si>" vao cuoi ten bai
    const m = title.match(/^(.*\S)\s+-\s+(.+)$/);
    const who = plain(primaryArtist(artist));
    if (m && who && (plain(m[2]).startsWith(who) || who.startsWith(plain(m[2])))) title = m[1];
    // "We Don'T Talk Anymore (Feat. X)" -> "We Don't Talk Anymore (feat. X)"
    title = title.replace(/'([A-Z])(?=\s|$)/g, (_, c) => "'" + c.toLowerCase()).replace(/\(Feat\./g, "(feat.");

    // ten file: bo "(1)" cua file tai trung, "_" la dau "?" Windows khong cho dat ten file
    const fromFile = (file || "").replace(/\s*\(\d+\)\s*$/, "").replace(/_/g, "?").trim();
    if (!title) return fromFile;
    // file va the cung 1 ten (khac hoa thuong / dau cau) -> ten file thuong viet hoa dung hon ("APT." thay vi "Apt.")
    return plain(fromFile) === plain(title) ? fromFile : title;
};

// names: ten ca si chinh cua cac bai sap nhap; dbNames: ca si da co trong DB
// -> Map(ten goc -> ten dung chung). Trung ten (khong dau) voi DB thi dung ten DB;
// khong thi lay cach viet gap nhieu nhat, hoa thi uu tien co dau tieng Viet roi ten dai hon.
const canonicalArtists = (names, dbNames = []) => {
    const groups = new Map();
    for (const name of names) {
        if (!name) continue;
        const key = plain(name);
        if (!groups.has(key)) groups.set(key, new Map());
        const counts = groups.get(key);
        counts.set(name, (counts.get(name) || 0) + 1);
    }
    const result = new Map();
    for (const [key, counts] of groups) {
        const inDb = dbNames.find((n) => plain(n) === key);
        const accented = (s) => (/[^\x00-\x7F]/.test(s) ? 1 : 0);
        const best = inDb || [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || accented(b[0]) - accented(a[0]) || b[0].length - a[0].length)[0][0];
        for (const name of counts.keys()) result.set(name, best);
    }
    return result;
};

const cleanAlbum = (album) => (!album || /nhaccuatui/i.test(album) ? null : album.trim());

// ---------------- the loai ----------------

// the loai trong DB: pop / ballad / rap / thư giãn. tag: the loai ID3 (kieu NCT: "Nhạc Trẻ", "Rap Việt", "Âu Mỹ khác"...)
// artistGenre: the loai nhieu nhat cua cac bai khac cung ca si; vibe: vibe da doan
const mapGenre = ({ tag, artistGenre, vibe }) => {
    const t = plain(tag);
    if (/rap|hip hop|hiphop/.test(t)) return "rap";
    const slow = vibe === "sad" || vibe === "neutral";
    // nhac Viet chung chung: cham / buon -> ballad, con lai -> pop
    if (/nhac tre|v pop|vpop|tru tinh|bolero|ballad/.test(t)) return slow ? "ballad" : "pop";
    if (t) return "pop";   // Pop, Âu Mỹ, Rock, Dance...
    if (artistGenre) return artistGenre;
    return vibe === "sad" ? "ballad" : "pop";
};

// ---------------- vibe ----------------

// tu khoa theo vibe (viet thuong, co dau). Khong dua "yêu" / "love" / "baby" / "tonight" vao: bai tinh nao cung co,
// khong noi len vui hay buon.
const LEXICON = {
    sad: [
        "buồn", "khóc", "nước mắt", "lệ", "cô đơn", "một mình", "đau", "chia tay", "chia ly", "biệt ly", "xa rời",
        "rời xa", "tiếc nuối", "nuối tiếc", "lãng quên", "quên", "nhớ", "sầu", "tan vỡ", "vỡ tan", "giá như",
        "phôi pha", "nhạt nhòa", "dĩ vãng", "chẳng còn", "không còn", "lời cuối", "xót xa", "day dứt", "hối hận",
        "lạnh lẽo", "đơn côi", "không có em", "vắng em", "thiếu em", "tổn thương", "người cũ", "đã từng", "mất em", "mất anh",
        "sad", "sadness", "cry", "crying", "tears", "lonely", "alone", "goodbye", "hurt", "pain", "broken",
        "heartbreak", "sorry", "lost", "gone", "forget", "faded", "regret", "miss you", "without you", "should be me",
    ],
    happy: [
        "vui", "hạnh phúc", "nụ cười", "cười", "yêu đời", "rực rỡ", "nắng", "mùa xuân", "nhảy", "quẩy", "tươi",
        "ngọt ngào", "bên nhau", "trao cho anh", "say mê", "lung linh", "hân hoan",
        "happy", "smile", "dance", "dancing", "party", "sunshine", "fun", "funk", "beautiful", "perfect",
        "celebrate", "shake", "groove", "sweet", "kiss",
    ],
    angry: [
        "ghét", "giận", "hận", "căm", "điên", "chửi", "đéo", "vcl", "khốn", "phản bội", "lừa dối", "cút",
        "hate", "angry", "mad", "rage", "fuck", "fucking", "shit", "damn", "bitch", "kill", "fight", "war", "bullshit",
    ],
    neutral: [
        "bình yên", "nhẹ nhàng", "êm", "chill", "thư giãn", "mơ", "mộng", "ánh trăng", "chiều", "gió", "mưa",
        "cà phê", "lặng", "bầu trời", "thong thả",
        "calm", "slow", "easy", "dream", "moon", "breathe", "relax", "peaceful", "quiet", "rain", "sky",
    ],
    surprise: [
        "lạ", "lạ lùng", "bất ngờ", "khám phá", "phiêu", "bay", "điên rồ", "kỳ lạ",
        "wow", "crazy", "wild", "adventure", "strange", "magic", "wonder", "risk",
    ],
};

// tu MANH (noi thang cam xuc) = 2 diem moi lan, tu con lai = 1 diem
const STRONG = new Set([
    "buồn", "khóc", "nước mắt", "cô đơn", "chia tay", "tan vỡ", "sầu", "không có em",
    "sad", "sadness", "cry", "crying", "tears", "lonely", "heartbreak", "broken",
    "vui", "hạnh phúc", "nụ cười", "happy", "party", "dance", "dancing", "smile", "celebrate",
    "ghét", "hận", "chửi", "đéo", "vcl", "cút", "hate", "rage", "fuck", "fucking", "shit", "bitch", "bullshit",
    "bình yên", "thư giãn", "chill", "calm", "relax", "peaceful",
    "bất ngờ", "khám phá", "crazy", "wild", "adventure",
]);

// nang luong (cot songs.energy 0..1) theo vibe
const VIBE_ENERGY = { happy: 0.8, angry: 0.9, surprise: 0.7, neutral: 0.4, sad: 0.3 };

const norm = (s) => (s || "").normalize("NFC").toLowerCase();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// dem tu nguyen ven (khong dem "cười" trong "cuối", "lệ" trong "lệch")
const countWord = (text, word) => {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, "gu");
    return (text.match(re) || []).length;
};

// loi LRC -> chu tron (bo "[00:12.30]", "[ar: ...]")
const lyricsText = (lrc) => (lrc || "").split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]*\]/g, "").trim()).filter(Boolean).join("\n");

const MAX_PER_WORD = 3;     // moi tu tinh toi da 3 lan (diep khuc)
const TITLE_WEIGHT = 5;     // tu khoa trong ten bai (nguoi viet chu y chon) nang gap 5
const MIN_EVIDENCE = 2;     // tong diem duoi muc nay -> khong du bang chung

// -> { vibe, source: "lyrics" | "title" | "default", confidence 0..1, evidence: [tu khoa], review: true/false }
const guessVibe = ({ title, lyrics }) => {
    const t = norm(title);
    const l = norm(lyrics);
    const scores = Object.entries(LEXICON).map(([vibe, words]) => {
        let fromTitle = 0;
        let fromLyrics = 0;
        const hits = [];
        for (const word of new Set(words)) {
            const weight = STRONG.has(word) ? 2 : 1;
            const inTitle = countWord(t, word) ? TITLE_WEIGHT * weight : 0;
            const inLyrics = Math.min(MAX_PER_WORD, countWord(l, word)) * weight;
            if (inTitle || inLyrics) hits.push(word);
            fromTitle += inTitle;
            fromLyrics += inLyrics;
        }
        return { vibe, score: fromTitle + fromLyrics, fromTitle, fromLyrics, hits };
    }).sort((a, b) => b.score - a.score);

    const total = scores.reduce((sum, s) => sum + s.score, 0);
    const top = scores[0];
    if (total < MIN_EVIDENCE) {
        return { vibe: "neutral", source: "default", confidence: 0, evidence: [], review: true };
    }
    const confidence = top.score / total;
    return {
        vibe: top.vibe,
        source: top.fromTitle >= top.fromLyrics ? "title" : "lyrics",
        confidence: Math.round(confidence * 100) / 100,
        evidence: top.hits.slice(0, 5),
        review: confidence < 0.5 || top.score < 4,
    };
};

module.exports = {
    plain, primaryArtist, cleanTitle, canonicalArtists, cleanAlbum, mapGenre,
    LEXICON, VIBE_ENERGY, lyricsText, guessVibe,
};
