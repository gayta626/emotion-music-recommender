import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import { buildDays, cheerUpStatus } from '../utils/moodStats';
import OverviewTiles from '../components/stats/OverviewTiles';
import CheerTile from '../components/stats/CheerTile';
import DailyChart from '../components/stats/DailyChart';
import DaypartGrid from '../components/stats/DaypartGrid';
import TopLists from '../components/stats/TopLists';
import MoodSongs from '../components/stats/MoodSongs';
import HitRateChart from '../components/stats/HitRateChart';
import ConfidenceRose from '../components/stats/ConfidenceRose';
import PreferenceGrid from '../components/stats/PreferenceGrid';
import './MoodPage.scss';
import '../components/stats/Stats.scss';

// Trang thống kê (/stats), spec docs/superpowers/specs/2026-10-09-stats-page-design.md:
// phần "You" (người dùng tự hiểu mình) + "What NYX learned about you" (thể hiện hệ thống học được gì).
// Số liệu từ GET /stats?days=7|30; ô Cheer-up vẫn tính từ GET /mood-history như trước.
const RANGES = [7, 30];

const MoodPage = () => {
    const [days, setDays] = useState(7);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [history, setHistory] = useState(null);
    const statsDaysRef = useRef(null);   // khoảng ngày của số liệu đang hiển thị

    // đổi 7/30 ngày: giữ số liệu cũ trên màn tới khi có số mới (không nhảy trang, giữ vị trí cuộn)
    useEffect(() => {
        let alive = true;
        api.get('/stats', { params: { days } })
            .then((res) => {
                if (!alive) return;
                statsDaysRef.current = res.data.days;
                setStats(res.data);
                setError('');
            })
            .catch(() => {
                if (!alive) return;
                setError("Couldn't load your stats.");
                // chuyển 7/30 lỗi: nút quay về khoảng đang hiển thị thật (stats cũ), tránh nút và số liệu lệch nhau
                setDays((d) => (statsDaysRef.current && statsDaysRef.current !== d ? statsDaysRef.current : d));
            });
        return () => { alive = false; };
    }, [days, reload]);

    useEffect(() => {
        api.get('/mood-history').then((res) => setHistory(res.data)).catch(() => {});
    }, []);

    const cheer = useMemo(() => (history ? cheerUpStatus(buildDays(history)) : null), [history]);
    const retry = <button className="table-toggle" onClick={() => setReload((n) => n + 1)}>Try again</button>;

    if (!stats) {
        return (
            <div className="mood-page stats-page">
                {error ? <p className="stats-error">{error} {retry}</p> : <p className="mood-muted">Loading…</p>}
                {/* /stats lỗi nhưng /mood-history được: ô Cheer-up vẫn hiện (spec §6) */}
                {error && cheer && <section className="mood-tiles stats-tiles"><CheerTile cheer={cheer} /></section>}
            </div>
        );
    }

    return (
        <div className="mood-page stats-page">
            <header className="mood-head stats-head">
                <div>
                    <span className="mood-eyebrow">Your stats</span>
                    <h1>How you feel &amp; what you play</h1>
                    <p>Everything here comes from your own scans and listens. Nobody else can see it.</p>
                </div>
                <div className="stats-range" role="group" aria-label="Time range" aria-busy={days !== stats.days}>
                    {RANGES.map((n) => (
                        <button
                            key={n}
                            className={days === n && days !== stats.days ? 'pending' : ''}
                            aria-pressed={stats.days === n}
                            onClick={() => setDays(n)}
                        >{n} days</button>
                    ))}
                </div>
            </header>
            {error && <p className="stats-error">{error} {retry}</p>}

            <h2 className="stats-section">You</h2>
            <OverviewTiles overview={stats.overview} days={stats.days} daily={stats.daily} cheer={cheer} />
            <div className="stats-pair">
                <DailyChart daily={stats.daily} />
                <DaypartGrid cells={stats.dayparts} />
            </div>
            <TopLists songs={stats.topSongs} artists={stats.topArtists} />
            <MoodSongs data={stats.moodSongs} />

            <h2 className="stats-section">What NYX learned about you</h2>
            <div className="stats-pair">
                <HitRateChart hitRate={stats.hitRate} />
                <ConfidenceRose confidence={stats.confidence} />
            </div>
            <PreferenceGrid rows={stats.preferences} />
        </div>
    );
};

export default MoodPage;
