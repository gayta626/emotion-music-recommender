// npm run make-karaoke [-- --only ten.mp3] [-- --force] [-- --cpu]
// Tach giong ca si bang AI (Demucs) -> karaoke/<ten mp3>.beat.mp3 + karaoke/<ten mp3>.json (cao do giong ca si).
// Phan tach giong viet bang Python (scripts/make_karaoke.py) vi Demucs la model PyTorch; file nay chi goi venv rieng
// .venv-karaoke (khong dung chung venv cua emotion-scanner -> cai torch GPU khong anh huong AI nhan dien cam xuc).
//
// Cai lan dau (trong emotune-backend/, can Python 3 + ffmpeg):
//   py -m venv .venv-karaoke
//   .venv-karaoke\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cu130   (GPU NVIDIA; bo --index-url neu chi co CPU)
//   .venv-karaoke\Scripts\pip install demucs numpy
//   .venv-karaoke\Scripts\pip install yt-dlp      (them, cho `npm run align-mv`: do lech MV / mp3)
const { spawn } = require("child_process");
const path = require("path");
const { karaokePython, karaokeReady } = require("./lib/karaoke");

const python = karaokePython();

if (!karaokeReady()) {
    console.log("Chua co venv .venv-karaoke. Cai lan dau (trong emotune-backend/):");
    console.log("  py -m venv .venv-karaoke");
    console.log("  .venv-karaoke\\Scripts\\pip install torch --index-url https://download.pytorch.org/whl/cu130");
    console.log("  .venv-karaoke\\Scripts\\pip install demucs numpy");
    process.exit(1);
}

const child = spawn(python, [path.join(__dirname, "make_karaoke.py"), ...process.argv.slice(2)], {
    stdio: "inherit",
    // PYTHONUTF8: in tieng Viet tren Windows; tat canh bao symlink cua kho model HuggingFace
    env: { ...process.env, PYTHONUTF8: "1", HF_HUB_DISABLE_SYMLINKS_WARNING: "1", PYTHONWARNINGS: "ignore" },
});
child.on("exit", (code) => process.exit(code ?? 1));
