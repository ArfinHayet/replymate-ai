import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { PrivateRoute } from "@/features/auth/view/components/PrivateRoute";

const LoginPage = lazy(() => import("@/features/auth").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("@/features/auth").then((module) => ({ default: module.SignupPage })));
const AuthCallbackPage = lazy(() =>
  import("@/features/authCallback").then((module) => ({ default: module.AuthCallbackPage })),
);
const UploadPage = lazy(() => import("@/features/upload").then((module) => ({ default: module.UploadPage })));
const PdfsPage = lazy(() => import("@/features/pdfs").then((module) => ({ default: module.PdfsPage })));
const WebPagesPage = lazy(() => import("@/features/webPages").then((module) => ({ default: module.WebPagesPage })));
const ImageUploadPage = lazy(() => import("@/features/images").then((module) => ({ default: module.ImageUploadPage })));
const ImagesPage = lazy(() => import("@/features/images").then((module) => ({ default: module.ImagesPage })));
const CompanyPage = lazy(() => import("@/features/company").then((module) => ({ default: module.CompanyPage })));
const ChatPage = lazy(() => import("@/features/chat").then((module) => ({ default: module.ChatPage })));
const ChatHistoryPage = lazy(() =>
  import("@/features/chatHistory").then((module) => ({ default: module.ChatHistoryPage })),
);
const EmbedPage = lazy(() => import("@/features/embed").then((module) => ({ default: module.EmbedPage })));
const ProfilePage = lazy(() => import("@/features/profile").then((module) => ({ default: module.ProfilePage })));

function RouteFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-rm-trip-surface">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-rm-trip-brand/20 border-t-rm-trip-brand" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes - no sidebar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected routes - inside sidebar layout */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/pdfs" element={<PdfsPage />} />
              <Route path="/web-pages" element={<WebPagesPage />} />
              <Route path="/images/upload" element={<ImageUploadPage />} />
              <Route path="/images" element={<ImagesPage />} />
              <Route path="/company" element={<CompanyPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat-history" element={<ChatHistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/embed" element={<EmbedPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
