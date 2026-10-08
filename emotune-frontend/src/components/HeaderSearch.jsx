import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import { usePlayback } from '../contexts/playbackContext'
import { plain } from '../utils/text'
import SearchIcon from '../assets/icons/search_icon.svg?react'
import SongThumb from './SongThumb'
import './HeaderSearch.scss'

// O tim kiem tren header: go ten bai / ca si (khong dau cung duoc) -> chon 1 bai la phat ngay
const HeaderSearch = () => {
    const [songs, setSongs] = useState(null)
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const boxRef = useRef(null)
    const { playSong } = usePlayback()

    // chi tai danh sach bai khi nguoi dung bam vao o tim (khong tai thua khi chua can)
    const loadSongs = () => {
        if (songs) return
        api.get('/songs').then((res) => setSongs(res.data)).catch(() => setSongs([]))
    }

    useEffect(() => {
        if (!open) return
        const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    const results = useMemo(() => {
        const q = plain(query.trim())
        if (!q || !songs) return []
        return songs.filter((s) => plain(`${s.title} ${s.artist || ''}`).includes(q)).slice(0, 6)
    }, [songs, query])

    const choose = (song) => {
        playSong(song)
        setQuery('')
        setOpen(false)
    }

    // phim mui ten len/xuong de chon, Enter de phat, Esc de dong
    const onKeyDown = (e) => {
        if (e.key === 'Escape') { setOpen(false); return }
        if (!results.length) return
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % results.length) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length) }
        if (e.key === 'Enter') { e.preventDefault(); choose(results[Math.min(active, results.length - 1)]) }
    }

    const showList = open && query.trim()

    return (
        <div className="search-bar header-search" ref={boxRef}>
            <SearchIcon className="search-icon" />
            <input
                id="header-search"
                type="search"
                placeholder="Search music, artists, albums..."
                className="search-input"
                value={query}
                autoComplete="off"
                onFocus={() => { loadSongs(); setOpen(true) }}
                onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true) }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded={!!showList}
                aria-controls="header-search-results"
            />
            {showList && (
                <ul className="search-results" id="header-search-results" role="listbox">
                    {!songs && <li className="search-empty">Loading…</li>}
                    {songs && results.length === 0 && <li className="search-empty">No song or artist matches "{query}".</li>}
                    {results.map((s, i) => (
                        <li key={s.id} role="option" aria-selected={i === active}>
                            <button
                                className={`search-item ${i === active ? 'active' : ''}`}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(s)}
                            >
                                <SongThumb className="search-thumb" song={s} />
                                <span className="search-text">
                                    <span className="search-title">{s.title}</span>
                                    <span className="search-artist">{s.artist || 'Unknown artist'}</span>
                                </span>
                                <span className="search-play" aria-hidden="true">▶</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default HeaderSearch
