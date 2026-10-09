import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { API_URL } from '../config';
import { ArtistCard, MixCard, SongCard } from '../components/BrowseCards';
import MoodIcon from '../components/MoodIcon';
import Shelf from '../components/Shelf';
import { usePlayback } from '../contexts/playbackContext';
import { buildMix, mixPath } from '../utils/mixes';
import { EMOTIONS, buildDays, cheerUpStatus } from '../utils/moodStats';
import { timeAgo } from '../utils/moodSession';
import { coverUrl } from '../utils/images';
import { moodShares, pickForMood, rankByPlays } from '../utils/artistPage';
import PlayIcon from '../assets/icons/player_play.svg?react';
import './BrowsePage.scss';
import './ArtistPage.scss';

// Trang ca sĩ kiểu Spotify (bấm ca sĩ ở "Popular artists" / thanh bên). Thiết kế: Figma 294:134.
// Số liệu cá nhân (lượt nghe, nghe khi cảm xúc nào) lấy từ GET /artists/:id/stats; còn lại dùng lại /songs, /artists.

const LOAD_ERROR = "Couldn't load this page.";

// ảnh nhỏ đầu dòng bài: bìa thật, chưa có (hoặc lỗi) → ô màu theo vibe bài
const MiniCover = ({ song }) => {
    const [failed, setFailed] = useState(false);
    const src = coverUrl(song);
    if (src && !failed) return <img className="mini-cover" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    return <span className={`mini-cover vibe-${song.emotion || 'neutral'}`} aria-hidden="true">♪</span>
}

const TrackRow = ({ index, song, plays, playing, onPlay }) => (
    <button className={`track-row ${playing ? 'playing' : ''}`} onClick={() => onPlay(song)} title={`Play ${song.title}`}>
        <span className="track-index">{playing ? '♫' : index}</span>
        <MiniCover song={song} />
        <span className="track-title">{song.title}</span>
        <span className="track-vibe"><MoodIcon emotion={song.emotion} size={16} /></span>
        <span className="track-plays">{plays ? `${plays} ${plays === 1 ? 'play' : 'plays'}` : 'Not played yet'}</span>
    </button>
)

const ArtistView = ({ artistId }) => {
    const navigate = useNavigate();
    const { playSong, playQueue, nowPlaying, lastMood } = usePlayback();

    const [data, setData] = useState({ status: 'loading' });
    const [vibe, setVibe] = useState(null);            // chip lọc bài theo cảm xúc, null = All
    const [showAll, setShowAll] = useState(false);     // "See more" ở Popular
    const [followed, setFollowed] = useState(false);
    const [profile, setProfile] = useState(null);      // { artistIds, genreIds } để Follow ghi lại đúng
    const [now] = useState(() => Date.now());

    useEffect(() => {
        let alive = true;
        // mở trang ca sĩ (hoặc sang ca sĩ khác): cuộn lên đầu
        document.querySelector('.app-main')?.scrollTo?.(0, 0);
        window.scrollTo(0, 0);
        Promise.all([
            api.get('/artists'),
            api.get('/songs'),
            api.get(`/artists/${artistId}/stats`),
            api.get('/mood-history'),
            api.get('/profile'),
        ]).then(([artists, songs, stats, mood, prof]) => {
            if (!alive) return;
            const artist = artists.data.find((a) => a.id === artistId);
            if (!artist) { setData({ status: 'missing' }); return; }
            setProfile({ artistIds: prof.data.artistIds, genreIds: prof.data.genreIds });
            setFollowed(prof.data.artistIds.includes(artistId));
            setData({ status: 'ok', artist, artists: artists.data, songs: songs.data, stats: stats.data, mood: mood.data });
        }).catch((err) => {
            if (!alive) return;
            setData({ status: err.response?.status === 404 ? 'missing' : 'error' });
        });
        return () => { alive = false; };
    }, [artistId]);

    const view = useMemo(() => {
        if (data.status !== 'ok') return null;
        const { artist, artists, songs, stats, mood } = data;
        const mine = songs.filter((s) => s.artist_id === artist.id);
        const ranked = rankByPlays(mine, stats.plays);
        const cheer = cheerUpStatus(buildDays(mood));
        const pick = pickForMood(mine, lastMood?.emotion, cheer.on, stats.plays);
        const genres = [...new Set(mine.map((s) => s.genre).filter(Boolean))];
        const myGenreIds = new Set(mine.map((s) => s.genre_id).filter(Boolean));
        // ca sĩ cùng thể loại trước, rồi ca sĩ có ảnh
        const others = artists
            .filter((a) => a.id !== artist.id)
            .map((a) => ({ ...a, shared: songs.some((s) => s.artist_id === a.id && myGenreIds.has(s.genre_id)) }))
            .sort((a, b) => b.shared - a.shared || !!b.avatar - !!a.avatar);
        // radio (bài của ca sĩ + bài cùng thể loại của người khác) rồi mix theo từng vibe của ca sĩ
        const mixes = ['radio', ...EMOTIONS.map((e) => e.key)]
            .map((key) => buildMix(songs, { key, artist }))
            .filter(Boolean);
        const vibes = EMOTIONS.filter((e) => mine.some((s) => s.emotion === e.key));
        return { artist, mine, ranked, pick, genres, others, mixes, vibes, shares: moodShares(stats.moods), stats };
    }, [data, lastMood]);

    // Follow = thêm ca sĩ vào gu (khảo sát) → "Made for you" cộng điểm cho ca sĩ này
    const toggleFollow = () => {
        if (!profile) return;
        const next = followed ? profile.artistIds.filter((x) => x !== artistId) : [...profile.artistIds, artistId];
        const before = followed;
        setFollowed(!before);
        api.post('/profile', { artistIds: next, genreIds: profile.genreIds })
            .then(() => setProfile({ ...profile, artistIds: next }))
            .catch(() => setFollowed(before));
    }

    if (data.status === 'loading') return <div className="browse-page artist-page"><p className="artist-note">Loading…</p></div>;
    if (data.status !== 'ok') {
        return (
            <div className="browse-page artist-page">
                <p className="artist-note">{data.status === 'missing' ? "This artist doesn't exist." : LOAD_ERROR}</p>
                <button className="artist-back" onClick={() => navigate('/')}>Back to home</button>
            </div>
        )
    }

    const { artist, mine, ranked, pick, genres, others, mixes, vibes, shares, stats } = view;
    const photo = artist.avatar ? `${API_URL}/avatars/${artist.avatar}` : null;
    const shownSongs = vibe ? mine.filter((s) => s.emotion === vibe) : mine;
    const popular = showAll ? ranked : ranked.slice(0, 5);
    const isPlaying = (song) => nowPlaying?.songId === song.id;
    const playAll = (list) => list.length && playQueue({ name: artist.name, songs: list });
    const shuffled = () => playAll([...mine].sort(() => Math.random() - 0.5));
    const topShare = shares[0];
    const pickNote = !pick ? '' : pick.cheered
        ? 'You have felt down for a while, so NYX suggests a brighter song.'
        : !pick.exact
            ? `${artist.name} has no song for this mood yet, so NYX picked the one you play most.`
            : 'NYX picked the song that matches it best.';

    return (
        <div className="browse-page artist-page" data-mood={lastMood?.emotion || ''}>
            <header className="artist-hero">
                {photo && <img className="hero-photo" src={photo} alt="" />}
                <div className="hero-text">
                    <span className="hero-badge"><span className="hero-check" aria-hidden="true">✓</span> Artist on NYX</span>
                    <h1>{artist.name}</h1>
                    <p className="hero-sub">
                        {mine.length} {mine.length === 1 ? 'song' : 'songs'} in NYX
                        <span aria-hidden="true"> · </span>
                        You played {stats.monthTotal} {stats.monthTotal === 1 ? 'time' : 'times'} this month
                    </p>
                </div>
                <div className="hero-actions">
                    <button className="hero-play" onClick={() => playAll(ranked)} disabled={!mine.length} aria-label={`Play ${artist.name}`}>
                        <PlayIcon />
                    </button>
                    <button className="hero-shuffle" onClick={shuffled} disabled={mine.length < 2} aria-label="Shuffle play" title="Shuffle play">⤨</button>
                    <button className={`hero-follow ${followed ? 'on' : ''}`} onClick={toggleFollow} aria-pressed={followed}>
                        {followed ? 'Following' : 'Follow'}
                    </button>
                </div>
            </header>

            {!mine.length ? (
                <p className="artist-note">No songs from {artist.name} in NYX yet.</p>
            ) : (
                <div className="artist-body">
                    <section className="popular">
                        <h2>Popular</h2>
                        <div className="track-list">
                            {popular.map((s, i) => (
                                <TrackRow key={s.id} index={i + 1} song={s} plays={stats.plays[s.id]?.total} playing={isPlaying(s)} onPlay={playSong} />
                            ))}
                        </div>
                        {ranked.length > 5 && (
                            <button className="see-more" onClick={() => setShowAll((v) => !v)}>{showAll ? 'See less' : 'See more'}</button>
                        )}
                    </section>

                    <aside className="mood-pick">
                        <h2>Fits your mood now</h2>
                        {pick ? (
                            <>
                                <button className="pick-card" onClick={() => playSong(pick.song)} title={`Play ${pick.song.title}`}>
                                    <span className="pick-cover"><MiniCover song={pick.song} /></span>
                                    <span className="pick-info">
                                        <span className="pick-pill"><MoodIcon emotion={lastMood.emotion} size={16} /> Try this</span>
                                        <span className="pick-title">{pick.song.title}</span>
                                        <span className="pick-sub"><MoodIcon emotion={pick.target} size={16} /> picked by NYX</span>
                                    </span>
                                </button>
                                <p className="pick-note">Based on your last scan · {timeAgo(now - lastMood.at)}. {pickNote}</p>
                            </>
                        ) : (
                            <div className="pick-empty">
                                <p>Scan your mood and NYX will pick the song from {artist.name} that fits it.</p>
                                <button className="pick-scan" onClick={() => navigate('/scan')}>Scan my mood</button>
                            </div>
                        )}
                    </aside>
                </div>
            )}

            {mine.length > 0 && (
                <Shelf
                    title="Songs"
                    className="artist-songs"
                    toolbar={vibes.length > 1 && (
                        <div className="vibe-chips" role="group" aria-label="Filter by mood">
                            <button className={`chip ${vibe === null ? 'on' : ''}`} onClick={() => setVibe(null)} aria-pressed={vibe === null}>All</button>
                            {vibes.map((e) => (
                                <button key={e.key} className={`chip icon-chip ${vibe === e.key ? 'on' : ''}`} onClick={() => setVibe(e.key)} aria-pressed={vibe === e.key} aria-label={e.label} title={e.label}>
                                    <MoodIcon emotion={e.key} size={20} />
                                </button>
                            ))}
                        </div>
                    )}
                >
                    {shownSongs.map((s) => <SongCard key={s.id} song={s} playing={isPlaying(s)} onPlay={playSong} />)}
                </Shelf>
            )}

            {mixes.length > 0 && (
                <Shelf title={`Mixes with ${artist.name}`}>
                    {mixes.map((m) => <MixCard key={m.key} mix={m} onOpen={(mix) => navigate(mixPath(mix))} />)}
                </Shelf>
            )}

            {others.length > 0 && (
                <Shelf title="Fans also like">
                    {others.map((a) => <ArtistCard key={a.id} artist={a} onOpen={(x) => navigate(`/artist/${x.id}`)} />)}
                </Shelf>
            )}

            <section className="artist-about">
                <h2>About</h2>
                <div className="about-grid">
                    <div className="about-photo" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
                        <div className="about-caption">
                            <strong>{mine.length} {mine.length === 1 ? 'song' : 'songs'} in NYX{genres.length > 0 && <> · Genre: {genres.join(', ')}</>}</strong>
                        </div>
                    </div>
                    <div className="about-you">
                        <span className="you-eyebrow">YOU &amp; {artist.name.toUpperCase()}</span>
                        <p className="you-big">{stats.monthTotal} {stats.monthTotal === 1 ? 'play' : 'plays'} this month</p>
                        {topShare ? (
                            <>
                                <p className="you-line">You mostly play {artist.name} when you feel <MoodIcon emotion={topShare.emotion} size={24} /></p>
                                <div className="you-bars">
                                    {shares.slice(0, 3).map((m) => (
                                        <div className="you-bar" key={m.emotion}>
                                            <div className="you-bar-top"><MoodIcon emotion={m.emotion} size={20} /><span>{m.percent}%</span></div>
                                            <div className="bar-track"><div className={`bar-fill ${m.emotion}`} style={{ width: `${m.percent}%` }} /></div>
                                        </div>
                                    ))}
                                </div>
                                <p className="you-foot">From your mood scans while listening</p>
                            </>
                        ) : (
                            <p className="you-line">Listen to {artist.name} and your pattern shows up here: which mood you are in when you play these songs.</p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}

// key={id}: sang ca sĩ khác (bấm "Fans also like") thì dựng lại cả trang → trạng thái (đang tải, chip lọc...) về ban đầu
const ArtistPage = () => {
    const { id } = useParams();
    return <ArtistView key={id} artistId={Number(id)} />
}

export default ArtistPage
