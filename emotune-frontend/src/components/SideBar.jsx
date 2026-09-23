import './SideBar.scss'
import OpenToggle from '../assets/icons/open_toggle.svg?react'
import CloseToggle from '../assets/icons/close_toggle.svg?react'
import AddIcon from '../assets/icons/add_icon.svg?react'
import SearchIcon from '../assets/icons/search_icon.svg?react'
import { useState } from 'react'

const playlists = [
    { id: 1, name: 'My Playlist #4', owner: 'nguyen duc vinh', cover: null },
    { id: 2, name: 'My Playlist #3', owner: 'nguyen duc vinh', cover: null },
    { id: 3, name: 'My Playlist #2', owner: 'nguyen duc vinh', cover: null },
]

const SideBar = () => {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className={`side-bar-container ${collapsed ? 'collapse' : ''}`}>
            <div className="action-container">
                <div className="toggle-title">
                    <button className='toggle' onClick={() => setCollapsed(!collapsed)}>
                        {!collapsed ? <CloseToggle /> : <OpenToggle />}
                    </button>
                    {!collapsed && <span className='title'>Your Library</span>}
                </div>

                <button className="add-btn">
                    <AddIcon />
                </button>

            </div>

            {true && (
                <>
                    {!collapsed && <div className="filter-tabs">
                        <button className="tab active">Playlists</button>
                    </div>}

                    <div className="search-row">
                        {!collapsed && <button className="search-icon-btn">
                            <SearchIcon />
                        </button>}
                        {!collapsed && <span className="sort-label">Recents</span>}
                    </div>

                    <div className="playlist-list">
                        {playlists.map((item) => (
                            <div className="playlist-item" key={item.id}>
                                <div className="cover">
                                    {item.cover
                                        ? <img src={item.cover} alt={item.name} />
                                        : <div className="cover-placeholder" />}
                                </div>
                                {!collapsed && <div className="info">
                                    <span className="name">{item.name}</span>
                                    <span className="subtitle">Playlist • {item.owner}</span>
                                </div>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default SideBar