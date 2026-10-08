import { useState } from 'react'
import ArtistAvatar from './ArtistAvatar'
import { coverUrl } from '../utils/images'

// Anh nho dau dong bai hat (tim kiem, trang playlist): anh bia that; chua co (hoac file loi) -> anh ca si / chu viet tat
const SongThumb = ({ song, className = '' }) => {
    const [failed, setFailed] = useState(false);
    const src = coverUrl(song);
    if (src && !failed) {
        return <img className={`artist-avatar ${className}`} src={src} alt="" onError={() => setFailed(true)} />
    }
    return <ArtistAvatar className={className} name={song.artist || song.title} avatar={song.artist_avatar} />
}

export default SongThumb
