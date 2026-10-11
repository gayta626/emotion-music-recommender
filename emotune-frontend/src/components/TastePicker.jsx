import { useId, useMemo, useState } from 'react';
import ArtistAvatar from './ArtistAvatar';
import { plain } from '../utils/text';
import SearchIcon from '../assets/icons/search_icon.svg?react';
import CheckIcon from '../assets/icons/check_icon.svg?react';
import ChevronDownIcon from '../assets/icons/chevron_down_icon.svg?react';
import './TastePicker.scss';

// Chọn gu âm nhạc (Figma "Genre chip" 254:11, "Artist card" 254:30, "Search field" 257:98).
// Dùng chung cho khảo sát lần đầu (/survey) và trang Settings (/settings): trang cha giữ danh sách đã chọn.

const ARTISTS_PER_PAGE = 12;

const Search = ({ value, onChange, placeholder }) => {
    const id = useId();
    return (
        <label className="taste-search" htmlFor={id}>
            <SearchIcon aria-hidden="true" />
            <input id={id} type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
    );
};

const Heading = ({ title, note }) => (
    <div className="section-heading">
        <h2>{title}</h2>
        {note && <span>{note}</span>}
    </div>
);

export const GenrePicker = ({ genres, picked, onToggle, title, note }) => {
    const [query, setQuery] = useState('');
    const shown = useMemo(() => genres.filter((g) => plain(g.name).includes(plain(query.trim()))), [genres, query]);
    return (
        <div className="taste-picker">
            <div className="section-top">
                <Heading title={title} note={note} />
                <Search value={query} onChange={setQuery} placeholder="Search genres..." />
            </div>
            <div className="genre-chips">
                {shown.map((g) => {
                    const on = picked.has(g.id);
                    return (
                        <button key={g.id} className={`genre-chip ${on ? 'selected' : ''}`} aria-pressed={on} onClick={() => onToggle(g.id)}>
                            {on && <CheckIcon aria-hidden="true" />}
                            {g.name}
                        </button>
                    );
                })}
                {shown.length === 0 && <p className="empty">No genre matches "{query}".</p>}
            </div>
        </div>
    );
};

export const ArtistPicker = ({ artists, picked, onToggle, title, note }) => {
    const [query, setQuery] = useState('');
    const [showAll, setShowAll] = useState(false);
    const matched = useMemo(() => artists.filter((a) => plain(a.name).includes(plain(query.trim()))), [artists, query]);
    // đang tìm thì hiện hết kết quả; không tìm thì chỉ hiện 12 người đầu + nút "Show more"
    const shown = showAll || query ? matched : matched.slice(0, ARTISTS_PER_PAGE);
    return (
        <div className="taste-picker">
            <div className="section-top">
                <Heading title={title} note={note} />
                <Search value={query} onChange={setQuery} placeholder="Search artists..." />
            </div>
            <div className="artist-grid">
                {shown.map((a) => {
                    const on = picked.has(a.id);
                    return (
                        <button key={a.id} className={`artist-card ${on ? 'selected' : ''}`} aria-pressed={on} onClick={() => onToggle(a.id)}>
                            <span className="artist-photo">
                                <ArtistAvatar name={a.name} avatar={a.avatar} />
                                {on && <span className="artist-badge"><CheckIcon aria-hidden="true" /></span>}
                            </span>
                            <span className="artist-name">{a.name}</span>
                            <span className="artist-role">Artist</span>
                        </button>
                    );
                })}
                {matched.length === 0 && <p className="empty">No artist matches "{query}".</p>}
            </div>
            {!query && !showAll && matched.length > ARTISTS_PER_PAGE && (
                <div className="show-more">
                    <button onClick={() => setShowAll(true)}>
                        Show more artists <ChevronDownIcon aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    );
};
