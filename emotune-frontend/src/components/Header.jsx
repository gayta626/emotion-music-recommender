import './Header.scss'
import HomeIcon from '../assets/icons/home_icon.svg?react'
import SearchIcon from '../assets/icons/search_icon.svg?react'
import AIIcon from '../assets/icons/ai_icon.svg?react'
import NotificationIcon from '../assets/icons/notification_icon.svg?react'
import UserIcon from '../assets/icons/user_icon.svg?react'
import { useAuth } from '../contexts/authContext'

const Header = () => {
    const { user, logout } = useAuth()
    return (
        <>
            <div className="header-container">
                <div className="app-name-container">
                    <div className="logo-group">
                        <div className="logo">
                            NYX
                        </div>
                        <div className="web-name">
                            NIGHT MUSIC SOCIETY
                        </div>
                    </div>
                    <div className="home-search-group">
                        <button className="home-btn">
                            <HomeIcon />
                        </button>
                        <div className="search-bar">
                            <SearchIcon className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search music, artists, albums..."
                                className="search-input"
                            />
                        </div>
                    </div>

                </div>

                <AIIcon className="ai-icon" />

                <div className="action-container">
                    <button className="explore-premium-btn">
                        Explore Premium
                    </button>
                    <div className="setting-and-notification-container">
                        <button className="notification-btn">
                            <NotificationIcon />
                        </button>
                        <div className="user-info">
                            <UserIcon />
                            <span className="username">{user?.username}</span>
                        </div>
                        <button className="logout-btn" onClick={logout}>
                            Log out
                        </button>
                    </div>

                </div>
            </div>
        </>
    )
}

export default Header