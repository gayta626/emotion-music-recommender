import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/authContext';
import UserAvatar from '../components/UserAvatar';
import { ArtistPicker, GenrePicker } from '../components/TastePicker';
import { sameIds, toggleId } from '../utils/sets';
import './SettingsPage.scss';

// Trang Settings (/settings, Figma 329:393): thông tin tài khoản + sửa gu (thể loại, ca sĩ yêu thích).
// Gu lưu ở survey_genres / survey_artists qua GET/POST /profile (giống khảo sát lần đầu) -> suggestModel cộng +0.5
// cho bài hợp gu. Chọn xong phải bấm "Save changes" mới lưu; "Undo" quay về lựa chọn đã lưu.

const formatDay = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const SettingsPage = () => {
    const { user, logout, markSurveyDone } = useAuth();
    const navigate = useNavigate();
    const [genres, setGenres] = useState([]);
    const [artists, setArtists] = useState([]);
    const [saved, setSaved] = useState(null);   // { genres: Set, artists: Set, updatedAt } đang lưu trong DB
    const [pickedGenres, setPickedGenres] = useState(new Set());
    const [pickedArtists, setPickedArtists] = useState(new Set());
    const [overview, setOverview] = useState(null);
    const [status, setStatus] = useState('idle');   // idle | saving | saved | error
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        api.get('/genres').then((res) => setGenres(res.data)).catch(() => setLoadError("Couldn't load genres."));
        api.get('/artists').then((res) => setArtists(res.data)).catch(() => setLoadError("Couldn't load artists."));
        api.get('/profile').then((res) => {
            const g = new Set(res.data.genreIds);
            const a = new Set(res.data.artistIds);
            setSaved({ genres: g, artists: a, updatedAt: res.data.updatedAt });
            setPickedGenres(g);
            setPickedArtists(a);
        }).catch(() => setLoadError("Couldn't load your taste."));
        api.get('/stats', { params: { days: 30 } }).then((res) => setOverview(res.data.overview)).catch(() => {});
    }, []);

    // "Saved" hiện 4 giây rồi tự ẩn thanh lưu
    useEffect(() => {
        if (status !== 'saved') return undefined;
        const t = setTimeout(() => setStatus('idle'), 4000);
        return () => clearTimeout(t);
    }, [status]);

    const dirty = saved !== null && !(sameIds(pickedGenres, saved.genres) && sameIds(pickedArtists, saved.artists));
    const edit = (setter) => (id) => {
        setter((s) => toggleId(s, id));
        if (status !== 'saving') setStatus('idle');
    };

    const save = () => {
        setStatus('saving');
        api.post('/profile', { genreIds: [...pickedGenres], artistIds: [...pickedArtists] })
            .then(() => {
                setSaved({ genres: new Set(pickedGenres), artists: new Set(pickedArtists), updatedAt: new Date().toISOString() });
                markSurveyDone();
                setStatus('saved');
            })
            .catch(() => setStatus('error'));
    };
    const undo = () => {
        setPickedGenres(new Set(saved.genres));
        setPickedArtists(new Set(saved.artists));
        setStatus('idle');
    };

    const tasteFact = !saved ? '…'
        : saved.genres.size + saved.artists.size === 0 ? 'Nothing picked yet'
            : `Updated ${formatDay(saved.updatedAt)}`;
    const picked = `${plural(pickedGenres.size, 'genre')} · ${plural(pickedArtists.size, 'artist')} picked`;

    return (
        <div className="settings-page">
            <header className="settings-head">
                <span className="eyebrow">SETTINGS</span>
                <h1>Your account &amp; taste</h1>
                <p>Change what music you like. NYX uses your taste when it picks a song for your mood.</p>
            </header>
            {loadError && <p className="settings-error" role="alert">{loadError}</p>}

            <section className="settings-card profile" aria-label="Profile">
                <div className="profile-row">
                    <UserAvatar username={user?.username} size={72} />
                    <div className="profile-name">
                        <h2>{user?.username}</h2>
                        <span>Signed in on this browser</span>
                    </div>
                    <button className="btn-ghost" onClick={logout}>Log out</button>
                </div>
                <div className="profile-facts">
                    <div className="fact"><span>Username</span><b>{user?.username}</b></div>
                    <div className="fact"><span>Music taste</span><b>{tasteFact}</b></div>
                    <button className="fact link" onClick={() => navigate('/stats')}>
                        <span>Last 30 days</span>
                        <b>{overview ? `${plural(overview.scans, 'scan')} · ${plural(overview.plays, 'song')} played` : '…'}</b>
                    </button>
                </div>
            </section>

            <section className="settings-card">
                <GenrePicker
                    genres={genres}
                    picked={pickedGenres}
                    onToggle={edit(setPickedGenres)}
                    title="Favorite genres"
                    note="Pick any. Songs in these genres get a small boost (+0.5) when NYX picks for your mood."
                />
            </section>

            <section className="settings-card">
                <ArtistPicker
                    artists={artists}
                    picked={pickedArtists}
                    onToggle={edit(setPickedArtists)}
                    title="Favorite artists"
                    note="Tap to add or remove. Songs by these artists get +0.5. Follow on an artist page does the same."
                />
            </section>

            {(dirty || status === 'saved' || status === 'error') && (
                <div className={`settings-savebar ${status}`} role="status">
                    <i aria-hidden="true" />
                    <div className="savebar-text">
                        <b>
                            {status === 'saved' && !dirty ? 'Saved. NYX will use your new taste from the next song.'
                                : status === 'error' ? "Couldn't save. Try again."
                                    : 'Unsaved changes'}
                        </b>
                        <span>{picked}</span>
                    </div>
                    {dirty && (
                        <>
                            <button className="btn-ghost" onClick={undo} disabled={status === 'saving'}>Undo</button>
                            <button className="btn-primary" onClick={save} disabled={status === 'saving'}>
                                {status === 'saving' ? 'Saving…' : 'Save changes'}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
