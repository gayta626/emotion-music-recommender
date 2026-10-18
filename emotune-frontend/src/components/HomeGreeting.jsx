import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import MoodIcon from './MoodIcon';
import { useAuth } from '../contexts/authContext';
import { usePlayback } from '../contexts/playbackContext';
import { buildGreeting } from '../utils/greeting';
import PlayIcon from '../assets/icons/player_play.svg?react';
import './HomeGreeting.scss';

// I3: dai loi chao ca nhan duoi hang chip the loai (mau "C - dai mong" nguoi dung chon 16/10).
// Tu hien khi vao trang chu, noi dung doi theo gio, cam xuc quet gan nhat, hanh trinh I4 dang chay.
const HomeGreeting = ({ cheerOn }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { lastMood, nowPlaying, playScanResult } = usePlayback();
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);

    // cap nhat moi phut: "last scan 31 min ago", sang buoi moi
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);

    const g = buildGreeting({
        name: user?.username,
        hour: new Date(now).getHours(),
        now,
        lastMood,
        journey: nowPlaying?.journey ?? null,
        cheerOn,
    });

    const run = () => {
        if (g.action === 'now-playing') navigate('/now-playing');
        else if (g.action === 'scan') navigate('/scan');
        else {
            // phat bai hop cam xuc gan nhat, khong bat camera, khong ghi lich su (auto)
            setBusy(true);
            api.post('/suggest', { emotion: lastMood.emotion, auto: true })
                .then((res) => playScanResult(res.data))
                .catch(() => navigate('/scan'))
                .finally(() => setBusy(false));
        }
    };

    const label = g.action === 'now-playing' ? 'Open now playing' : 'Play a song for my mood';

    return (
        <section className="home-greeting" aria-label="Greeting">
            <span className="greet-icon" aria-hidden="true"><MoodIcon emotion={g.emotion} size={34} /></span>
            <p className="greet-text">
                <strong>{g.title}</strong> <span>{g.line}</span>
            </p>
            {g.action === 'scan'
                ? <button className="greet-btn text" onClick={run}>{lastMood ? 'Scan again' : 'Scan now'}</button>
                : <button className="greet-btn" onClick={run} disabled={busy} aria-label={label} title={label}><PlayIcon /></button>}
        </section>
    );
};

export default HomeGreeting;
