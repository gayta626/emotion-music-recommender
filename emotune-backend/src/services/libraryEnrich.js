const path = require("path");
const { spawn } = require("child_process");
const { karaokeReady, alignReady } = require("../../scripts/lib/karaoke");

// Sau khi admin them bai tren web: chay NEN cac script san co (giong buoc cuoi cua `npm run import-music -- --apply`)
// - fetch-images: anh ca si moi + bia con thieu
// - fetch-song-info: album con thieu (thoi luong da co)
// - fetch-mv: MV YouTube cho bai chua tim (chi khi .env co YOUTUBE_API_KEY)
// - align-mv: do lech MV / mp3 de doi qua lai nhac noi tiep dung doan (chi khi .venv-karaoke co yt-dlp)
// - make-karaoke: AI tach giong (Demucs) -> nhac dem + cao do ca si cho karaoke / cham diem (chi khi may da cai .venv-karaoke)
// Cac script chi dien cho con thieu -> chay lai nhieu lan khong sao. Moi luc chi 1 luot; dang chay ma co bai moi
// thi danh dau chay them 1 luot nua khi xong (bai moi them giua chung van duoc xu ly).

const ROOT = path.join(__dirname, "..", "..");
const LOG_LINES = 30;

const state = {
    running: false,
    pending: false,
    step: null,          // script dang chay
    startedAt: null,
    finishedAt: null,
    results: [],         // [{ script, ok }] cua luot gan nhat
    log: [],             // vai dong cuoi (de admin xem script bao gi)
};

const scriptsToRun = () => {
    const list = ["fetch-images.js", "fetch-song-info.js"];
    if (process.env.YOUTUBE_API_KEY) list.push("fetch-mv.js");
    if (alignReady()) list.push("align-mv.js");
    // de cuoi: nang nhat (GPU ~10s / bai, CPU vai phut) va khong can cho buoc nao khac
    if (karaokeReady()) list.push("make-karaoke.js");
    return list;
};

const pushLog = (text) => {
    text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).forEach((l) => state.log.push(l));
    if (state.log.length > LOG_LINES) state.log.splice(0, state.log.length - LOG_LINES);
};

const runScript = (script) => new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, "scripts", script)], { cwd: ROOT, env: process.env });
    child.stdout.on("data", (d) => pushLog(d.toString()));
    child.stderr.on("data", (d) => pushLog(d.toString()));
    child.on("error", (err) => { pushLog(`${script}: ${err.message}`); resolve(false); });
    child.on("close", (code) => resolve(code === 0));
});

const runAll = async () => {
    state.running = true;
    state.pending = false;
    state.startedAt = new Date().toISOString();
    state.results = [];
    state.log = [];
    for (const script of scriptsToRun()) {
        state.step = script;
        pushLog(`== ${script} ==`);
        const ok = await runScript(script);
        state.results.push({ script, ok });
    }
    state.step = null;
    state.running = false;
    state.finishedAt = new Date().toISOString();
    if (state.pending) runAll();
};

// goi sau khi them / sua bai; khong cho (request tra ve ngay, script chay nen)
const enrichLibrary = () => {
    if (state.running) {
        state.pending = true;
        return;
    }
    runAll().catch((err) => {
        console.error("Loi chay script lam day kho nhac:", err);
        state.running = false;
        state.step = null;
    });
};

const getEnrichStatus = () => ({
    running: state.running,
    pending: state.pending,
    step: state.step,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    results: state.results,
    log: state.log,
    mvSearch: !!process.env.YOUTUBE_API_KEY,
    karaoke: karaokeReady(),
});

module.exports = { enrichLibrary, getEnrichStatus, scriptsToRun };
