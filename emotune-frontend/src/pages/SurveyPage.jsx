import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ArtistAvatar from '../components/ArtistAvatar';
import { plain } from '../utils/text';
import { useAuth } from '../contexts/authContext';
import SearchIcon from '../assets/icons/search_icon.svg?react';
import CheckIcon from '../assets/icons/check_icon.svg?react';
import ChevronDownIcon from '../assets/icons/chevron_down_icon.svg?react';
import './SurveyPage.scss';

// Khao sat gu lan dau (Figma 255:5): chon the loai + ca si yeu thich.
// Ket qua luu o survey_genres / survey_artists -> suggestService cong diem thuong (+0.5) cho bai hop gu
// -> nguoi moi chua nghe bai nao van duoc goi y dung gu ("cold start").

const ARTISTS_PER_PAGE = 12;


const toggle = (set, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
}

const SurveyPage = () => {
    const [genres, setGenres] = useState([]);
    const [artists, setArtists] = useState([]);
    const [pickedGenres, setPickedGenres] = useState(new Set());
    const [pickedArtists, setPickedArtists] = useState(new Set());
    const [genreQuery, setGenreQuery] = useState('');
    const [artistQuery, setArtistQuery] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { markSurveyDone } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/genres').then((res) => setGenres(res.data)).catch(() => setError("Couldn't load genres."));
        api.get('/artists').then((res) => setArtists(res.data)).catch(() => setError("Couldn't load artists."));
        // da lam roi (vao lai de sua) -> chon san lua chon cu
        api.get('/profile').then((res) => {
            setPickedGenres(new Set(res.data.genreIds));
            setPickedArtists(new Set(res.data.artistIds));
        }).catch(() => { });
    }, []);

    const shownGenres = useMemo(
        () => genres.filter((g) => plain(g.name).includes(plain(genreQuery.trim()))),
        [genres, genreQuery]
    );
    const matchedArtists = useMemo(
        () => artists.filter((a) => plain(a.name).includes(plain(artistQuery.trim()))),
        [artists, artistQuery]
    );
    // dang tim thi hien het ket qua; khong tim thi chi hien 12 nguoi dau + nut "Show more"
    const shownArtists = showAll || artistQuery ? matchedArtists : matchedArtists.slice(0, ARTISTS_PER_PAGE);

    // mang rong = bo qua (backend van danh dau da lam khao sat)
    const save = (genreIds, artistIds) => {
        setSaving(true);
        setError('');
        api.post('/profile', { genreIds, artistIds })
            .then(() => {
                markSurveyDone();
                navigate('/', { replace: true });
            })
            .catch(() => {
                setError("Couldn't save your choices. Try again.");
                setSaving(false);
            });
    }

    const total = pickedGenres.size + pickedArtists.size;
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    return (
        <div className="survey-page">
            <header className="survey-logo">
                <span className="logo">NYX</span>
                <span className="web-name">NIGHT MUSIC SOCIETY</span>
            </header>

            <main className="survey-content">
                <section className="survey-intro">
                    <div className="eyebrow">WELCOME TO NYX</div>
                    <h1>What music do you love?</h1>
                    <p>
                        Pick a few genres and artists you like so NYX can suggest the right songs from the very first one.
                        After that, it keeps learning from what you listen to.
                    </p>
                </section>

                <section className="survey-section">
                    <div className="section-top">
                        <div className="section-heading">
                            <h2>Favorite genres</h2>
                            <span>Pick one or more</span>
                        </div>
                        <label className="survey-search">
                            <SearchIcon aria-hidden="true" />
                            <input
                                id="genre-search"
                                type="search"
                                placeholder="Search genres..."
                                value={genreQuery}
                                onChange={(e) => setGenreQuery(e.target.value)}
                            />
                        </label>
                    </div>
                    <div className="genre-chips">
                        {shownGenres.map((g) => {
                            const on = pickedGenres.has(g.id);
                            return (
                                <button
                                    key={g.id}
                                    className={`genre-chip ${on ? 'selected' : ''}`}
                                    aria-pressed={on}
                                    onClick={() => setPickedGenres((s) => toggle(s, g.id))}
                                >
                                    {on && <CheckIcon aria-hidden="true" />}
                                    {g.name}
                                </button>
                            )
                        })}
                        {shownGenres.length === 0 && <p className="empty">No genre matches "{genreQuery}".</p>}
                    </div>
                </section>

                <section className="survey-section">
                    <div className="section-top">
                        <div className="section-heading">
                            <h2>Favorite artists</h2>
                            <span>Pick the ones you listen to</span>
                        </div>
                        <label className="survey-search">
                            <SearchIcon aria-hidden="true" />
                            <input
                                id="artist-search"
                                type="search"
                                placeholder="Search artists..."
                                value={artistQuery}
                                onChange={(e) => setArtistQuery(e.target.value)}
                            />
                        </label>
                    </div>
                    <div className="artist-grid">
                        {shownArtists.map((a) => {
                            const on = pickedArtists.has(a.id);
                            return (
                                <button
                                    key={a.id}
                                    className={`artist-card ${on ? 'selected' : ''}`}
                                    aria-pressed={on}
                                    onClick={() => setPickedArtists((s) => toggle(s, a.id))}
                                >
                                    <span className="artist-photo">
                                        <ArtistAvatar name={a.name} avatar={a.avatar} />
                                        {on && <span className="artist-badge"><CheckIcon aria-hidden="true" /></span>}
                                    </span>
                                    <span className="artist-name">{a.name}</span>
                                    <span className="artist-role">Artist</span>
                                </button>
                            )
                        })}
                        {matchedArtists.length === 0 && <p className="empty">No artist matches "{artistQuery}".</p>}
                    </div>
                    {!artistQuery && !showAll && matchedArtists.length > ARTISTS_PER_PAGE && (
                        <div className="show-more">
                            <button onClick={() => setShowAll(true)}>
                                Show more artists <ChevronDownIcon aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </section>

                <footer className="survey-actions">
                    <span className="picked-count">
                        {error || (total === 0
                            ? 'Nothing picked yet'
                            : `Picked ${plural(pickedGenres.size, 'genre')} · ${plural(pickedArtists.size, 'artist')}`)}
                    </span>
                    <div className="buttons">
                        <button className="btn-skip" disabled={saving} onClick={() => save([], [])}>Skip</button>
                        <button
                            className="btn-done"
                            disabled={saving || total === 0}
                            onClick={() => save([...pickedGenres], [...pickedArtists])}
                        >
                            {saving ? 'Saving...' : 'Done'}
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    )
}

export default SurveyPage
