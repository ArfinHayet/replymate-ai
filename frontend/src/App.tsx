import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { PrivateRoute } from "@/features/auth/view/components/PrivateRoute";

const LandingPage = lazy(() => import("@/features/landing").then((module) => ({ default: module.LandingPage })));
const TermsOfServicePage = lazy(() =>
  import("@/features/legal").then((module) => ({ default: module.TermsOfServicePage })),
);
const PrivacyPolicyPage = lazy(() =>
  import("@/features/legal").then((module) => ({ default: module.PrivacyPolicyPage })),
);
const LoginPage = lazy(() => import("@/features/auth").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("@/features/auth").then((module) => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.ResetPasswordPage })),
);
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
const ChatSuggestionsPage = lazy(() =>
  import("@/features/chat").then((module) => ({ default: module.ChatSuggestionsPage })),
);
const ChatHistoryPage = lazy(() =>
  import("@/features/chatHistory").then((module) => ({ default: module.ChatHistoryPage })),
);
const EmbedPage = lazy(() => import("@/features/embed").then((module) => ({ default: module.EmbedPage })));
const ToolsPage = lazy(() => import("@/features/tools").then((module) => ({ default: module.ToolsPage })));
const ProfilePage = lazy(() => import("@/features/profile").then((module) => ({ default: module.ProfilePage })));
const ProfileCompletionPage = lazy(() =>
  import("@/features/profileCompletion").then((module) => ({ default: module.ProfileCompletionPage })),
);
const AnalyticsPage = lazy(() => import("@/features/analytics").then((module) => ({ default: module.AnalyticsPage })));
const UpgradePage = lazy(() => import("@/features/upgrade").then((module) => ({ default: module.UpgradePage })));

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/users/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/users/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected routes - inside sidebar layout */}
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/pdfs" element={<PdfsPage />} />
              <Route path="/web-pages" element={<WebPagesPage />} />
              <Route path="/images/upload" element={<ImageUploadPage />} />
              <Route path="/images" element={<ImagesPage />} />
              <Route path="/company" element={<CompanyPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat-suggestions" element={<ChatSuggestionsPage />} />
              <Route path="/chat-history" element={<ChatHistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile-completion" element={<ProfileCompletionPage />} />
              <Route path="/embed" element={<EmbedPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
