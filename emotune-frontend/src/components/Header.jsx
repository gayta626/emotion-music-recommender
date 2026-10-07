import './Header.scss'
import HomeIcon from '../assets/icons/home_icon.svg?react'
import HeaderSearch from './HeaderSearch'
import MoodButton from './MoodButton'
import AIIcon from '../assets/icons/ai_icon.svg?react'
import NotificationIcon from '../assets/icons/notification_icon.svg?react'
import UserIcon from '../assets/icons/user_icon.svg?react'
import { useAuth } from '../contexts/authContext'
import { useNavigate } from 'react-router-dom'

const Header = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
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
                        {/* ve trang chu: chuyen trang trong app (khong tai lai) nen nhac dang phat khong bi tat */}
                        <button className="home-btn" onClick={() => navigate('/')} aria-label="Home">
                            <HomeIcon />
                        </button>
                        <HeaderSearch />
                    </div>

                </div>

                {/* bieu tuong AI: tro ly giong noi (phan 2, chua lam) */}
                <button className="ai-btn" title="Voice assistant (coming soon)" aria-label="Voice assistant (coming soon)">
                    <AIIcon className="ai-icon" />
                </button>

                <div className="action-container">
                    {/* man quet thu gon thanh icon: bam -> /scan */}
                    <MoodButton />
                    <button className="explore-premium-btn">
                        Explore Premium
                    </button>
                    <div className="setting-and-notification-container">
                        <button className="notification-btn" aria-label="Notifications">
                            <NotificationIcon />
                        </button>
                        {/* bam ten tai khoan -> trang thong ke cam xuc */}
                        <button className="user-info" onClick={() => navigate('/stats')} title="Your stats">
                            <UserIcon />
                            <span className="username">{user?.username}</span>
                        </button>
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