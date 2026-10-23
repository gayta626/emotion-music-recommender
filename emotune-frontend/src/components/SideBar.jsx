import './SideBar.scss'
import OpenToggle from '../assets/icons/open_toggle.svg?react'
import CloseToggle from '../assets/icons/close_toggle.svg?react'
import AddIcon from '../assets/icons/add_icon.svg?react'
import SearchIcon from '../assets/icons/search_icon.svg?react'
import BarsIcon from '../assets/icons/bars_icon.svg?react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import { usePlayback } from '../contexts/playbackContext'
import ArtistAvatar from './ArtistAvatar'
import HeartIcon from './HeartIcon'
import { plain } from '../utils/text'
import { SORTS, orderLibrary } from '../utils/libraryOrder'

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5 9.5 17 19 7" />
    </svg>
)

const SideBar = () => {
    const [collapsed, setCollapsed] = useState(false)
    const { pathname } = useLocation()
    const navigate = useNavigate()
    // dang mo trang playlist thi tab Playlists duoc chon san
    const [tab, setTab] = useState(pathname.startsWith('/playlist/') || pathname === '/liked' ? 'playlists' : 'artists')
    const [artists, setArtists] = useState([])
    const [playlists, setPlaylists] = useState([])
    const { playlistsVersion, refreshPlaylists, likedSongs, nowPlaying } = usePlayback()
    // o tim trong thu vien (bam kinh lup moi hien) + kieu sap xep (bam "Recents" -> menu)
    const [searchOpen, setSearchOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState('recents')
    const [sortOpen, setSortOpen] = useState(false)
    const sortRef = useRef(null)
    // lan cuoi nghe tung ca si { [artistId]: ms } -> sap xep Recents
    const [artistPlayed, setArtistPlayed] = useState({})
    const songId = nowPlaying?.songId

    useEffect(() => {
        api.get('/artists')
            .then(res => setArtists(res.data))
            .catch(() => { })
    }, [])

    // doi bai = bai truoc vua duoc ghi luot nghe -> hoi lai thu tu "nghe gan day"
    useEffect(() => {
        api.get('/artists/recent')
            .then(res => setArtistPlayed(Object.fromEntries(res.data.map(r => [r.id, Date.parse(r.lastPlayed)]))))
            .catch(() => { })
    }, [songId])

    // menu sap xep: dong khi bam ra ngoai hoac nhan Esc
    useEffect(() => {
        if (!sortOpen) return undefined
        const onDown = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
        const onKey = (e) => { if (e.key === 'Escape') setSortOpen(false) }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [sortOpen])

    // thu gon thanh thu vien thi khong thay o tim -> khong loc nua
    const q = collapsed ? '' : query
    const shownArtists = useMemo(() => orderLibrary(artists, {
        query: q, sort, recent: (a) => artistPlayed[a.id] || 0, added: (a) => a.id,
    }), [artists, q, sort, artistPlayed])
    const shownPlaylists = useMemo(() => orderLibrary(playlists, {
        query: q, sort, recent: (p) => Date.parse(p.updatedAt) || 0, added: (p) => Date.parse(p.createdAt) || p.id,
    }), [playlists, q, sort])
    // Liked Songs luon ghim dau, chi an khi dang tim ma ten khong khop
    const showLiked = !q.trim() || plain('Liked Songs').includes(plain(q.trim()))
    const noResult = q.trim() && (tab === 'artists' ? shownArtists.length === 0 : !showLiked && shownPlaylists.length === 0)

    const closeSearch = () => {
        setQuery('')
        setSearchOpen(false)
    }

    // tai lai khi doi tab hoac vua them bai vao playlist (playlistsVersion tang)
    useEffect(() => {
        if (tab !== 'playlists') return;
        api.get('/playlists')
            .then(res => setPlaylists(res.data))
            .catch(() => { })
    }, [tab, playlistsVersion])

    // nut +: tao playlist moi (ten tu dat "My Playlist #2"...) roi mo trang cua no
    const createPlaylist = () => {
        api.post('/playlists', {})
            .then((res) => {
                setTab('playlists')
                refreshPlaylists()
                navigate(`/playlist/${res.data.id}`)
            })
            .catch(() => { })
    }

    return (
        <div className={`side-bar-container ${collapsed ? 'collapse' : ''}`}>
            <div className="action-container">
                <div className="toggle-title">
                    <button className='toggle' onClick={() => setCollapsed(!collapsed)}>
                        {!collapsed ? <CloseToggle /> : <OpenToggle />}
                    </button>
                    {!collapsed && <span className='title'>Your Library</span>}
                </div>

                {!collapsed && <button className="add-btn" onClick={createPlaylist} title="Create playlist" aria-label="Create playlist">
                    <AddIcon />
                </button>}
            </div>

            {!collapsed && <div className="filter-tabs">
                <button className={`tab ${tab === 'artists' ? 'active' : ''}`} onClick={() => setTab('artists')}>Artists</button>
                <button className={`tab ${tab === 'playlists' ? 'active' : ''}`} onClick={() => setTab('playlists')}>Playlists</button>
            </div>}

            {!collapsed && <div className="search-row">
                {searchOpen ? (
                    <div className="lib-search">
                        <SearchIcon />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') closeSearch() }}
                            // bam ra ngoai ma o tim trong -> thu lai thanh icon
                            onBlur={() => { if (!query.trim()) setSearchOpen(false) }}
                            placeholder="Search in Your Library"
                            aria-label="Search in Your Library"
                        />
                        {query && <button
                            className="clear-btn"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={closeSearch}
                            title="Clear search"
                            aria-label="Clear search"
                        >✕</button>}
                    </div>
                ) : (
                    <button className="search-icon-btn" onClick={() => setSearchOpen(true)} title="Search in Your Library" aria-label="Search in Your Library">
                        <SearchIcon />
                    </button>
                )}
                <div className="sort-menu" ref={sortRef}>
                    <button className="sort-label" onClick={() => setSortOpen(!sortOpen)} aria-haspopup="menu" aria-expanded={sortOpen}>
                        {SORTS.find(s => s.key === sort).label}
                        <BarsIcon />
                    </button>
                    {sortOpen && <div className="sort-popup" role="menu">
                        <p className="sort-title">Sort by</p>
                        {SORTS.map(s => (
                            <button
                                key={s.key}
                                role="menuitemradio"
                                aria-checked={s.key === sort}
                                className={s.key === sort ? 'active' : ''}
                                onClick={() => { setSort(s.key); setSortOpen(false) }}
                            >
                                {s.label}
                                {s.key === sort && <CheckIcon />}
                            </button>
                        ))}
                    </div>}
                </div>
            </div>}

            <div className="playlist-list">
                {noResult && <p className="empty">No results for “{q.trim()}”</p>}
                {tab === 'artists' && shownArtists.map((item) => (
                    <button
                        className={`playlist-item ${pathname === `/artist/${item.id}` ? 'active' : ''}`}
                        key={item.id}
                        onClick={() => navigate(`/artist/${item.id}`)}
                        title={item.name}
                    >
                        <ArtistAvatar className="cover" name={item.name} avatar={item.avatar} />
                        {!collapsed && <div className="info">
                            <span className="name">{item.name}</span>
                            <span className="subtitle">Artist</span>
                        </div>}
                    </button>
                ))}

                {/* "Liked Songs" (bai da ♥) luon ghim dau tab Playlists, mo trang /liked giong cac playlist khac */}
                {tab === 'playlists' && showLiked && (
                    <button
                        className={`playlist-item ${pathname === '/liked' ? 'active' : ''}`}
                        onClick={() => navigate('/liked')}
                        title="Liked Songs"
                    >
                        <span className="cover playlist-cover liked-cover" aria-hidden="true"><HeartIcon filled /></span>
                        {!collapsed && <div className="info">
                            <span className="name">Liked Songs</span>
                            <span className="subtitle">Playlist · {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'}</span>
                        </div>}
                    </button>
                )}
                {/* bam vao playlist -> mo trang playlist (nut Play o do moi phat) */}
                {tab === 'playlists' && shownPlaylists.map((item) => (
                    <button
                        className={`playlist-item ${pathname === `/playlist/${item.id}` ? 'active' : ''}`}
                        key={item.id}
                        onClick={() => navigate(`/playlist/${item.id}`)}
                        title={item.name}
                    >
                        <span className="cover playlist-cover" aria-hidden="true">♪</span>
                        {!collapsed && <div className="info">
                            <span className="name">{item.name}</span>
                            <span className="subtitle">Playlist · {item.songCount} {item.songCount === 1 ? 'song' : 'songs'}</span>
                        </div>}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default SideBar
