import './SideBar.scss'
import OpenToggle from '../assets/icons/open_toggle.svg?react'
import CloseToggle from '../assets/icons/close_toggle.svg?react'
import AddIcon from '../assets/icons/add_icon.svg?react'
import SearchIcon from '../assets/icons/search_icon.svg?react'
import BarsIcon from '../assets/icons/bars_icon.svg?react'
import { useEffect, useState } from 'react'
import api from '../api'
// API_URL van can cho the <img> anh ca si (trinh duyet tu tai, khong qua axios)
import { API_URL } from '../config'

const SideBar = () => {
    const [collapsed, setCollapsed] = useState(false)
    const [artists, setArtists] = useState([])

    useEffect(() => {
        api.get('/artists')
            .then(res => setArtists(res.data))
            .catch(() => { })
    }, [])

    return (
        <div className={`side-bar-container ${collapsed ? 'collapse' : ''}`}>
            <div className="action-container">
                <div className="toggle-title">
                    <button className='toggle' onClick={() => setCollapsed(!collapsed)}>
                        {!collapsed ? <CloseToggle /> : <OpenToggle />}
                    </button>
                    {!collapsed && <span className='title'>Your Library</span>}
                </div>

                {!collapsed && <button className="add-btn">
                    <AddIcon />
                </button>}
            </div>

            {!collapsed && <div className="filter-tabs">
                <button className="tab active">Artists</button>
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
                {artists.map((item) => (
                    <div className="playlist-item" key={item.id}>
                        <img className="cover" src={`${API_URL}/avatars/${item.avatar}`} alt={item.name} />
                        {!collapsed && <div className="info">
                            <span className="name">{item.name}</span>
                            <span className="subtitle">Artist</span>
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SideBar
