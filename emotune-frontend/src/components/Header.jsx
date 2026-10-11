import './Header.scss'
import HomeIcon from '../assets/icons/home_icon.svg?react'
import HeaderSearch from './HeaderSearch'
import MoodButton from './MoodButton'
import AIIcon from '../assets/icons/ai_icon.svg?react'
import NotificationMenu from './NotificationMenu'
import AccountMenu from './AccountMenu'
import { useNavigate } from 'react-router-dom'
import { useAIAssistant } from '../contexts/aiAssistantStore'

const Header = () => {
    const navigate = useNavigate()
    const { openAssistant } = useAIAssistant()
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

                {/* bieu tuong AI: mo tro ly giong noi (H6) */}
                <button className="ai-btn" onClick={openAssistant} title="Voice assistant" aria-label="Voice assistant">
                    <AIIcon className="ai-icon" />
                </button>

                <div className="action-container">
                    {/* man quet thu gon thanh icon: bam -> /scan */}
                    <MoodButton />
                    {/* cho cua nut "Explore Premium" (Spotify) cu: app khong co goi Premium -> tom tat tuan nay o /stats */}
                    <button className="your-week-btn" onClick={() => navigate('/stats')} title="Your moods and music this week">
                        Your week
                    </button>
                    <div className="setting-and-notification-container">
                        {/* chuong = nhan xet cua NYX (GET /insights) */}
                        <NotificationMenu />
                        {/* bam ten tai khoan -> menu: Your stats / Settings / Log out */}
                        <AccountMenu />
                    </div>

                </div>
            </div>
        </>
    )
}

export default Header