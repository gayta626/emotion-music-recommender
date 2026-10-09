// Ten + mo ta cua cac "mix" theo vibe bai hat (trang chu va trang ca si)
export const MIXES = {
    happy: { mood: 'Happy', title: 'Good Vibes', desc: 'Upbeat songs to keep the smile going' },
    surprise: { mood: 'Surprised', title: 'Something New', desc: 'Songs with a twist you did not see coming' },
    neutral: { mood: 'Neutral', title: 'Easy Listening', desc: 'Calm tracks for any time of day' },
    sad: { mood: 'Sad', title: 'Rainy Day', desc: 'Slow songs for quiet, heavy moments' },
    angry: { mood: 'Angry', title: 'Let It Out', desc: 'Loud enough to let the steam out' },
};

// danh sach ca si cua cac bai -> "With A, B and more"
export const withArtists = (songs) => {
    const names = [...new Set(songs.map((s) => s.artist).filter(Boolean))];
    if (!names.length) return 'Songs from the NYX library';
    if (names.length === 1) return `With ${names[0]}`;
    return `With ${names.slice(0, 2).join(', ')}${names.length > 2 ? ' and more' : ''}`;
}

// Dung 1 mix tu kho nhac (dung chung trang chu, trang ca si, trang /mix/:key):
// - key = vibe (happy, sad...): bai co vibe do; them artistId -> chi bai cua ca si; them genreId -> chi the loai do
// - key = 'radio' (can artist): bai cua ca si + bai cung the loai cua nguoi khac
// Khong co bai nao -> null.
export const buildMix = (songs, { key, artist = null, genreId = null }) => {
    if (key === 'radio') {
        if (!artist) return null;
        const mine = songs.filter((s) => s.artist_id === artist.id);
        const genres = new Set(mine.map((s) => s.genre_id).filter(Boolean));
        const others = songs.filter((s) => s.artist_id !== artist.id && genres.has(s.genre_id));
        if (!others.length) return null; // radio chi co bai cua chinh ca si = giong nut Play trang ca si
        return { key, label: 'RADIO', title: `${artist.name} Radio`, desc: 'Songs you might like next', artist, songs: [...mine, ...others] };
    }
    if (!MIXES[key]) return null;
    const list = songs.filter((s) => s.emotion === key
        && (!artist || s.artist_id === artist.id)
        && (!genreId || s.genre_id === genreId));
    if (!list.length) return null;
    // nhan tren anh bia: trang chu ghi ten cam xuc, mix cua 1 ca si ghi MIX
    const { mood, title, desc } = MIXES[key];
    return { key, label: artist ? 'MIX' : mood, title, desc, artist, genreId, songs: list };
}

// duong dan trang cua 1 mix: /mix/happy, /mix/happy?genre=2, /mix/radio?artist=4
export const mixPath = (mix) => {
    const params = new URLSearchParams();
    if (mix.artist) params.set('artist', mix.artist.id);
    if (mix.genreId) params.set('genre', mix.genreId);
    const qs = params.toString();
    return `/mix/${mix.key}${qs ? `?${qs}` : ''}`;
}
