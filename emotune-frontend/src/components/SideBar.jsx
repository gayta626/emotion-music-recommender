import './SideBar.scss'
import OpenToggle from '../assets/icons/open_toggle.svg?react'
import CloseToggle from '../assets/icons/close_toggle.svg?react'
import AddIcon from '../assets/icons/add_icon.svg?react'
import SearchIcon from '../assets/icons/search_icon.svg?react'
import BarsIcon from '../assets/icons/bars_icon.svg?react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import { usePlayback } from '../contexts/playbackContext'
import ArtistAvatar from './ArtistAvatar'

const SideBar = () => {
    const [collapsed, setCollapsed] = useState(false)
    const { pathname } = useLocation()
    const navigate = useNavigate()
    // dang mo trang playlist thi tab Playlists duoc chon san
    const [tab, setTab] = useState(pathname.startsWith('/playlist/') ? 'playlists' : 'artists')
    const [artists, setArtists] = useState([])
    const [playlists, setPlaylists] = useState([])
    const { playlistsVersion, refreshPlaylists } = usePlayback()

    useEffect(() => {
        api.get('/artists')
            .then(res => setArtists(res.data))
            .catch(() => { })
    }, [])

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
                <button className="search-icon-btn">
                    <SearchIcon />
                </button>
                <span className="sort-label">
                    Recents
                    <BarsIcon />
                </span>
            </div>}

            <div className="playlist-list">
                {tab === 'artists' && artists.map((item) => (
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

                {/* bam vao playlist -> mo trang playlist (nut Play o do moi phat) */}
                {tab === 'playlists' && playlists.map((item) => (
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
