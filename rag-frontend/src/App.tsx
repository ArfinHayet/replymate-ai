import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { PrivateRoute } from './components/PrivateRoute'
import { UploadPage } from './pages/UploadPage'
import { PdfsPage } from './pages/PdfsPage'
import { ChatPage } from './pages/ChatPage'
import { CompanyPage } from './pages/CompanyPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { EmbedPage } from './pages/EmbedPage'
import { ImageUploadPage } from './pages/ImageUploadPage'
import { ImagesPage } from './pages/ImagesPage'
import { isLoggedIn } from './lib/auth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no sidebar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected routes — inside sidebar layout */}
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to={isLoggedIn() ? '/chat' : '/login'} replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/pdfs" element={<PdfsPage />} />
            <Route path="/images/upload" element={<ImageUploadPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/embed" element={<EmbedPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

