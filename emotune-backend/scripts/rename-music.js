// Doi ten file nhac trong music/ sang dang khong dau, chu thuong, noi bang "_"
// vd: "Nơi Này Có Anh - Sơn Tùng M-TP.mp3" -> "noi_nay_co_anh_son_tung_m_tp.mp3"
// Chay thu (chi in ra, khong doi): npm run rename-music
// Doi that:                        npm run rename-music -- --apply
const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, "..", "music")
const AUDIO_EXT = [".mp3", ".m4a", ".wav", ".ogg", ".flac"];

let slugify = (name) => {
    return name
        .normalize("NFD")                   // 1. tách chữ và dấu: "ơ" -> "o" + dấu móc
        .replace(/[̀-ͯ]/g, "")    // 2. xóa phần dấu đã tách ra
        .replace(/đ/g, "d").replace(/Đ/g, "D") // "đ" không tách được, phải thay tay
        .toLowerCase()                      // 3. chữ thường
        .replace(/[^a-z0-9]+/g, "_")        // 4. ký tự không phải chữ/số -> "_" (gộp luôn nhiều ký tự liền nhau)
        .replace(/^_+|_+$/g, "");           //    bỏ "_" ở đầu và cuối
}

let renameMusic = (apply) => {
    let files = fs.readdirSync(MUSIC_DIR);
    let used = new Set(files);   // cac ten dang co, de tranh ghi de khi trung ten
    let count = 0;

    for (let file of files) {
        let ext = path.extname(file).toLowerCase();         // ".MP3" -> ".mp3"
        if (!AUDIO_EXT.includes(ext)) continue;             // bo qua .gitignore, file khong phai nhac

        let base = slugify(path.basename(file, path.extname(file)));
        let newName = base + ext;
        if (newName === file) continue;                     // da dung dinh dang roi

        // trung ten: noi_nay_co_anh.mp3 da co -> noi_nay_co_anh_2.mp3
        let i = 2;
        while (used.has(newName)) {
            newName = `${base}_${i}${ext}`;
            i++;
        }

        console.log(`${file}  ->  ${newName}`);
        if (apply) {
            fs.renameSync(path.join(MUSIC_DIR, file), path.join(MUSIC_DIR, newName));
        }
        used.delete(file);
        used.add(newName);
        count++;
    }

    if (count === 0) console.log("Khong co file nao can doi ten.");
    else if (!apply) console.log(`\n(${count} file) Day la chay thu. Them --apply de doi that.`);
    else console.log(`\nDa doi ten ${count} file.`);
}

// chi chay khi goi truc tiep bang node, khong chay khi file khac require()
if (require.main === module) {
    renameMusic(process.argv.includes("--apply"));
}

module.exports = {
    slugify: slugify,
    renameMusic: renameMusic
}
