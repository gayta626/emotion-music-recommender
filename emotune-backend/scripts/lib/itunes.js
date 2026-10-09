// Tim bai hat tren iTunes Search API (mien phi, khong can key) — dung chung cho fetch-images (anh bia)
// va fetch-song-info (ten album). Chi nhan ket qua chac dung bai: ca si khop + ten bai khop, bo ban remix/live.

// iTunes chi cho ~20 lan tim / phut -> moi lan tim cach nhau 3,2 giay
const SEARCH_GAP_MS = 3200;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// "Sơn Tùng M-TP" -> "son tung m tp" (so khop khong dau, khong phan biet hoa thuong)
const plain = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// bo phan trong ngoac: "Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)" -> "Nếu Như Ta Chẳng Còn"
const baseTitle = (s) => s.replace(/[([].*?[)\]]/g, "").trim();
// ban phu (remix, live, speed up...) -> khong lay thong tin cua ban do
const ALT_VERSION = /remix|live|speed|slowed|lofi|lo-fi|acoustic|version|instrumental|karaoke|beat/i;

let lastSearch = 0;
const itunesSearch = async (params) => {
    const wait = lastSearch + SEARCH_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastSearch = Date.now();
    const url = "https://itunes.apple.com/search?" + new URLSearchParams({ country: "vn", limit: "10", ...params });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`iTunes tra loi ${res.status}`);
    return (await res.json()).results;
};

// Chon ket qua dung bai: ca si phai khop, ten bai khop nguyen ven truoc, sau do khop phan ngoai ngoac
// (bo ban remix/live). Khong ket qua nao du chac -> null (thay vi lay nham)
const pickTrack = (results, title, artist) => {
    const byArtist = results.filter((r) => plain(r.artistName).includes(plain(artist)));
    return byArtist.find((r) => plain(r.trackName) === plain(title))
        || byArtist.find((r) => plain(baseTitle(r.trackName)) === plain(baseTitle(title)) && !ALT_VERSION.test(r.trackName))
        || null;
};

// tim 1 bai theo ten + ca si -> ket qua iTunes (trackName, collectionName, artworkUrl100...) hoac null
const findTrack = async (title, artist) => {
    const results = await itunesSearch({ term: `${baseTitle(title)} ${artist}`, entity: "song" });
    return pickTrack(results, title, artist);
};

module.exports = { plain, baseTitle, ALT_VERSION, itunesSearch, pickTrack, findTrack, sleep };
