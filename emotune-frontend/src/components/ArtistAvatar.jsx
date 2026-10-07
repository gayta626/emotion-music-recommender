import { useState } from 'react'
import { API_URL } from '../config'
import './ArtistAvatar.scss'

// Anh ca si; chua co anh (hoac file loi) -> chu viet tat theo Figma (Noo Phuoc Thinh -> NP, GUrbane -> GU)
const ArtistAvatar = ({ name, avatar, className = "" }) => {
    const [failed, setFailed] = useState(false);
    if (!avatar || failed) {
        const words = name.trim().split(/\s+/);
        const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
        return <span className={`artist-avatar initials ${className}`} aria-hidden="true">{initials}</span>
    }
    return <img className={`artist-avatar ${className}`} src={`${API_URL}/avatars/${avatar}`} alt="" onError={() => setFailed(true)} />
}

export default ArtistAvatar
