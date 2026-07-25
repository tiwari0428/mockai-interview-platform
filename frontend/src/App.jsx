import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const StartInterviewPage = lazy(() => import("./pages/StartInterviewPage.jsx"));
const InterviewRoomPage = lazy(() => import("./pages/InterviewRoomPage.jsx"));
const ResumePage = lazy(() => import("./pages/ResumePage.jsx"));
const ReportPage = lazy(() => import("./pages/ReportPage.jsx"));
const SessionsPage = lazy(() => import("./pages/SessionsPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

const RouteFallback = () => (
  <div className="shell py-24">
    <div className="panel flex min-h-60 items-center justify-center text-slate-300">
      Loading page...
    </div>
  </div>
);

const App = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/start-interview"
          element={
            <ProtectedRoute>
              <StartInterviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview-room"
          element={
            <ProtectedRoute>
              <InterviewRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Suspense>
);

export default App;
