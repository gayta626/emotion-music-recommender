import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayback } from '../contexts/playbackContext'
import { STALE_MS, timeAgo as ago } from '../utils/moodSession'
import RecordIcon from '../assets/icons/record_circle_icon.svg?react'
import './MoodButton.scss'

const LABELS = { happy: 'Happy', sad: 'Sad', angry: 'Angry', surprise: 'Surprised', neutral: 'Neutral' }

// Icon quet cam xuc tren header (man quet "thu gon" lai sau lan quet dau cua phien):
// vien mau theo cam xuc gan nhat; cam xuc cu > 30 phut -> nhap nhay nhac quet lai; bam -> /scan
const MoodButton = () => {
    const { lastMood } = usePlayback()
    const navigate = useNavigate()
    const [now, setNow] = useState(() => Date.now())

    // cap nhat "x min ago" + trang thai "cu" moi 30 giay
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000)
        return () => clearInterval(id)
    }, [])

    const age = lastMood ? now - lastMood.at : 0
    const stale = lastMood && age > STALE_MS
    const label = lastMood
        ? `Mood: ${LABELS[lastMood.emotion] || lastMood.emotion} · scanned ${ago(age)}${stale ? ' · tap to scan again' : ''}`
        : 'Scan my mood'

    return (
        <button
            className={`mood-btn ${stale ? 'stale' : ''}`}
            data-mood={lastMood?.emotion || ''}
            onClick={() => navigate('/scan')}
            title={label}
            aria-label={label}
        >
            <RecordIcon />
        </button>
    )
}

export default MoodButton
