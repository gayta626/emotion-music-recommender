// Tim loi bai hat tren LRCLIB (lrclib.net: kho loi bai mien phi, khong can key) — dung chung cho
// fetch-lyrics (tai loi cho bai trong DB) va import-music (tai loi khi nhap bai moi + doan vibe tu loi).
const MAX_DIFF_S = 3;

// "Sơn Tùng M-TP" -> "son tung m tp" (so khop khong dau, khong phan biet hoa thuong)
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// bo phan trong ngoac: "Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)" -> "Nếu Như Ta Chẳng Còn"
const baseTitle = (s) => s.replace(/[([].*?[)\]]/g, "").trim();
// ban phu (remix, live, mashup...) -> khong lay loi cua ban do
const ALT_VERSION = /remix|live|speed|slowed|lofi|lo-fi|acoustic|instrumental|karaoke|beat|mashup/i;

const lrclibSearch = async (params) => {
    const res = await fetch("https://lrclib.net/api/search?" + new URLSearchParams(params), {
        headers: { "User-Agent": "EmoTune student project (fetch-lyrics)" },
    });
    if (!res.ok) throw new Error(`LRCLIB tra loi ${res.status}`);
    return res.json();
};

// Chon ket qua: ca si khop, ten bai khop (bo phan trong ngoac), khong phai ban phu, co loi.
// Uu tien loi co moc thoi gian cua ban dai gan bang file mp3; khong co -> loi thuong cua ban gan nhat.
const pickLyrics = (results, song, duration) => {
    const artist = plain(song.artist);
    const title = plain(baseTitle(song.title));
    const ok = results.filter((r) =>
        (plain(r.artistName).includes(artist) || artist.includes(plain(r.artistName)))
        && plain(baseTitle(r.trackName)) === title
        && !ALT_VERSION.test(r.trackName)
        && !r.instrumental
        && (r.syncedLyrics || r.plainLyrics));
    const diff = (r) => (duration ? Math.abs(r.duration - duration) : Infinity);
    ok.sort((a, b) => diff(a) - diff(b));

    const synced = ok.find((r) => r.syncedLyrics && diff(r) <= MAX_DIFF_S);
    if (synced) return { text: synced.syncedLyrics, kind: `co moc thoi gian, lech ${diff(synced).toFixed(1)}s` };
    const plainHit = ok.find((r) => r.plainLyrics);
    if (plainHit) return { text: plainHit.plainLyrics, kind: "loi thuong (khong co ban dai khop file mp3)" };
    return null;
};

// tim loi 1 bai { title, artist } (duration: do dai mp3, giay) -> { text, kind } hoac null
const findLyrics = async (song, duration) => {
    let results = await lrclibSearch({ track_name: baseTitle(song.title), artist_name: song.artist });
    if (!results.length) results = await lrclibSearch({ q: `${baseTitle(song.title)} ${song.artist}` });
    return pickLyrics(results, song, duration);
};

module.exports = { findLyrics, pickLyrics };
