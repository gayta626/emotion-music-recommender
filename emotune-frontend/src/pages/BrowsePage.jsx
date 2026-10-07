import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { API_URL } from '../config';
import ArtistAvatar from '../components/ArtistAvatar';
import { usePlayback } from '../contexts/playbackContext';
import { EMOTIONS, buildDays, cheerUpStatus } from '../utils/moodStats';
import bannerImg from '../assets/images/create_playlist_banner.png';
import './BrowsePage.scss';

// Trang chu duyet nhac (Figma 58:112). Moi hang tu tai du lieu cua minh;
// 1 hang loi chi hien dong "Couldn't load..." cua hang do, cac hang khac van hien.

const ROW_SIZE = 5;

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

const Row = ({ title, error, empty, children }) => (
    <section className="browse-row">
        <h2>{title}</h2>
        {error && <p className="row-note">Couldn't load this section.</p>}
        {!error && empty && <p className="row-note">{empty}</p>}
        {!error && !empty && <div className="row-scroll">{children}</div>}
    </section>
)

// the bai hat 200x200: anh ca si (khong co -> nen mau theo vibe + not nhac); bam = phat
const SongCard = ({ song, onPlay }) => {
    const [failed, setFailed] = useState(false);
    const img = song.artist_avatar && !failed ? `${API_URL}/avatars/${song.artist_avatar}` : null;
    return (
        <button className="song-card" onClick={() => onPlay(song)} title={`Play ${song.title}`}>
            <span className={`card-art vibe-${song.emotion}`}>
                {img ? <img src={img} alt="" onError={() => setFailed(true)} /> : <span className="card-note" aria-hidden="true">♪</span>}
                <span className="card-play" aria-hidden="true">▶</span>
            </span>
            <span className="card-title">{song.title}</span>
            <span className="card-sub">{song.artist || 'Unknown artist'}</span>
        </button>
    )
}

const BrowsePage = () => {
    const navigate = useNavigate();
    const { playSong, playQueue, playPlaylist, refreshPlaylists, playlistsVersion } = usePlayback();
    const [genre, setGenre] = useState(null);       // null = All
    const [creating, setCreating] = useState(false);

    const genres = useLoad('/genres');
    const forYou = useLoad('/songs/for-you');
    const songs = useLoad('/songs');
    const artists = useLoad('/artists');
    const playlists = useLoad('/playlists', [playlistsVersion]);
    const mood = useLoad('/mood-history');

    const byGenre = (list) => (genre ? list.filter((s) => s.genre_id === genre) : list);
    const madeForYou = forYou.data ? byGenre(forYou.data).slice(0, ROW_SIZE) : [];
    const recent = useMemo(
        () => (songs.data ? [...songs.data].sort((a, b) => b.id - a.id) : []),
        [songs.data]
    );
    const recentShown = byGenre(recent).slice(0, ROW_SIZE);

    // the "Your mood this week": cung cach tinh voi trang /stats
    const moodSummary = useMemo(() => {
        if (!mood.data) return null;
        const days = buildDays(mood.data);
        const total = days.reduce((s, d) => s + d.total, 0);
        const top = EMOTIONS
            .map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }))
            .sort((a, b) => b.n - a.n)[0];
        return { total, top, status: cheerUpStatus(days) };
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

    // bam ca si -> phat cac bai cua ca si do nhu 1 playlist tam
    const playArtist = (artist) => {
        const list = (songs.data || []).filter((s) => s.artist_id === artist.id);
        if (list.length) playQueue({ name: artist.name, songs: list });
    }

    return (
        <div className="browse-page">
            <div className="browse-chips" role="group" aria-label="Filter by genre">
                <button className={`chip ${genre === null ? 'on' : ''}`} onClick={() => setGenre(null)} aria-pressed={genre === null}>All</button>
                {(genres.data || []).map((g) => (
                    <button key={g.id} className={`chip ${genre === g.id ? 'on' : ''}`} onClick={() => setGenre(g.id)} aria-pressed={genre === g.id}>
                        {g.name}
                    </button>
                ))}
            </div>

            <section className="browse-row">
                <h2 className="row-big">Getting started</h2>
                <div className="row-scroll getting-started">
                    <div className="banner" style={{ backgroundImage: `url(${bannerImg})` }}>
                        <p className="banner-title">CREATE YOUR <br />OWN PLAYLIST</p>
                        <div className="banner-actions">
                            <button className="banner-browse" onClick={createPlaylist} disabled={creating}>Browse</button>
                            <button className="banner-tips" onClick={() => navigate('/survey')}>Show more tips</button>
                        </div>
                    </div>
                    {(playlists.data || []).slice(0, 3).map((pl) => (
                        <button key={pl.id} className="song-card" onClick={() => navigate(`/playlist/${pl.id}`)}>
                            <span className="card-art playlist-art"><span className="card-note" aria-hidden="true">♪</span></span>
                            <span className="card-title">{pl.name}</span>
                            <span className="card-sub">Playlist · {pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</span>
                        </button>
                    ))}
                </div>
            </section>

            <Row title="Made for you" error={forYou.error} empty={forYou.data && !madeForYou.length ? 'No song in this genre yet.' : null}>
                {madeForYou.map((s) => <SongCard key={s.id} song={s} onPlay={playSong} />)}
            </Row>

            <Row title="Popular artists" error={artists.error}>
                {(artists.data || []).map((a) => {
                    const count = (songs.data || []).filter((s) => s.artist_id === a.id).length;
                    return (
                        <button
                            key={a.id}
                            className="artist-tile"
                            onClick={() => playArtist(a)}
                            disabled={!count}
                            title={count ? `Play ${a.name}` : `${a.name} has no songs yet`}
                        >
                            <ArtistAvatar className="artist-circle" name={a.name} avatar={a.avatar} />
                            <span className="card-title">{a.name}</span>
                            <span className="card-sub">Artist</span>
                        </button>
                    )
                })}
            </Row>

            <Row title="Recently added" error={songs.error} empty={songs.data && !recentShown.length ? 'No song in this genre yet.' : null}>
                {recentShown.map((s) => <SongCard key={s.id} song={s} onPlay={playSong} />)}
            </Row>

            <Row title="Your playlists" error={playlists.error} empty={playlists.data && !playlists.data.length ? 'No playlist yet. Use "Browse" above to create one.' : null}>
                {(playlists.data || []).map((pl) => (
                    <div key={pl.id} className="song-card as-div">
                        <button className="card-art playlist-art" onClick={() => navigate(`/playlist/${pl.id}`)} aria-label={`Open ${pl.name}`}>
                            <span className="card-note" aria-hidden="true">♪</span>
                        </button>
                        {pl.songCount > 0 && (
                            <button className="card-play visible" onClick={() => playPlaylist(pl.id)} aria-label={`Play ${pl.name}`}>▶</button>
                        )}
                        <span className="card-title">{pl.name}</span>
                        <span className="card-sub">{pl.songCount} {pl.songCount === 1 ? 'song' : 'songs'}</span>
                    </div>
                ))}
            </Row>

            <section className="browse-row">
                <div className="mood-card">
                    <span className="mood-eyebrow">Your mood this week</span>
                    {mood.error && <p className="row-note">Couldn't load your mood history.</p>}
                    {moodSummary && (
                        <>
                            <p className="mood-big">
                                {moodSummary.total
                                    ? <>{moodSummary.top.emoji} Mostly {moodSummary.top.label.toLowerCase()}</>
                                    : 'No scans yet'}
                            </p>
                            <p className="mood-line">{moodSummary.total} {moodSummary.total === 1 ? 'scan' : 'scans'} in the last 7 days</p>
                            <p className="mood-line">
                                Cheer-up mode: <b>{moodSummary.status.on ? 'On' : 'Off'}</b>
                                {moodSummary.status.on && ' — when you feel down, NYX plays happier songs'}
                            </p>
                        </>
                    )}
                    <button className="mood-link" onClick={() => navigate('/stats')}>See your stats</button>
                </div>
            </section>
        </div>
    )
}

export default BrowsePage
