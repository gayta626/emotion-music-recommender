import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import MoodIcon from '../components/MoodIcon';
import { EMOTIONS, buildDays, cheerUpStatus } from '../utils/moodStats';
import './MoodPage.scss';

// Lich su cam xuc 7 ngay (GET /mood-history) + giai thich NYX dang "nghi" gi ve xu huong cam xuc.
// Day la phan the hien "thong minh" cho mon Xay dung he thong thong minh: nguoi dung thay duoc
// vi sao he thong chuyen sang bai dong vien.

const MoodPage = () => {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [hover, setHover] = useState(null);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        api.get('/mood-history')
            .then((res) => setRows(res.data))
            .catch(() => setError("Couldn't load your mood history."));
    }, []);

    const days = useMemo(() => buildDays(rows || []), [rows]);
    const weekTotal = days.reduce((s, d) => s + d.total, 0);
    const maxDay = Math.max(1, ...days.map((d) => d.total));
    const top = useMemo(() => {
        const sums = EMOTIONS.map((e) => ({ ...e, n: days.reduce((s, d) => s + (d.counts[e.key] || 0), 0) }));
        return sums.sort((a, b) => b.n - a.n)[0];
    }, [days]);
    const status = cheerUpStatus(days);
    // vach chia truc doc: so nguyen "dep" (1, 2, 5, 10...)
    const step = maxDay <= 4 ? 1 : maxDay <= 10 ? 2 : maxDay <= 25 ? 5 : 10;
    const scaleMax = Math.ceil(maxDay / step) * step;
    const ticks = [];
    for (let v = 0; v <= scaleMax; v += step) ticks.push(v);

    if (error) return <div className="mood-page"><p className="mood-muted">{error}</p></div>;
    if (!rows) return <div className="mood-page"><p className="mood-muted">Loading…</p></div>;

    return (
        <div className="mood-page">
            <header className="mood-head">
                <span className="mood-eyebrow">Mood history</span>
                <h1>Your mood this week</h1>
                <p>Every scan (or mood you pick) is saved here. NYX uses the last few days to decide when to cheer you up.</p>
            </header>

            <section className="mood-tiles">
                <div className="mood-tile">
                    <span className="tile-label">Scans in 7 days</span>
                    <span className="tile-value">{weekTotal}</span>
                </div>
                <div className="mood-tile">
                    <span className="tile-label">Most common mood</span>
                    <span className="tile-value">
                        {weekTotal ? <MoodIcon emotion={top.key} size={40} /> : '—'}
                    </span>
                </div>
                <div className={`mood-tile status ${status.on ? 'on' : ''}`}>
                    <span className="tile-label">Cheer-up mode</span>
                    <span className="tile-value">{status.on ? 'On' : 'Off'}</span>
                    <span className="tile-note">
                        {status.on
                            ? `${status.negative} of ${status.total} scans ${status.span} were sad or angry, so when you feel down NYX plays happier songs.`
                            : status.total < 4
                                ? `NYX needs at least 4 scans to see a trend (${status.total} ${status.span}).`
                                : `Only ${status.negative} of ${status.total} scans ${status.span} were sad or angry. NYX follows your mood as it is.`}
                    </span>
                </div>
            </section>

            <section className="mood-chart-card">
                <div className="chart-top">
                    <h2>Scans per day, by mood</h2>
                    <button className="table-toggle" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                        {showTable ? 'Show chart' : 'Show table'}
                    </button>
                </div>

                <ul className="chart-legend" aria-label="Legend">
                    {EMOTIONS.map((e) => (
                        <li key={e.key}><span className={`swatch ${e.key}`} aria-hidden="true" />{e.label}</li>
                    ))}
                </ul>

                {weekTotal === 0 && !showTable && (
                    <p className="mood-muted chart-empty">No scans in the last 7 days. Scan your face or pick a mood on the home page, and your week fills in here.</p>
                )}

                {weekTotal > 0 && !showTable && (
                    <div className="chart" role="img" aria-label={`Stacked bar chart of ${weekTotal} scans over 7 days`}>
                        <div className="chart-grid" aria-hidden="true">
                            {ticks.map((t) => (
                                <div key={t} className="grid-line" style={{ bottom: `${(t / scaleMax) * 100}%` }}>
                                    <span>{t}</span>
                                </div>
                            ))}
                        </div>
                        <div className="chart-cols">
                            {days.map((d, i) => (
                                <div
                                    key={i}
                                    className={`chart-col ${hover === i ? 'hover' : ''}`}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                    onFocus={() => setHover(i)}
                                    onBlur={() => setHover(null)}
                                    tabIndex={d.total ? 0 : -1}
                                >
                                    <div className="stack" style={{ height: `${(d.total / scaleMax) * 100}%` }}>
                                        {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                            <div key={e.key} className={`seg ${e.key}`} style={{ flexGrow: d.counts[e.key] }} />
                                        ))}
                                    </div>
                                    {hover === i && d.total > 0 && (
                                        <div className="chart-tip" role="tooltip">
                                            <strong>{d.label} · {d.sub}</strong>
                                            {EMOTIONS.filter((e) => d.counts[e.key]).map((e) => (
                                                <span key={e.key}><i className={`swatch ${e.key}`} />{e.label}<b>{d.counts[e.key]}</b></span>
                                            ))}
                                            <span className="tip-total">Total<b>{d.total}</b></span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="chart-x" aria-hidden="true">
                            {days.map((d, i) => (
                                <span key={i}><b>{d.label}</b>{d.sub}</span>
                            ))}
                        </div>
                    </div>
                )}

                {showTable && (
                    <div className="mood-table-wrap">
                        <table className="mood-table">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    {EMOTIONS.map((e) => <th key={e.key}>{e.label}</th>)}
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {days.map((d, i) => (
                                    <tr key={i}>
                                        <td>{d.label} · {d.sub}</td>
                                        {EMOTIONS.map((e) => <td key={e.key}>{d.counts[e.key] || 0}</td>)}
                                        <td><b>{d.total}</b></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

export default MoodPage
