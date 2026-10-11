import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/authContext';
import { ArtistPicker, GenrePicker } from '../components/TastePicker';
import { toggleId } from '../utils/sets';
import './SurveyPage.scss';

// Khao sat gu lan dau (Figma 255:5): chon the loai + ca si yeu thich.
// Ket qua luu o survey_genres / survey_artists -> suggestService cong diem thuong (+0.5) cho bai hop gu
// -> nguoi moi chua nghe bai nao van duoc goi y dung gu ("cold start").
// Phan chon the loai / ca si dung chung voi trang Settings: components/TastePicker.

const SurveyPage = () => {
    const [genres, setGenres] = useState([]);
    const [artists, setArtists] = useState([]);
    const [pickedGenres, setPickedGenres] = useState(new Set());
    const [pickedArtists, setPickedArtists] = useState(new Set());
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
                    <GenrePicker
                        genres={genres}
                        picked={pickedGenres}
                        onToggle={(id) => setPickedGenres((s) => toggleId(s, id))}
                        title="Favorite genres"
                        note="Pick one or more"
                    />
                </section>

                <section className="survey-section">
                    <ArtistPicker
                        artists={artists}
                        picked={pickedArtists}
                        onToggle={(id) => setPickedArtists((s) => toggleId(s, id))}
                        title="Favorite artists"
                        note="Pick the ones you listen to"
                    />
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
