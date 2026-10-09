import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { MixArt, MixCard } from '../components/BrowseCards';
import MoodIcon from '../components/MoodIcon';
import Shelf from '../components/Shelf';
import SongThumb from '../components/SongThumb';
import { usePlayback } from '../contexts/playbackContext';
import { formatAdded, formatDuration } from '../utils/format';
import { buildMix, mixPath, withArtists } from '../utils/mixes';
import { EMOTIONS } from '../utils/moodStats';
import PlayIcon from '../assets/icons/mix_play.svg?react';
import ShuffleIcon from '../assets/icons/mix_shuffle.svg?react';
import ClockIcon from '../assets/icons/clock.svg?react';
import './BrowsePage.scss';
import './MixPage.scss';

// Trang 1 mix / radio, kiểu trang album (Figma "frame 25", node 79:75):
// banner (ảnh bìa mix + tên to + mô tả) → nút Play / Shuffle → bảng bài → "You might also like" (các mix khác).
// Bảng bài kiểu Spotify: # · Title (ca sĩ ở dưới) · Album · Date added (lúc bài vào kho nhạc) · Vibe · thời lượng.
// Bấm thẻ mix ở trang chủ / trang ca sĩ thì tới đây; nhạc chỉ phát khi bấm Play hoặc bấm 1 dòng.
// Mix không lưu trong DB: dựng lại từ /songs theo đường dẫn (/mix/happy?genre=2, /mix/radio?artist=4).

const MixView = ({ mixKey, artistId, genreId }) => {
    const navigate = useNavigate();
    const { playQueue, nowPlaying } = usePlayback();
    const [data, setData] = useState({ status: 'loading' });

    useEffect(() => {
        let alive = true;
        // mở mix khác (bấm "You might also like"): cuộn lên đầu
        document.querySelector('.app-main')?.scrollTo?.(0, 0);
        window.scrollTo(0, 0);
        Promise.all([api.get('/songs'), api.get('/artists')])
            .then(([songs, artists]) => alive && setData({ status: 'ok', songs: songs.data, artists: artists.data }))
            .catch(() => alive && setData({ status: 'error' }));
        return () => { alive = false; };
    }, []);

    const view = useMemo(() => {
        if (data.status !== 'ok') return null;
        const { songs, artists } = data;
        const artist = artistId ? artists.find((a) => a.id === artistId) : null;
        if (artistId && !artist) return { mix: null };
        const mix = buildMix(songs, { key: mixKey, artist, genreId });
        if (!mix) return { mix: null };
        // gợi ý thêm: mix khác của cùng ca sĩ (nếu có) rồi mix theo vibe của cả kho;
        // bỏ chính mix đang xem + mix trùng tên (mix "Rainy Day" của ca sĩ và của cả kho chỉ giữ 1 — cái của ca sĩ)
        const keys = ['radio', ...EMOTIONS.map((e) => e.key)];
        const seen = new Set([mix.title]);
        const more = [
            ...(artist ? keys.map((key) => buildMix(songs, { key, artist })) : []),
            ...keys.map((key) => buildMix(songs, { key })),
        ].filter((m) => m && !seen.has(m.title) && seen.add(m.title));
        const genre = genreId ? mix.songs[0]?.genre : null;
        return { mix, more, genre };
    }, [data, mixKey, artistId, genreId]);

    if (data.status === 'loading') return <div className="browse-page mix-page"><p className="mix-note">Loading…</p></div>;
    if (data.status === 'error' || !view.mix) {
        return (
            <div className="browse-page mix-page">
                <p className="mix-note">{data.status === 'error' ? "Couldn't load this mix." : 'This mix has no songs yet.'}</p>
                <button className="mix-back" onClick={() => navigate('/')}>Back to home</button>
            </div>
        )
    }

    const { mix, more, genre } = view;
    const play = (start = 0) => playQueue({ name: mix.title, songs: mix.songs }, start);
    const shuffle = () => playQueue({ name: mix.title, songs: [...mix.songs].sort(() => Math.random() - 0.5) });

    return (
        <div className={`browse-page mix-page hero-${mix.key}`}>
            <header className="mix-hero">
                <div className="mix-cover"><MixArt mix={mix} /></div>
                <div className="mix-heading">
                    <span className="mix-eyebrow">{mix.key === 'radio' ? 'Radio' : 'Mix'}</span>
                    <h1>{mix.title}</h1>
                    <p className="mix-desc">{mix.desc}</p>
                    <p className="mix-meta">
                        NYX · {mix.songs.length} {mix.songs.length === 1 ? 'song' : 'songs'} · {withArtists(mix.songs)}
                        {genre && <> · {genre}</>}
                    </p>
                </div>
            </header>

            <div className="mix-actions">
                <button className="mix-play" onClick={() => play(0)} aria-label={`Play ${mix.title}`}><PlayIcon /></button>
                <button className="mix-shuffle" onClick={shuffle} disabled={mix.songs.length < 2} aria-label="Shuffle play" title="Shuffle play">
                    <ShuffleIcon />
                </button>
            </div>

            <div className="mix-tracks" role="list">
                <div className="mix-row mix-head" aria-hidden="true">
                    <span className="col-num">#</span>
                    <span>Title</span>
                    <span className="col-album">Album</span>
                    <span className="col-date">Date added</span>
                    <span className="col-vibe">Vibe</span>
                    <span className="col-time"><ClockIcon aria-label="Duration" /></span>
                </div>
                {mix.songs.map((s, i) => {
                    const playing = nowPlaying?.songId === s.id;
                    return (
                        <button key={s.id} role="listitem" className={`mix-row ${playing ? 'playing' : ''}`} onClick={() => play(i)} title={`Play ${s.title}`}>
                            <span className="col-num">{playing ? '♫' : i + 1}</span>
                            <span className="mix-song">
                                <SongThumb className="mix-thumb" song={s} />
                                <span className="mix-song-text">
                                    <span className="mix-song-title">{s.title}</span>
                                    <span className="mix-song-artist">{s.artist || 'Unknown artist'}</span>
                                </span>
                            </span>
                            <span className="col-album" title={s.album || ''}>{s.album || '—'}</span>
                            <span className="col-date">{formatAdded(s.added_at)}</span>
                            <span className="col-vibe"><MoodIcon emotion={s.emotion} size={28} /></span>
                            <span className="col-time">{formatDuration(s.duration)}</span>
                        </button>
                    )
                })}
            </div>

            {more.length > 0 && (
                <Shelf title="You might also like">
                    {more.map((m) => <MixCard key={mixPath(m)} mix={m} onOpen={(x) => navigate(mixPath(x))} />)}
                </Shelf>
            )}
        </div>
    )
}

// key = cả đường dẫn: sang mix khác thì dựng lại trang từ đầu (giống trang ca sĩ)
const MixPage = () => {
    const { key } = useParams();
    const [params] = useSearchParams();
    const artistId = Number(params.get('artist')) || null;
    const genreId = Number(params.get('genre')) || null;
    return <MixView key={`${key}-${artistId}-${genreId}`} mixKey={key} artistId={artistId} genreId={genreId} />
}

export default MixPage
