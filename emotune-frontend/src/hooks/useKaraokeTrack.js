import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { karaokeBaseName, parseKaraokeTrack } from '../utils/karaokeScore';

// ban karaoke do AI tach giong (`npm run make-karaoke`): /karaoke/<ten mp3>.json (cao do ca si) + .beat.mp3 (nhac dem).
// 404 = bai chua tach -> null: karaoke quay ve cach bo giong tren trinh duyet (L − R), khong cham diem duoc.
// -> { track: { hop, pitch }, beatUrl } | null
export const useKaraokeTrack = (song) => {
    const file = song.file_path;
    const [loaded, setLoaded] = useState({ file: null, value: null });

    useEffect(() => {
        let alive = true;
        const base = encodeURIComponent(karaokeBaseName({ file_path: file }));
        fetch(`${API_URL}/karaoke/${base}.json`)
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                const track = parseKaraokeTrack(json);
                if (alive) setLoaded({ file, value: track ? { track, beatUrl: `${API_URL}/karaoke/${base}.beat.mp3` } : null });
            })
            .catch(() => { if (alive) setLoaded({ file, value: null }); });
        return () => { alive = false; };
    }, [file]);

    return loaded.file === file ? loaded.value : null;
};
