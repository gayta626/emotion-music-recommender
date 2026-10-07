import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AIAssistantProvider } from './contexts/AIAssistantContext'
import MainLayout from './layouts/MainLayout'
import RequireAuth from './components/RequireAuth'
import HomePage from './pages/HomePage'
import Setting from './pages/Setting'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import './App.css'

const App = () => {
  return (
    <div>
      <AIAssistantProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route element={<MainLayout />}>
                <Route path='/' element={<HomePage />} />
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
