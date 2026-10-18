import { usePlayback } from '../contexts/playbackContext';
import './PlayingBars.scss';

// I6: bieu tuong "dang phat" (4 vach nhay) thay so thu tu / dat tren anh bia cua bai dang phat.
// Nhac dang dung -> vach dung yen (khong bien mat: van biet bai nao dang mo).
const PlayingBars = ({ className = '' }) => {
    const { nowPlaying } = usePlayback();
    const paused = nowPlaying?.playing === false;
    return (
        <span className={`eq ${paused ? 'paused' : ''} ${className}`} role="img" aria-label={paused ? 'Paused' : 'Now playing'}>
            <i /><i /><i /><i />
        </span>
    )
}

export default PlayingBars;
