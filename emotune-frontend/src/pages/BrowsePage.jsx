import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ArtistAvatar from '../components/ArtistAvatar';
import Shelf from '../components/Shelf';
import { usePlayback } from '../contexts/playbackContext';
import { EMOTIONS, buildDays, cheerUpStatus } from '../utils/moodStats';
import { timeAgo } from '../utils/moodSession';
import { coverUrl } from '../utils/images';
import PlayIcon from '../assets/icons/player_play.svg?react';
import RecordIcon from '../assets/icons/record_circle_icon.svg?react';
import bannerImg from '../assets/images/create_playlist_banner.png';
import './BrowsePage.scss';

// Trang chu duyet nhac: noi dung theo Figma 58:112, bo cuc + mat do the theo Spotify web.
// Moi hang tu tai du lieu cua minh; 1 hang loi chi hien dong bao loi cua hang do.

// tai 1 API cho 1 hang: { data, error }
const useLoad = (url, deps = []) => {
    const [state, setState] = useState({ data: null, error: false });
    useEffect(() => {
        let alive = true;
        api.get(url)
            .then((res) => alive && setState({ data: res.data, error: false }))
            .catch(() => alive && setState({ data: null, error: true }));
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return state;
}

// ten + mo ta cho moi "mix" theo vibe bai hat (hang kieu "Popular radio" cua Spotify)
const MIXES = {
    happy: { title: 'Good Vibes', desc: 'Upbeat songs to keep the smile going' },
    surprise: { title: 'Something New', desc: 'Songs with a twist you did not see coming' },
    neutral: { title: 'Easy Listening', desc: 'Calm tracks for any time of day' },
    sad: { title: 'Rainy Day', desc: 'Slow songs for quiet, heavy moments' },
    angry: { title: 'Let It Out', desc: 'Loud enough to let the steam out' },
};

const LOAD_ERROR = "Couldn't load this section.";
const EMPTY_GENRE = 'No song in this genre yet.';

// bo "(feat. ...)" cho ten bai tren anh bia
const shortTitle = (title) => title.replace(/\s*\(.*\)\s*$/, '');

// danh sach ca si cua cac bai -> "With A, B and more"
const withArtists = (songs) => {
    const names = [...new Set(songs.map((s) => s.artist).filter(Boolean))];
    if (!names.length) return 'Songs from the NYX library';
    if (names.length === 1) return `With ${names[0]}`;
    return `With ${names.slice(0, 2).join(', ')}${names.length > 2 ? ' and more' : ''}`;
}

// nut ▶ tron hien khi re chuot vao the (trong the la <button> thi chi de trang tri)
const PlayBadge = () => (
    <span className="card-play" aria-hidden="true"><PlayIcon /></span>
)

// Anh bia bai hat: co anh bia that (covers/) thi dung; chua co (hoac file loi) -> tu ve:
// nen theo vibe bai, ten bai chu to, anh ca si tron nho o goc.
const SongCover = ({ song }) => {
    const [failed, setFailed] = useState(false);
    const src = coverUrl(song);
    if (src && !failed) {
        return <img className="cover cover-img" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    }
    return (
        <span className={`cover vibe-${song.emotion || 'neutral'}`}>
            <span className="cover-brand">NYX</span>
            {song.artist && <ArtistAvatar className="cover-face" name={song.artist} avatar={song.artist_avatar} />}
            <span className="cover-title">{shortTitle(song.title)}</span>
        </span>
    )
}

// the bai hat: bam = phat ngay
const SongCard = ({ song, playing, onPlay }) => (
    <button className={`card ${playing ? 'playing' : ''}`} onClick={() => onPlay(song)} title={`Play ${song.title}`}>
        <span className="card-art"><SongCover song={song} /><PlayBadge /></span>
        <span className="card-title">{song.title}</span>
        <span className="card-sub">{song.artist || 'Unknown artist'}</span>
    </button>
)

// the playlist: bam the = mo trang playlist, nut ▶ = phat luon (2 nut rieng, khong long nhau)
const PlaylistCard = ({ playlist, onOpen, onPlay }) => (
    <div className="card">
        <button className="card-main" onClick={() => onOpen(playlist)} aria-label={`Open ${playlist.name}`}>
            <span className="card-art">
                <span className="cover playlist">
                    <span className="cover-brand">PLAYLIST</span>
                    <span className="cover-note" aria-hidden="true">♪</span>
                    <span className="cover-title">{playlist.name}</span>
                </span>
            </span>
            <span className="card-title">{playlist.name}</span>
            <span className="card-sub">Playlist · {playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}</span>
        </button>
        {playlist.songCount > 0 && (
            <button className="card-play" onClick={() => onPlay(playlist)} aria-label={`Play ${playlist.name}`}>
                <PlayIcon />
            </button>
        )}
    </div>
)

const BrowsePage = () => {
    const navigate = useNavigate();
    const { playSong, playQueue, playPlaylist, refreshPlaylists, playlistsVersion, nowPlaying, lastMood } = usePlayback();
    const [genre, setGenre] = useState(null);       // null = All
    const [creating, setCreating] = useState(false);
    const [now] = useState(() => Date.now());        // "x min ago" cua lan quet gan nhat

    const genres = useLoad('/genres');
    const forYou = useLoad('/songs/for-you');
    const songs = useLoad('/songs');
    const artists = useLoad('/artists');
    const playlists = useLoad('/playlists', [playlistsVersion]);
    const mood = useLoad('/mood-history');

    const byGenre = (list) => (genre ? list.filter((s) => s.genre_id === genre) : list);
    const madeForYou = forYou.data ? byGenre(forYou.data) : [];
    const recent = useMemo(
        () => (songs.data ? [...songs.data].sort((a, b) => b.id - a.id) : []),
        [songs.data]
    );
    const recentShown = byGenre(recent);
    const isPlaying = (song) => nowPlaying?.songId === song.id;

    // Getting started: banner + playlist cua ban (co bai truoc); it hon 3 the thi them bai hop gu nhat
    const starters = useMemo(() => {
        const lists = [...(playlists.data || [])].sort((a, b) => (b.songCount > 0) - (a.songCount > 0));
        const fill = (forYou.data || []).slice(0, Math.max(0, 3 - lists.length));
        return { lists, fill };
    }, [playlists.data, forYou.data]);

    // ca si co bai dung truoc (bam = phat bai cua ca si); ca si chua co bai mo di o cuoi
    // (cho ca 2 API xong moi ve, tranh hang bi sap lai ngay sau khi hien)
    const artistTiles = useMemo(() => (artists.data && songs.data ? artists.data : [])
        .map((a) => ({ ...a, songs: songs.data.filter((s) => s.artist_id === a.id) }))
        .sort((a, b) => (b.songs.length > 0) - (a.songs.length > 0) || !!b.avatar - !!a.avatar),
    [artists.data, songs.data]);

    // mix theo vibe bai hat (theo chip the loai dang chon)
    const mixes = EMOTIONS
        .map((e) => ({ ...e, ...MIXES[e.key], songs: byGenre(songs.data || []).filter((s) => s.emotion === e.key) }))
        .filter((m) => m.songs.length);

    // the "Your mood this week": cung cach tinh voi trang /stats
    const moodSummary = useMemo(() => {
        if (!mood.data) return null;
        const days = buildDays(mood.data);
        const total = days.reduce((s, d) => s + d.total, 0);
        const top = EMOTIONS
            .map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }))
            .sort((a, b) => b.n - a.n)[0];
        const max = Math.max(1, ...days.map((d) => d.total));
        return { days, total, top, max, status: cheerUpStatus(days) };
    }, [mood.data]);

    // banner: tao playlist moi roi mo trang cua no
    const createPlaylist = () => {
        setCreating(true);
        api.post('/playlists', {})
            .then((res) => {
                refreshPlaylists();
                navigate(`/playlist/${res.data.id}`);
            })
            .catch(() => setCreating(false));
    }

    const openPlaylist = (pl) => navigate(`/playlist/${pl.id}`);
    const lastMoodInfo = lastMood && EMOTIONS.find((e) => e.key === lastMood.emotion);

    return (
        <div className="browse-page" data-mood={lastMood?.emotion || ''}>
            <div className="browse-chips" role="group" aria-label="Filter by genre">
                <button className={`chip ${genre === null ? 'on' : ''}`} onClick={() => setGenre(null)} aria-pressed={genre === null}>All</button>
                {(genres.data || []).map((g) => (
                    <button key={g.id} className={`chip ${genre === g.id ? 'on' : ''}`} onClick={() => setGenre(g.id)} aria-pressed={genre === g.id}>
                        {g.name}
                    </button>
                ))}
            </div>

            <Shelf title="Getting started" className="getting-started">
                <div className="banner" style={{ backgroundImage: `url(${bannerImg})` }}>
                    <p className="banner-title">CREATE YOUR <br />OWN PLAYLIST</p>
                    <div className="banner-actions">
                        <button className="banner-browse" onClick={createPlaylist} disabled={creating}>Browse</button>
                        <button className="banner-tips" onClick={() => navigate('/survey')}>Show more tips</button>
                    </div>
                </div>
                {starters.lists.map((pl) => (
                    <PlaylistCard key={`pl-${pl.id}`} playlist={pl} onOpen={openPlaylist} onPlay={(p) => playPlaylist(p.id)} />
                ))}
                {starters.fill.map((s) => (
                    <SongCard key={`song-${s.id}`} song={s} playing={isPlaying(s)} onPlay={playSong} />
                ))}
            </Shelf>

            <Shelf
                title="Made for you"
                eyebrow="Picked from what you listen to and love"
                note={forYou.error ? LOAD_ERROR : forYou.data && !madeForYou.length ? EMPTY_GENRE : null}
            >
                {madeForYou.map((s) => <SongCard key={s.id} song={s} playing={isPlaying(s)} onPlay={playSong} />)}
            </Shelf>

            <Shelf title="Popular artists" note={artists.error ? LOAD_ERROR : null}>
                {artistTiles.map((a) => (
                    <button
                        key={a.id}
                        className="card artist"
                        onClick={() => playQueue({ name: a.name, songs: a.songs })}
                        disabled={!a.songs.length}
                        title={a.songs.length ? `Play ${a.name}` : `${a.name} has no songs yet`}
                    >
                        <span className="card-art round">
                            <ArtistAvatar className="artist-photo" name={a.name} avatar={a.avatar} />
                            {a.songs.length > 0 && <PlayBadge />}
                        </span>
                        <span className="card-title">{a.name}</span>
                        <span className="card-sub">Artist</span>
                    </button>
                ))}
            </Shelf>

            <Shelf
                title="New releases for you"
                eyebrow="Brand new music in the NYX library"
                note={songs.error ? LOAD_ERROR : songs.data && !recentShown.length ? EMPTY_GENRE : null}
            >
                {recentShown.map((s) => <SongCard key={s.id} song={s} playing={isPlaying(s)} onPlay={playSong} />)}
            </Shelf>

            <Shelf
                title="Mixes for every mood"
                note={songs.error ? LOAD_ERROR : songs.data && !mixes.length ? EMPTY_GENRE : null}
            >
                {mixes.map((m) => (
                    <button key={m.key} className="card mix" onClick={() => playQueue({ name: m.title, songs: m.songs })} title={`Play ${m.title}`}>
                        <span className={`card-art mix-art vibe-${m.key}`}>
                            <span className="mix-label">MIX</span>
                            <span className="mix-faces">
                                {[...new Map(m.songs.filter((s) => s.artist).map((s) => [s.artist, s])).values()].slice(0, 3).map((s) => (
                                    <ArtistAvatar key={s.artist} className="mix-face" name={s.artist} avatar={s.artist_avatar} />
                                ))}
                            </span>
                            <span className="mix-title">{m.title}</span>
                            <PlayBadge />
                        </span>
                        <span className="card-sub two-lines">{withArtists(m.songs)} · {m.desc}</span>
                    </button>
                ))}
            </Shelf>

            {/* 2 the lon cuoi trang (vi tri the podcast #471824 + khung xam trong Figma) */}
            <section className="features">
                <article className="feature mood-feature">
                    <div className="feature-top">
                        <span className={`feature-thumb vibe-${moodSummary?.total ? moodSummary.top.key : 'neutral'}`} aria-hidden="true">
                            {moodSummary?.total ? moodSummary.top.emoji : '🙂'}
                        </span>
                        <div>
                            <h3>{moodSummary?.total ? `Mostly ${moodSummary.top.label.toLowerCase()} this week` : 'No scans this week yet'}</h3>
                            <p className="feature-sub">Your mood · last 7 days</p>
                        </div>
                    </div>
                    <div className="feature-panel">
                        {mood.error && <p className="feature-line">Couldn't load your mood history.</p>}
                        {moodSummary && (
                            <>
                                <div className="mini-chart" role="img" aria-label={`${moodSummary.total} scans in the last 7 days`}>
                                    {moodSummary.days.map((d) => (
                                        <div key={d.sub} className="mini-day">
                                            <div className="mini-col">
                                                <div className="mini-bar" style={{ height: `${(d.total / moodSummary.max) * 100}%` }}>
                                                    {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                                        <span key={e.key} className={`seg ${e.key}`} style={{ flexGrow: d.counts[e.key] }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="mini-label">{d.label === 'Today' ? 'Today' : d.label.slice(0, 2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="feature-line">
                                    {moodSummary.total} {moodSummary.total === 1 ? 'scan' : 'scans'} · Cheer-up mode <b>{moodSummary.status.on ? 'On' : 'Off'}</b>
                                </p>
                            </>
                        )}
                    </div>
                    <button className="feature-btn" onClick={() => navigate('/stats')}>See your stats</button>
                </article>

                <article className="feature scan-feature">
                    <div className="feature-top">
                        <span className="feature-thumb scan-thumb" aria-hidden="true"><RecordIcon /></span>
                        <div>
                            <h3>How do you feel right now?</h3>
                            <p className="feature-sub">Mood scan</p>
                        </div>
                    </div>
                    <div className="feature-panel">
                        <p className="feature-line big">
                            {lastMoodInfo
                                ? <>Last scan: {lastMoodInfo.emoji} {lastMoodInfo.label} · {timeAgo(now - lastMood.at)}</>
                                : 'No scan in this session yet'}
                        </p>
                        <p className="feature-line">
                            NYX looks at your face and picks a song that fits your mood — or a happier one when you have been down for a while.
                        </p>
                    </div>
                    <button className="feature-btn" onClick={() => navigate('/scan')}>Scan my mood</button>
                </article>
            </section>
        </div>
    )
}

export default BrowsePage
