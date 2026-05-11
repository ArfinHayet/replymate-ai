import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PrivateRoute } from './components/PrivateRoute'
import { UploadPage } from './pages/UploadPage'
import { PdfsPage } from './pages/PdfsPage'
import { ChatPage } from './pages/ChatPage'
import { CompanyPage } from './pages/CompanyPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { isLoggedIn } from './lib/auth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no sidebar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes — inside sidebar layout */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to={isLoggedIn() ? '/chat' : '/login'} replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/pdfs" element={<PdfsPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

