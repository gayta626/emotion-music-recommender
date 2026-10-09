// Ten + mo ta cua cac "mix" theo vibe bai hat (trang chu va trang ca si)
export const MIXES = {
    happy: { title: 'Good Vibes', desc: 'Upbeat songs to keep the smile going' },
    surprise: { title: 'Something New', desc: 'Songs with a twist you did not see coming' },
    neutral: { title: 'Easy Listening', desc: 'Calm tracks for any time of day' },
    sad: { title: 'Rainy Day', desc: 'Slow songs for quiet, heavy moments' },
    angry: { title: 'Let It Out', desc: 'Loud enough to let the steam out' },
};

// danh sach ca si cua cac bai -> "With A, B and more"
export const withArtists = (songs) => {
    const names = [...new Set(songs.map((s) => s.artist).filter(Boolean))];
    if (!names.length) return 'Songs from the NYX library';
    if (names.length === 1) return `With ${names[0]}`;
    return `With ${names.slice(0, 2).join(', ')}${names.length > 2 ? ' and more' : ''}`;
}

