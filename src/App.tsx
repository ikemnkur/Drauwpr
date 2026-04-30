import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import DropFeature from './pages/DropFeature';
import DropDownload from './pages/DropDownload';
import DropReview from './pages/DropReview';
import ActiveContributions from './pages/ActiveContributions';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import BuyCredits from './pages/BuyCredits';
import BuyStripe from './pages/BuyStripe';
import BuyCrypto from './pages/BuyCrypto';
import Redeem from './pages/Redeem';
import Help from './pages/Help';
import History from './pages/History';
import UserProfile from './pages/UserProfile';
import CreateDrop from './pages/CreateDrop';
import EditDrop from './pages/EditDrop';
import Explore from './pages/Explore';
import Verification from './pages/Verification';
import Plans from './pages/Plans';
import EditProfile from './pages/EditProfile';
import AdminPortal from './pages/AdminPortal';
import ForgotPassword from './pages/ForgotPasswordPage';
import ResetPassword from './pages/ResetPasswordPage';
import AdsPromo from './pages/AdsPromo';
import Notifications from './pages/Notifications';
import PromoCreateAd from './pages/PromoCreateAd';
import PromoSponsorDrop from './pages/PromoSponsorDrop';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Pre-auth landing */}
            <Route path="/" element={<Landing />} />

            {/* Hidden admin portal — secret route */}
            <Route path="/sys-ctrl-9x" element={<AdminPortal />} />

            {/* Auth pages (redirect away if already logged in) */}
            <Route element={<Layout />}>
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

              {/* Public pages inside layout */}
              <Route path="/explore" element={<Explore />} />
              <Route path="/drop/:id" element={<DropFeature />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/help" element={<Help />} />
              {/* Password recovery + email verification */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/password-reset" element={<ResetPassword />} />
              <Route path="/verify" element={<Verification />} />
              <Route path="/verify-email" element={<Verification />} />


              {/* Protected pages */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/drop/:id/download" element={<ProtectedRoute><DropDownload /></ProtectedRoute>} />
              <Route path="/drop/:id/review" element={<ProtectedRoute><DropReview /></ProtectedRoute>} />
              <Route path="/contributions" element={<ProtectedRoute><ActiveContributions /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
              <Route path="/buy-credits/stripe" element={<ProtectedRoute><BuyStripe /></ProtectedRoute>} />
              <Route path="/buy-credits/crypto" element={<ProtectedRoute><BuyCrypto /></ProtectedRoute>} />
              <Route path="/redeem" element={<ProtectedRoute><Redeem /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/promo" element={<ProtectedRoute><AdsPromo /></ProtectedRoute>} />
              <Route path="/promo/create-ad" element={<ProtectedRoute><PromoCreateAd /></ProtectedRoute>} />
              <Route path="/promo/sponsor-drop" element={<ProtectedRoute><PromoSponsorDrop /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateDrop /></ProtectedRoute>} />
              <Route path="/drop/:id/edit" element={<ProtectedRoute><EditDrop /></ProtectedRoute>} />
              <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
              <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
