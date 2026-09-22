import './SideBar.scss'
import OpenToggle from '../assets/icons/open_toggle.svg?react'
import CloseToggle from '../assets/icons/close_toggle.svg?react'
import { useState } from 'react'

const SideBar = () => {
    const [collapsed, setCollapse] = useState(false)
    return (
        <>
            <div className="side-bar-container">
                <div className="action-container">
                    <div className="toggle-title">
                        <span>Your Library</span>
                        <CloseToggle onClick={() => setCollapsed(!collapsed)} />
                    </div>
                </div>
            </div>
        </>
    )
}

export default SideBar