import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { lyricsFileName, parseLrc } from '../utils/lyrics';

// tai loi bai: /lyrics/<ten file mp3>.lrc (404 = bai chua co loi) -> { loading, lyrics }
// Dung o MusicPlayer: vua cho man loi bai, vua biet bai co loi chay theo nhac khong (an / hien nut Karaoke)
export const useLyrics = (song) => {
    const file = song.file_path;
    const [loaded, setLoaded] = useState({ file: null, lyrics: null });

    useEffect(() => {
        let alive = true;
        fetch(`${API_URL}/lyrics/${encodeURIComponent(lyricsFileName({ file_path: file }))}`)
            .then((res) => (res.ok ? res.text() : null))
            .then((text) => { if (alive) setLoaded({ file, lyrics: text ? parseLrc(text) : null }); })
            .catch(() => { if (alive) setLoaded({ file, lyrics: null }); });
        return () => { alive = false; };
    }, [file]);

    const loading = loaded.file !== file;
    return { loading, lyrics: loading ? null : loaded.lyrics };
};
