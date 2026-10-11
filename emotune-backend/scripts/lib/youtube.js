// Tim MV chinh thuc tren YouTube Data API v3 (can YOUTUBE_API_KEY trong .env) — dung cho `npm run fetch-mv`.
// Moi lan tim (search.list) ton 100 don vi / 10.000 don vi mien phi moi ngay -> ~100 bai / ngay.
// Chi nhan video CHAC la dung bai: ten bai co trong ten video, ca si khop ten video hoac ten kenh,
// khong phai ban cover / karaoke / remix / live...; nhieu video hop le -> lay video diem cao nhat.

// "Sơn Tùng M-TP" -> "son tung m tp" (so khop khong dau, khong phan biet hoa thuong)
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// bo phan trong ngoac: "Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)" -> "Nếu Như Ta Chẳng Còn"
const baseTitle = (s) => s.replace(/[([].*?[)\]]/g, "").trim();
// "Đen, MIN" / "Vũ. ft. Hà Nhi" -> "Đen" (ca si chinh dung de so khop)
const mainArtist = (s) => (s || "").split(/,|&| x | ft\.? | feat\.? /i)[0].trim();
// "a b" nam nguyen cum trong "x a b y" (khong khop nua chu: "em" khong khop "them")
const hasPhrase = (text, phrase) => phrase && ` ${text} `.includes(` ${phrase} `);

// ban khac ban goc -> bo (tru khi chinh ten bai co chu do, vd bai ten "Live")
const ALT_VERSION = /\b(cover|karaoke|remix|live|beat|instrumental|reaction|1 hour|loop|8d|slowed|speed up|sped up|nightcore|piano|acoustic|guitar|tutorial|hop am|lofi|lo fi|mashup|tiktok|shorts|making|teaser|trailer|behind the scenes|bts|awards?|performance|concert|60fps|upscaled?)\b/;
// ban "loi bai" / chi co tieng: van dung bai nhung kem MV -> tru diem, chi lay khi khong co MV
const WEAK_VERSION = /\b(lyrics?|audio|visualizer|vietsub)\b/;
const OFFICIAL = /\b(official|mv|m v|music video)\b/;
// chu "trang tri" hay gap trong ten video, khong tinh la chu thua
const FILLER = new Set(["official", "music", "video", "mv", "m", "v", "ft", "feat", "prod", "lyrics", "lyric", "audio",
    "vietsub", "hd", "4k", "visualizer", "x"]);
// ten bai ngan ("Em") de khop nham vao ten bai khac dai hon ("Anh Đếch Cần Gì Nhiều Ngoài Em"):
// bo ten bai, ca si, chu trang tri, phan trong ngoac -> con qua 3 chu thi khong phai bai nay
const MAX_EXTRA_WORDS = 3;
const extraWords = (videoTitle, songTitle, singer) => {
    const rest = ` ${plain(baseTitle(videoTitle))} `.replace(` ${songTitle} `, " ").replace(` ${singer} `, " ");
    return rest.split(" ").filter((w) => w && !FILLER.has(w)).length;
};

// items: [{ id, title, channel }] (ket qua search) -> { id, score } hoac null
const pickVideo = (items, title, artist) => {
    const songTitle = plain(baseTitle(title));
    const songPlain = plain(title);
    const singer = plain(mainArtist(artist));
    if (!songTitle || !singer) return null;

    let best = null;
    for (const item of items) {
        // chu Trung / Nhat / Han trong ten -> ban dang lai kem phu de nuoc ngoai, khong phai ban goc
        if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(item.title)) continue;
        const videoTitle = plain(item.title);
        const channel = plain(item.channel);
        if (!hasPhrase(videoTitle, songTitle)) continue;
        // so tren chu viet lien: kenh "LanaDelReyVEVO" -> "lanadelreyvevo" van chua "lanadelrey"
        const ch = channel.replace(/ /g, "");
        const sg = singer.replace(/ /g, "");
        const channelIsArtist = ch.includes(sg) || (ch.length >= 3 && sg.includes(ch));
        if (!hasPhrase(videoTitle, singer) && !channelIsArtist) continue;
        if (extraWords(item.title, songTitle, singer) > MAX_EXTRA_WORDS) continue;
        const alt = videoTitle.match(ALT_VERSION);
        if (alt && !songPlain.includes(alt[1])) continue;

        let score = 0;
        if (OFFICIAL.test(videoTitle)) score += 3;
        if (channelIsArtist) score += 2;
        if (/vevo/.test(channel)) score += 2;
        const weak = videoTitle.match(WEAK_VERSION);
        if (weak && !songPlain.includes(weak[1])) {
            // ban loi bai / chi co tieng do kenh la dang lai -> bo (de bi go, co khi sai loi); kenh ca si -> lay nhung tru diem
            if (!channelIsArtist) continue;
            score -= 3;
        }
        // giu thu tu YouTube khi bang diem (ket qua dau thuong lien quan nhat)
        if (!best || score > best.score) best = { id: item.id, score };
    }
    return best;
};

const searchVideos = async (query, key) => {
    const url = "https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams({
        part: "snippet",
        type: "video",
        videoEmbeddable: "true",   // chi lay video cho phep nhung vao web khac
        maxResults: "8",
        q: query,
        key,
    });
    const res = await fetch(url);
    const body = await res.json();
    if (body.error) {
        const err = new Error(body.error.message);
        // het han muc trong ngay -> dung ca script (tim tiep chi ton cong)
        err.quotaExceeded = body.error.errors?.some((e) => e.reason === "quotaExceeded");
        throw err;
    }
    return body.items.map((it) => ({ id: it.id.videoId, title: decodeEntities(it.snippet.title), channel: it.snippet.channelTitle }));
};

// API tra ten video co "&amp;", "&#39;"...
const decodeEntities = (s) => s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

module.exports = { pickVideo, searchVideos, mainArtist };
