// Loi bai hat dang LRC (file lyrics/<ten file mp3>.lrc do `npm run fetch-lyrics` tai ve):
//   "[01:02.35] Anh khong muon viet nhac buon"  -> dong co moc thoi gian (to sang theo nhac)
//   "Anh khong muon viet nhac buon"             -> loi thuong (hien ca bai, khong chay theo nhac)
const TIME_TAG = /\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g;
// the thong tin dau file LRC: [ar:Ca si], [ti:Ten bai], [length:03:14]...
const META_TAG = /^\[[a-z#]+:.*\]$/i;

// "cilu.mp3" -> "cilu.lrc"
export const lyricsFileName = (song) => song.file_path.replace(/\.[^.]+$/, "") + ".lrc";

// -> { synced: true, lines: [{ time (giay), text }] } hoac { synced: false, lines: [{ time: null, text }] }
// dong rong trong loi co moc thoi gian = doan nhac khong loi -> giu lai (text "") de dong truoc het sang
export const parseLrc = (raw) => {
    const synced = [];
    const plainLines = [];
    for (const row of raw.split(/\r?\n/)) {
        const tags = [...row.matchAll(TIME_TAG)];
        const text = row.replace(TIME_TAG, "").trim();
        if (tags.length) {
            // 1 dong co the co nhieu moc (doan dien lap lai): "[00:12.00][01:30.00] ..."
            for (const t of tags) synced.push({ time: Number(t[1]) * 60 + Number(t[2].replace(":", ".")), text });
        } else if (text && !META_TAG.test(text)) {
            plainLines.push({ time: null, text });
        }
    }
    if (!synced.length) return { synced: false, lines: plainLines };

    synced.sort((a, b) => a.time - b.time);
    // bo dong rong o dau va dong rong lien tiep (chi can 1 dau "nghi")
    const lines = synced.filter((line, i) => line.text || (i > 0 && synced[i - 1].text));
    return { synced: true, lines };
};

// dong dang hat = dong cuoi cung da toi gio (som 0.25s cho kip mat doc); chua toi dong dau -> -1
export const activeLineIndex = (lines, time) => {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].time <= time + 0.25) return i;
    }
    return -1;
};
