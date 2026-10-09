import { useState } from 'react';
import ArtistAvatar from './ArtistAvatar';
import { coverUrl } from '../utils/images';
import { withArtists } from '../utils/mixes';
import PlayIcon from '../assets/icons/player_play.svg?react';

// Các thẻ dùng chung của trang chủ duyệt nhạc (BrowsePage) và trang ca sĩ (ArtistPage).
// Kiểu dáng nằm ở BrowsePage.scss, dưới class `.browse-page` → trang nào dùng thẻ phải bọc trong `.browse-page`.

// bo "(feat. ...)" cho ten bai tren anh bia
const shortTitle = (title) => title.replace(/\s*\(.*\)\s*$/, '');

// nut ▶ tron hien khi re chuot vao the (trong the la <button> thi chi de trang tri)
export const PlayBadge = () => (
    <span className="card-play" aria-hidden="true"><PlayIcon /></span>
)

// Anh bia bai hat: co anh bia that (covers/) thi dung; chua co (hoac file loi) -> tu ve:
// nen theo vibe bai, ten bai chu to, anh ca si tron nho o goc.
export const SongCover = ({ song }) => {
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
export const SongCard = ({ song, playing, onPlay }) => (
    <button className={`card ${playing ? 'playing' : ''}`} onClick={() => onPlay(song)} title={`Play ${song.title}`}>
        <span className="card-art"><SongCover song={song} /><PlayBadge /></span>
        <span className="card-title">{song.title}</span>
        <span className="card-sub">{song.artist || 'Unknown artist'}</span>
    </button>
)

// the ca si tron: bam = mo trang ca si
export const ArtistCard = ({ artist, onOpen }) => (
    <button className="card artist" onClick={() => onOpen(artist)} title={`Open ${artist.name}`}>
        <span className="card-art round">
            <ArtistAvatar className="artist-photo" name={artist.name} avatar={artist.avatar} />
        </span>
        <span className="card-title">{artist.name}</span>
        <span className="card-sub">Artist</span>
    </button>
)

// anh bia cua mix: nhan MIX/RADIO, toi da 3 anh ca si, ten mix (co chu theo cqw → dat trong khung co container-type)
export const MixArt = ({ mix, className = '' }) => (
    <span className={`mix-art vibe-${mix.key} ${className}`}>
        <span className="mix-label">{mix.label || 'MIX'}</span>
        <span className="mix-faces">
            {[...new Map(mix.songs.filter((s) => s.artist).map((s) => [s.artist, s])).values()].slice(0, 3).map((s) => (
                <ArtistAvatar key={s.artist} className="mix-face" name={s.artist} avatar={s.artist_avatar} />
            ))}
        </span>
        <span className="mix-title">{mix.title}</span>
    </span>
)

// the mix theo vibe: bam = mo trang danh sach bai cua mix (/mix/:key), phat bang nut Play trong trang
export const MixCard = ({ mix, onOpen }) => (
    <button className="card mix" onClick={() => onOpen(mix)} title={`Open ${mix.title}`}>
        <MixArt mix={mix} className="card-art" />
        <span className="card-sub two-lines">{withArtists(mix.songs)} · {mix.desc}</span>
    </button>
)
