import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AIAssistantProvider } from './contexts/AIAssistantContext'
import MainLayout from './layouts/MainLayout'
import RequireAuth from './components/RequireAuth'
import Setting from './pages/Setting'
import PlaylistPage from './pages/PlaylistPage'
import MoodPage from './pages/MoodPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SurveyPage from './pages/SurveyPage'
import './App.css'

const App = () => {
  return (
    <div>
      <AIAssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<RequireAuth />}>
              {/* khảo sát gu: cần đăng nhập nhưng không có header/sidebar (theo Figma 255:5) */}
              <Route path='/survey' element={<SurveyPage />} />
              <Route element={<MainLayout />}>
                {/* trang chủ (HomePage) do MainLayout tự vẽ và luôn giữ, để nhạc không tắt khi đổi trang */}
                <Route path='/' element={null} />
                <Route path='/playlist/:id' element={<PlaylistPage />} />
                <Route path='/mood' element={<MoodPage />} />
                <Route path='/settings' element={<Setting />} />
              </Route>
            </Route>
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
          </Routes>
        </BrowserRouter>
      </AIAssistantProvider>
    </div>
  )
}

export default App
