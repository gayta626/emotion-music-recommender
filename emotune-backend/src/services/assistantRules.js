// Bo luat hieu lenh cua tro ly giong noi (H6). HAM THUAN: khong goi DB / mang -> unit test duoc.
// Vao: cau noi (chu, Web Speech da chuyen tu giong) + danh muc { songs, artists, playlists } cua nguoi dung
// Ra: { action, reply }  - dang action: docs/superpowers/specs/2026-10-09-voice-assistant-design.md muc 4.1
// Thu tu xet: (cau tra loi cho lan hoi lai) -> dieu khien nhac -> trang co dinh -> ten bai/ca si/playlist -> cam xuc -> unknown

const EMOTIONS = ["happy", "sad", "angry", "surprise", "neutral"];
const CONTROLS = ["pause", "resume", "next", "volume_up", "volume_down", "mute", "not_for_me"];

// trang hop le cho navigate; words = cum tu (khong dau) nhan ra trang do
const PAGES = [
    { path: "/", name: "trang chủ", words: ["trang chu", "home"] },
    { path: "/scan", name: "màn quét cảm xúc", words: ["quet", "scan"] },
    { path: "/now-playing", name: "màn đang phát", words: ["dang phat", "now playing"] },
    { path: "/lyrics", name: "lời bài hát", words: ["loi bai hat", "loi bai", "lyrics"] },
    { path: "/stats", name: "trang thống kê", words: ["thong ke", "tam trang", "stats"] },
    { path: "/settings", name: "trang cài đặt", words: ["cai dat", "settings"] },
    { path: "/survey", name: "khảo sát gu nhạc", words: ["khao sat", "survey"] },
];

// xet theo DUNG thu tu nay: cum dai / de nham dung truoc ("khong thich bai nay" truoc "bai")
const CONTROL_WORDS = [
    ["not_for_me", ["khong thich bai nay", "khong thich bai", "bai nay chan", "not for me"]],
    ["next", ["bai tiep", "bai khac", "bai sau", "chuyen bai", "qua bai", "doi bai", "next"]],
    // "dung phat (tiep) nua" / "tat nhac" xet TRUOC resume (trong cau co the co "phat tiep")
    ["pause", ["dung phat", "tat nhac"]],
    ["resume", ["tiep tuc", "phat tiep", "phat lai", "choi tiep", "resume"]],
    ["pause", ["tam dung", "dung lai", "dung nhac", "dung di", "ngung", "pause"]],
    // "bat / mo tieng": volume_up tren client da bo tat tieng -> co tieng lai sau "tat tieng"
    ["volume_up", ["to len", "lon len", "tang am", "to hon", "lon hon", "bat tieng", "mo tieng"]],
    ["volume_down", ["nho lai", "be lai", "giam am", "nho hon", "nho xuong", "nho di"]],
    ["mute", ["tat tieng", "tat am", "im lang", "mute"]],
];

// ca cau CHI la "bat nhac / phat nhac / mo nhac" (+ "di / len / nha / nhe" o cuoi) -> phat tiep
// (khong xet dang cum: "phat nhac Son Tung" van la phat ca si)
const BARE_RESUME = ["bat nhac", "phat nhac", "mo nhac"];
const TRAILING_FILLER = ["di", "len", "nha", "nhe"];

const CONTROL_REPLIES = {
    pause: "Đã tạm dừng.",
    resume: "Phát tiếp nhé.",
    next: "Chuyển sang bài tiếp theo.",
    volume_up: "Đã tăng âm lượng.",
    volume_down: "Đã giảm âm lượng.",
    mute: "Đã tắt tiếng.",
    not_for_me: "Ok, mình bỏ qua bài này.",
};

// "xem / vao / trang ..." = muon MO TRANG; "phat / nghe / bat / mo ..." = muon NGHE
const NAV_VERBS = ["xem", "trang", "vao", "di toi", "di den", "chuyen sang", "chuyen toi", "mo trang", "mo man"];
const PLAY_VERBS = ["phat", "nghe", "bat", "mo bai", "mo nhac", "cho nghe", "play", "mo"];

// tu dien cam xuc (khong dau). Xet theo thu tu nay; cum de nham (vd "tuc" trong "tiep tuc") chi dung dang cum
const MOOD_WORDS = [
    ["surprise", ["bat ngo", "ngac nhien", "khong ngo", "soc", "wow"]],
    // "tuc" / "chan" le KHONG dung ("tiep tuc", "Kho Giu Chan Thanh") -> chi dang cum
    ["angry", ["tuc gian", "tuc qua", "tuc minh", "minh tuc", "dang tuc", "tuc that", "gian du", "gian qua", "dang gian",
        "gian ghe", "buc minh", "buc qua", "buc boi", "cau qua", "cau gat", "kho chiu", "dien qua", "phat dien"]],
    ["sad", ["buon", "chan qua", "chan nan", "chan doi", "hoi chan", "chan that", "met", "co don", "khoc", "that tinh",
        "nan long", "stress", "ap luc"]],
    ["happy", ["vui", "yeu doi", "phan khoi", "hanh phuc", "sung suong", "hao hung", "tuyet voi"]],
    ["neutral", ["binh thuong", "chill", "thu gian", "binh yen"]],
];
// "khong vui" -> buon; "khong buon / khong gian" -> binh thuong
const NEGATORS = ["khong", "chang", "cha", "dau", "chua"];
const NEGATED = { happy: "sad", sad: "neutral", angry: "neutral", surprise: "neutral", neutral: "neutral" };
// ten chi gom tu cam xuc + tu dem ("Buon", "Nhac Buon", "Nhac Vui", "Chill") -> khi cau ke cam xuc ma khong noi ro
// "playlist / bai / ca si" thi hieu la CAM XUC, khong phai ten ("minh buon" != phat playlist "Buon")
const MOODISH_WORDS = new Set([
    ...MOOD_WORDS.flatMap(([, phrases]) => phrases.flatMap((p) => p.split(" "))),
    "nhac", "bai", "hat", "list", "playlist", "nhung",
]);
const MOOD_LABELS = { happy: "vui", sad: "buồn", angry: "bực bội", surprise: "bất ngờ", neutral: "bình thường" };

// so thu tu khi tra loi cau hoi lai ("cai thu hai")
const ORDINALS = [
    [0, ["dau tien", "thu nhat", "so 1", "thu 1", "cai 1", "so mot"]],
    [1, ["thu hai", "so 2", "thu 2", "cai 2", "so hai"]],
    [2, ["thu ba", "so 3", "thu 3", "cai 3", "so ba"]],
    [3, ["thu tu", "so 4", "thu 4", "cai 4", "so bon"]],
];

const MIN_SCORE = 0.6;       // ty le chu trong ten co mat trong cau de thanh ung vien
const BARE_MIN_SCORE = 0.8;  // chi noi ten, khong dong tu -> doi khop chac hon (tranh cau ke cam xuc trung vai chu ten bai)
const CLOSE_GAP = 0.15;      // ung vien cach diem cao nhat <= 0.15 -> coi la trung, hoi lai
const MAX_CANDIDATES = 4;

// bo dau (d/D -> d), chu thuong, bo "(feat. ...)" va dau cau -> "son tung m tp"
const normalize = (text) => (text || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toWords = (text) => normalize(text).split(" ").filter(Boolean);

// vi tri bat dau cua cum tu trong mang chu (so khop tron chu, khong khop nua chu), -1 neu khong co
const findPhrase = (words, phrase) => {
    const parts = phrase.split(" ");
    for (let i = 0; i + parts.length <= words.length; i++) {
        if (parts.every((p, j) => words[i + j] === p)) return i;
    }
    return -1;
};

const has = (words, phrases) => phrases.some((p) => findPhrase(words, p) !== -1);

// co mot doan tu LIEN TIEP (nguyen tu, khong cat giua tu) ghep lai bang dung nameCompact?
// ("nghe hieu thu hai" -> "hieu thu hai" = "hieuthuhai"; "nha anh" KHONG khop "haanh")
const hasJoinedRun = (words, nameCompact) => {
    for (let i = 0; i < words.length; i++) {
        let joined = "";
        for (let j = i; j < words.length && joined.length < nameCompact.length; j++) {
            joined += words[j];
            if (joined === nameCompact) return true;
        }
    }
    return false;
};

// diem khop ten: ca ten ghep tu mot doan tu lien tiep = 1 ("hieuthuhai", "sontungmtp");
// nguoc lai = doan chu LIEN TIEP dai nhat (dung thu tu) chung giua ten va cau / so chu cua ten (chi xet chu >= 2 ky tu)
// -> chu thong dung nam rai rac trong cau ("lan nua nha", "sao con buon") khong ghep thanh ten ("Lan Nha", "...Sao Con")
const scoreName = (words, name) => {
    const all = toWords(name);
    const nameCompact = all.join("");
    if (nameCompact.length >= 4 && hasJoinedRun(words, nameCompact)) return 1;
    const nameWords = all.filter((w) => w.length >= 2);
    if (!nameWords.length) return 0;
    const said = words.filter((w) => w.length >= 2);
    let best = 0;
    for (let i = 0; i < said.length; i++) {
        for (let j = 0; j < nameWords.length; j++) {
            let k = 0;
            while (i + k < said.length && j + k < nameWords.length && said[i + k] === nameWords[j + k]) k++;
            best = Math.max(best, k);
        }
    }
    return best / nameWords.length;
};

// ten xuat hien NGUYEN VEN, dung thu tu, lien nhau trong cau ("phat bai gia nhu") hoac ghep lien ("sontungmtp")
const sayFullName = (words, name) => {
    const all = toWords(name);
    if (!all.length) return false;
    const nameCompact = all.join("");
    return findPhrase(words, all.join(" ")) !== -1 || (nameCompact.length >= 4 && hasJoinedRun(words, nameCompact));
};

// bo cum "tam trang" truoc khi tim dong tu mo trang: chu "trang" trong "tam trang" khong phai "trang"
const withoutTamTrang = (words) => {
    const out = [];
    for (let i = 0; i < words.length; i++) {
        if (words[i] === "tam" && words[i + 1] === "trang") i++;
        else out.push(words[i]);
    }
    return out;
};
const wantsPage = (words) => has(withoutTamTrang(words), NAV_VERBS);

const isMoodishName = (name) => toWords(name).every((w) => MOODISH_WORDS.has(w));

const songsOf = (catalog, artistId) => catalog.songs.filter((s) => s.artist_id === artistId);

// muc that trong danh muc (null neu khong co) - dung cho ket qua luat, pending tu client va LLM
const entityOf = (catalog, kind, id) => {
    const list = kind === "song" ? catalog.songs
        : kind === "artist" ? catalog.artists
            : kind === "playlist" ? catalog.playlists : null;
    const item = list && list.find((x) => x.id === id);
    if (!item) return null;
    return { kind, id, name: kind === "song" ? item.title : item.name };
};

const kindHintOf = (words) => (has(words, ["ca si", "nghe si"]) ? "artist"
    : has(words, ["playlist", "danh sach phat"]) ? "playlist"
        : has(words, ["bai", "bai hat"]) ? "song" : null);

// cac muc khop ten, diem giam dan; chi giu nhom "sat nut" voi muc cao nhat
// emotion: cam xuc trong cau -> neu khong noi ro loai thi bo qua ten chi gom tu cam xuc (de nhanh cam xuc xu ly)
const findEntities = (words, catalog, emotion = null) => {
    const hint = kindHintOf(words);
    let all = [
        ...catalog.songs.map((s) => ({ kind: "song", id: s.id, name: s.title, detail: s.artist || "" })),
        ...catalog.artists.map((a) => ({ kind: "artist", id: a.id, name: a.name, detail: `${songsOf(catalog, a.id).length} bài` })),
        ...catalog.playlists.map((p) => ({ kind: "playlist", id: p.id, name: p.name, detail: "playlist" })),
    ]
        .map((c) => ({ ...c, score: scoreName(words, c.name), full: sayFullName(words, c.name) }))
        .filter((c) => c.score >= MIN_SCORE)
        .filter((c) => !(emotion && !hint && isMoodishName(c.name)));
    // ten noi nguyen ven nam TRONG mot ten dai hon cung noi nguyen ven -> bo ("nhac buon": giu "Nhac Buon", bo "Buon")
    const fullNames = all.filter((c) => c.full).map((c) => toWords(c.name));
    all = all.filter((c) => {
        if (!c.full) return true;
        const mine = toWords(c.name);
        return !fullNames.some((other) => other.length > mine.length && findPhrase(other, mine.join(" ")) !== -1);
    });
    const hinted = hint ? all.filter((c) => c.kind === hint) : [];
    const list = (hinted.length ? hinted : all).sort((a, b) => b.score - a.score);
    if (!list.length) return [];
    return list.filter((c) => c.score >= list[0].score - CLOSE_GAP).slice(0, MAX_CANDIDATES);
};

const unknownAction = () => ({
    action: { type: "unknown" },
    reply: "Mình chưa hiểu. Bạn thử nói: “phát nhạc Sơn Tùng”, “bài tiếp” hoặc “mở trang thống kê” nhé.",
});

const controlAction = (command) => ({ action: { type: "control", command }, reply: CONTROL_REPLIES[command] });

// loi dan noi TRUOC khi phat (tro ly doc xong, dong man hinh roi moi phat) -> "Minh se phat ..."
const playAction = (catalog, entity) => {
    if (entity.kind === "song") {
        const song = catalog.songs.find((s) => s.id === entity.id);
        const by = song.artist ? ` của ${song.artist}` : "";
        return { action: { type: "play", kind: "song", song }, reply: `Mình sẽ phát bài “${song.title}”${by} nhé.` };
    }
    if (entity.kind === "artist") {
        const songs = songsOf(catalog, entity.id);
        if (!songs.length) {
            return { action: { type: "navigate", path: `/artist/${entity.id}` }, reply: `${entity.name} chưa có bài nào, mình mở trang ca sĩ nhé.` };
        }
        return { action: { type: "play", kind: "artist", queue: { name: entity.name, songs } }, reply: `Mình sẽ phát nhạc của ${entity.name} nhé.` };
    }
    // playlist rong (songCount = 0 tu playlistModel) -> mo trang playlist; khong co songCount -> coi nhu co bai
    const playlist = catalog.playlists.find((p) => p.id === entity.id);
    if (playlist && playlist.songCount === 0) {
        return { action: { type: "navigate", path: `/playlist/${entity.id}` }, reply: `Playlist ${entity.name} chưa có bài nào, mình mở trang playlist nhé.` };
    }
    return { action: { type: "play", kind: "playlist", playlistId: entity.id }, reply: `Mình sẽ phát playlist “${entity.name}” nhé.` };
};

// bai hat khong co trang rieng -> "xem bai X" = phat bai X
const navigateAction = (catalog, entity) => {
    if (entity.kind === "song") return playAction(catalog, entity);
    const path = entity.kind === "artist" ? `/artist/${entity.id}` : `/playlist/${entity.id}`;
    return { action: { type: "navigate", path }, reply: `Đang mở trang ${entity.name}.` };
};

const runIntent = (intent, catalog, entity) => (intent === "navigate"
    ? navigateAction(catalog, entity)
    : playAction(catalog, entity));

const chooseAction = (intent, found) => {
    const candidates = found.map(({ kind, id, name, detail }) => ({ kind, id, name, detail }));
    const list = candidates.map((c) => `${c.name} (${c.detail})`).join(", ");
    return { action: { type: "choose", intent, candidates }, reply: `Mình thấy ${candidates.length} kết quả: ${list}. Bạn chọn cái nào?` };
};

// nhanh ten bai / ca si / playlist: co dong tu "xem/trang..." -> mo trang, nguoc lai -> phat; nhieu muc -> hoi lai
const nameBranch = (words, catalog, found) => {
    const intent = wantsPage(words) ? "navigate" : "play";
    if (found.length >= 2) return chooseAction(intent, found);
    return runIntent(intent, catalog, found[0]);
};

const detectEmotion = (words) => {
    for (const [emotion, phrases] of MOOD_WORDS) {
        for (const phrase of phrases) {
            const at = findPhrase(words, phrase);
            if (at === -1) continue;
            // phu dinh: "khong / chang / chua ..." trong 2 chu ngay truoc
            const before = words.slice(Math.max(0, at - 2), at);
            const negated = phrase !== "khong ngo" && before.some((w) => NEGATORS.includes(w));
            return negated ? NEGATED[emotion] : emotion;
        }
    }
    return null;
};

const moodAction = (emotion) => ({
    action: { type: "mood", emotion },
    reply: `Bạn đang thấy ${MOOD_LABELS[emotion]}, để mình chọn bài hợp tâm trạng nhé.`,
});

// pending gui tu client: chi giu dung dang, toi da 4 ung vien (id kiem lai voi danh muc o resolvePending)
const sanitizePending = (raw) => {
    if (!raw || !["navigate", "play"].includes(raw.intent) || !Array.isArray(raw.candidates)) return null;
    const candidates = raw.candidates.slice(0, MAX_CANDIDATES)
        .filter((c) => c && ["song", "artist", "playlist"].includes(c.kind) && Number.isInteger(c.id))
        .map((c) => ({ kind: c.kind, id: c.id, name: String(c.name || "") }));
    return candidates.length ? { intent: raw.intent, candidates } : null;
};

// cau tra loi cho lan hoi lai -> muc that trong danh muc (null = khong phai cau tra loi -> xu ly nhu cau moi)
const resolvePending = (words, pending, catalog, pick) => {
    const list = pending.candidates;
    let index = Number.isInteger(pick) ? pick : -1;
    if (index < 0) {
        // noi lai ten: chi nhan khi 1 ung vien khop hon han (trung ten hoan toan -> phai noi so thu tu)
        const scored = list.map((c, i) => ({ i, score: scoreName(words, c.name) }))
            .sort((a, b) => b.score - a.score);
        if (scored[0] && scored[0].score >= MIN_SCORE && (scored.length === 1 || scored[1].score < scored[0].score)) {
            index = scored[0].i;
        }
    }
    if (index < 0 && has(words, ["cuoi", "cuoi cung"])) index = list.length - 1;
    for (const [i, phrases] of ORDINALS) {
        if (index < 0 && has(words, phrases)) index = i;
    }
    const c = list[index];
    return c ? entityOf(catalog, c.kind, c.id) : null;
};

const parseCommand = (text, catalog, { pending = null, pick = null } = {}) => {
    const words = toWords(text);

    // 0a. dang hoi lai "ban chon cai nao?" -> thu hieu cau nay la cau tra loi
    if (pending) {
        const picked = resolvePending(words, pending, catalog, pick);
        if (picked) return runIntent(pending.intent, catalog, picked);
    }
    if (!words.length) return unknownAction();

    // 0. ten noi NGUYEN VEN, lien nhau + co dong tu -> uu tien truoc dieu khien
    // (khong de "phat bai Tiep Tuc Yeu" bi hieu thanh lenh "bai tiep")
    const emotionInSentence = detectEmotion(words);
    const hasVerb = wantsPage(words) || has(words, PLAY_VERBS);
    const found = findEntities(words, catalog, emotionInSentence);
    if (found.some((c) => c.full) && hasVerb) return nameBranch(words, catalog, found);

    // 1. dieu khien nhac
    let core = words.length;
    while (core > 1 && TRAILING_FILLER.includes(words[core - 1])) core--;
    if (BARE_RESUME.includes(words.slice(0, core).join(" "))) return controlAction("resume");
    for (const [command, phrases] of CONTROL_WORDS) {
        if (has(words, phrases)) return controlAction(command);
    }
    if (words.length === 1 && words[0] === "dung") return controlAction("pause");

    // 2. trang co dinh: can dong tu mo trang, hoac cau ngan ("lời bài hát")
    const page = PAGES.find((p) => has(words, p.words));
    // "toi tam trang buon": tu "trang" nam trong chinh ten trang ("tam trang") khong duoc tinh la dong tu mo trang,
    // va cau ngan chi la lenh mo trang khi KHONG ke cam xuc
    if (page) {
        let verbWords = words;
        if (emotionInSentence) {
            const phrase = page.words.find((p) => findPhrase(words, p) !== -1);
            const at = findPhrase(words, phrase);
            verbWords = withoutTamTrang([...words.slice(0, at), ...words.slice(at + phrase.split(" ").length)]);
        }
        if (has(verbWords, NAV_VERBS) || has(verbWords, ["mo"]) || (words.length <= 4 && !emotionInSentence)) {
            return { action: { type: "navigate", path: page.path }, reply: `Đang mở ${page.name}.` };
        }
    }

    // 3. ten bai / ca si / playlist (ten khong dong tu chi nhan khi khop chac)
    if (found.length && (hasVerb || found[0].score >= BARE_MIN_SCORE)) {
        return nameBranch(words, catalog, found);
    }

    // 4. ke cam xuc -> goi y bai
    if (emotionInSentence) return moodAction(emotionInSentence);

    return unknownAction();
};

// Ket qua LLM KHONG duoc tin thang: chi nhan loai hanh dong, trang, id co trong danh muc; sai -> unknown
// Cau tra loi cua LLM chi dung khi hanh dong giu nguyen loai (vd ca si chua co bai -> mo trang, dung cau cua luat)
const validateLlmAction = (raw, catalog) => {
    if (!raw || typeof raw !== "object") return unknownAction();
    const reply = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 200) : "";
    const withReply = (result) => (reply && result.action.type === raw.type ? { ...result, reply } : result);

    switch (raw.type) {
        case "navigate": {
            const page = PAGES.find((p) => p.path === raw.path);
            if (page) return withReply({ action: { type: "navigate", path: page.path }, reply: `Đang mở ${page.name}.` });
            const m = /^\/(artist|playlist)\/(\d+)$/.exec(raw.path || "");
            const entity = m && entityOf(catalog, m[1], Number(m[2]));
            return entity ? withReply(navigateAction(catalog, entity)) : unknownAction();
        }
        case "play": {
            const entity = entityOf(catalog, raw.kind, raw.id);
            return entity ? withReply(playAction(catalog, entity)) : unknownAction();
        }
        case "mood":
            return EMOTIONS.includes(raw.emotion) ? withReply(moodAction(raw.emotion)) : unknownAction();
        case "control":
            return CONTROLS.includes(raw.command) ? withReply(controlAction(raw.command)) : unknownAction();
        default:
            return unknownAction();
    }
};

module.exports = {
    EMOTIONS, CONTROLS, PAGES, MIN_SCORE,
    normalize, toWords, findPhrase, has, scoreName, entityOf,
    playAction, navigateAction, runIntent, controlAction, unknownAction,
    sanitizePending, moodAction, parseCommand, validateLlmAction,
};
