import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../contexts/authContext';
import HealthTile from '../components/admin/HealthTile';
import TrendChart from '../components/admin/TrendChart';
import UserTable from '../components/admin/UserTable';
import { AdminTabs } from '../components/admin/AdminLayout';
import { METRIC_INFO, STATUS, pct, shortDay, targetText } from '../components/admin/adminMeta';
import { EMOTIONS } from '../utils/moodStats';
import '../components/stats/Stats.scss';
import './MoodPage.scss';
import './AdminPage.scss';

// Trang admin theo dõi hệ thống (/admin, C14 — tài liệu môn C3-2 "Monitoring success criteria"):
// 5 chỉ số thành công của CẢ hệ thống, so với kỳ trước để bắt "tụt" (drift), cảnh báo, theo từng người dùng.
// Số liệu từ GET /admin/health?days=7|30&sample=0|1 (chỉ tài khoản role = 'admin').
const RANGES = [7, 30];

// tiêu đề dải trạng thái: có cảnh báo -> đếm số chỉ số, không có -> câu theo mức chung
const bannerTitle = (overall, alerts, total) => {
    if (alerts.length) return `${alerts.length} of ${total} signals ${overall === 'alert' ? 'need attention' : 'to watch'}`;
    return overall === 'ok' ? 'All signals are healthy' : 'Not enough data to judge yet';
};

const AdminPage = () => {
    const { user } = useAuth();
    const [days, setDays] = useState(30);
    const [sample, setSample] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [selected, setSelected] = useState('completion');
    const shownRef = useRef(null);   // khoảng ngày của số liệu đang hiển thị

    useEffect(() => {
        if (!user?.isAdmin) return undefined;
        let alive = true;
        api.get('/admin/health', { params: { days, sample: sample ? 1 : 0 } })
            .then((res) => {
                if (!alive) return;
                shownRef.current = res.data.days;
                setData(res.data);
                setError('');
            })
            .catch((err) => {
                if (!alive) return;
                setError(err.response?.status === 403 ? 'forbidden' : "Couldn't load system health.");
                setDays((d) => (shownRef.current && shownRef.current !== d ? shownRef.current : d));
            });
        return () => { alive = false; };
    }, [days, sample, reload, user]);

    // người không phải admin đã bị AdminLayout chặn; 403 ở đây = vừa bị gỡ quyền khi đang mở trang
    if (error === 'forbidden') {
        return (
            <div className="mood-page stats-page admin-page">
                <AdminTabs />
                <section className="stats-card admin-locked">
                    <h1>Admins only</h1>
                    <p className="mood-muted">Your admin role was removed. Reload the page.</p>
                </section>
            </div>
        );
    }

    const retry = <button className="table-toggle" onClick={() => setReload((n) => n + 1)}>Try again</button>;
    if (!data) {
        return (
            <div className="mood-page stats-page admin-page">
                <AdminTabs />
                {error ? <p className="stats-error">{error} {retry}</p> : <p className="mood-muted">Loading…</p>}
            </div>
        );
    }

    const metric = data.metrics.find((m) => m.key === selected) || data.metrics[0];
    const busy = days !== data.days || sample !== data.includeSample;

    return (
        <div className="mood-page stats-page admin-page" data-health={data.overall}>
            <AdminTabs />
            <header className="mood-head stats-head">
                <div>
                    <span className="mood-eyebrow">Admin · System health</span>
                    <h1>Is NYX doing its job?</h1>
                    <p>
                        Success signals across {sample ? 'all accounts' : 'real accounts'}, {shortDay(data.from)} – {shortDay(data.to)},
                        compared with the {data.days} days before. {data.activeUsers} {data.activeUsers === 1 ? 'person' : 'people'} active.
                    </p>
                </div>
                <div className="admin-controls" aria-busy={busy}>
                    <label className="sample-switch">
                        <input type="checkbox" role="switch" checked={sample} onChange={(e) => setSample(e.target.checked)} />
                        <span className="track" aria-hidden="true" />
                        Include sample accounts
                    </label>
                    <div className="stats-range" role="group" aria-label="Time range">
                        {RANGES.map((n) => (
                            <button
                                key={n}
                                className={days === n && days !== data.days ? 'pending' : ''}
                                aria-pressed={data.days === n}
                                onClick={() => setDays(n)}
                            >{n} days</button>
                        ))}
                    </div>
                </div>
            </header>
            {error && <p className="stats-error">{error} {retry}</p>}

            <section className={`health-banner s-${data.overall}`} aria-live="polite">
                <span className="hb-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d={STATUS[data.overall].icon} /></svg>
                </span>
                <div>
                    <b>{bannerTitle(data.overall, data.alerts, data.metrics.length)}</b>
                    {data.alerts.length > 0 && (
                        <ul>
                            {data.alerts.map((a) => (
                                <li key={a.metric} className={`s-${a.status}`}>
                                    <button onClick={() => setSelected(a.metric)}>{a.text}</button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {sample && <small>Includes sample accounts generated by seed-demo — not real people.</small>}
                </div>
            </section>

            <section className="health-tiles" aria-label="Success signals">
                {data.metrics.map((m) => (
                    <HealthTile key={m.key} metric={m} days={data.days} selected={m.key === metric.key} onSelect={() => setSelected(m.key)} />
                ))}
            </section>

            <TrendChart metric={metric} unsureBelow={data.unsureBelow} minSamples={data.minSamples} />
            <UserTable users={data.users} minSamples={data.minSamples} />

            {/* C15: vong phan hoi - anh mat + nhan dung nguoi dung da gop de train lai model cam xuc */}
            {data.faces && (
                <section className="stats-card loop-card" aria-labelledby="loop-title">
                    <div className="chart-top"><h3 id="loop-title">Learning from corrections</h3></div>
                    <p className="mood-muted">
                        Every correction is logged (the <b>Mood corrections</b> signal above). People who allow it in Settings also
                        keep the face photo with the right label: that is new training data for the emotion model
                        (<code>prepare_data.py</code> reads it as source "feedback"). All time, all accounts.
                    </p>
                    <div className="loop-stats">
                        <div className="loop-stat main"><b>{data.faces.total}</b><span>face photos</span></div>
                        <div className="loop-stat main"><b>{data.faces.people}</b><span>{data.faces.people === 1 ? 'person' : 'people'}</span></div>
                        {EMOTIONS.map((e) => (
                            <div key={e.key} className={`loop-stat ${e.key}`}><b>{data.faces.byEmotion[e.key] ?? 0}</b><span>{e.label}</span></div>
                        ))}
                    </div>
                </section>
            )}

            <section className="stats-card how-card">
                <div className="chart-top"><h3>How these are measured</h3></div>
                <dl>
                    {data.metrics.map((m) => (
                        <div key={m.key}>
                            <dt>{m.label}</dt>
                            <dd>
                                {METRIC_INFO[m.key].how.replace('{unsure}', pct(data.unsureBelow))}
                                <small>{targetText(m.key, m.target)}</small>
                            </dd>
                        </div>
                    ))}
                </dl>
                <p className="mood-muted">
                    A signal turns <b>Alert</b> when it crosses its alert line, or worsens past its limit compared with the previous period
                    (drift) even if it is still above target. Rates based on fewer than {data.minSamples} samples show <b>Low data</b> instead of a guess.
                </p>
            </section>
        </div>
    );
};

export default AdminPage;
