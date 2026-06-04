import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import NaukriLandingPage from "./pages/candidates/NaukriLandingPage";
import EmployerLandingPage from "./pages/candidates/EmployerLandingPage";
import JobListingPage from "./pages/candidates/JobListingPage";
import JobDetailsPage from "./pages/candidates/JobDetailsPage";
import Buyonline from "./pages/employer/Buyonline";
import ProfileDashboard from "./pages/candidates/ProfileDashboard";
import CompaniesPage from "./pages/candidates/CompaniesPage";
import Jobprofile from "./pages/candidates/Jobprofile";
import ExpertAssist from "./pages/employer/Artist";
import Services from "./pages/candidates/Services";
import MavenPro from "./pages/candidates/MavenPro";
import Premium from "./pages/candidates/Premium";
import Info from "./pages/candidates/Info";
import Blogs from "./pages/candidates/Blogs";
import BlogAIRex from "./pages/candidates/Blogsx";
import DailyQuiz from "./pages/candidates/DailyQuiz";
import SavedJobs from "./pages/candidates/SavedJobs";
import Leave from "./pages/candidates/Leave";
import DailyQuizNotification from "./components/DailyQuizNotification";
import PostJob from "./pages/employer/PostJob";
import EmployerHelp from "./pages/employer/Help";
import Talent from "./pages/employer/Talent";
import Branding from "./pages/employer/Branding";
import JobPosting from "./pages/employer/JobPosting";
import ResumeDatabase from "./pages/employer/ResumeDatabase";
import HiringAutomation from "./pages/employer/HiringAutomation";
import EmployerDashboard from "./pages/employer/Dashboards";
import ReviewSharePage from "./pages/employer/ReviewSharePage";
import Premium3D from "./components/Premium3D";
import { AuthProvider, useAuth } from "./AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import authService from "./services/authService";

function AppContent() {
  const [showQuizPopup, setShowQuizPopup] = useState(false);
  const [quizNotification, setQuizNotification] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const isLoggedIn = user || localStorage.getItem("user");
    const alreadyShown = sessionStorage.getItem("dailyQuizShown");

    if (isLoggedIn && !alreadyShown) {
      let cancelled = false;
      const timer = setTimeout(async () => {
        try {
          const quiz = await authService.getQuizNotification();
          if (!cancelled && quiz?.isAvailable) {
            setQuizNotification(quiz);
            setShowQuizPopup(true);
            sessionStorage.setItem("dailyQuizShown", "true");
          }
        } catch {
          if (!cancelled) {
            setQuizNotification(null);
          }
        }
      }, 1500);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [user]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<NaukriLandingPage />} />
        <Route path="/employer-login" element={<EmployerLandingPage />} />
        <Route path="/jobs" element={<JobListingPage />} />
        <Route path="/job/:id" element={<JobDetailsPage />} />
        <Route path="/buy-online" element={<Buyonline />} />
        <Route path="/profile" element={<ProfileDashboard />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/company/:id" element={<Jobprofile />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pro" element={<MavenPro />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/expert-assist" element={<ExpertAssist />} />
        <Route path="/info" element={<Info />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blog-article" element={<BlogAIRex />} />
        <Route path="/daily-quiz" element={<DailyQuiz />} />
        <Route path="/saved-jobs" element={<SavedJobs />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/employer-help" element={<EmployerHelp />} />
        <Route path="/talent-pulse" element={<Talent />} />
        <Route path="/branding" element={<Branding />} />
        <Route path="/job-posting" element={<JobPosting />} />
        <Route path="/resume-database" element={<ResumeDatabase />} />
        <Route path="/hiring-automation" element={<HiringAutomation />} />
        <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        <Route path="/review/:reviewId" element={<ReviewSharePage />} />
      </Routes>

      <DailyQuizNotification
        isOpen={showQuizPopup}
        duration={20}
        onClose={() => setShowQuizPopup(false)}
        onTakeQuiz={() => navigate("/daily-quiz")}
        quizTitle={quizNotification?.title || "Your Daily Quiz is Ready!"}
        quizSubtitle={quizNotification?.subtitle || "Sharpen your skills with today's challenge."}
        questionCount={quizNotification?.questionCount || 5}
        xpReward={quizNotification?.xpReward || 50}
        quizDurationSeconds={quizNotification?.durationSeconds || 60}
      />
      {location.pathname !== "/blog-article" && <Premium3D />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
