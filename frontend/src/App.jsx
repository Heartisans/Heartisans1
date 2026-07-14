import { useEffect } from "react";
import "./App.css";
import { GoogleOAuthProvider } from '@react-oauth/google';
import Lenis from "lenis";
import { createBrowserRouter, RouterProvider, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useState } from "react";
import { Home } from "./pages/Home";
import { Auction } from "./pages/Auction";
import { Shop } from "./pages/Shop";
import { Resale } from "./pages/Resale";
import ResaleListings from './pages/ResaleListings';
import ResaleProductDetails from './pages/ResaleProductDetails';
import { AppLayout } from "./components/layout/AppLayout";
import { ShopDetails } from "./pages/ShopDetails";
import { UserDashBoard } from "./pages/UserDashBoard";
import SellerDashboard from "./pages/Dashboard/SellerDashboard"; // Missing import
import { BuyerDashboard } from "./pages/Dashboard/BuyerDashboard"; // Missing import
import { AdminPanel } from "./pages/AdminPanel";
import { ProductDetails } from "./pages/ProductDetails";
import { Modal } from "./components/elements/Modal";
import { SellForm } from "./pages/SellForm";
import { AuctionRequestForm } from "./pages/AuctionRequestForm";
import { AuctionDetails } from "./pages/AuctionDetails";
import { CartPage } from "./pages/CartPage";
import { CheckoutForm } from "./pages/CheckoutForm";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { SubscriptionSuccess } from "./pages/SubscriptionSuccess";
import { PaymentFailed } from "./pages/PaymentFailed";
import { PaymentPage } from "./pages/PaymentPage";
import { WalletPage } from "./pages/WalletPage";
import OrderDetailsPage from "./pages/OrderDetailsPage"; // Missing import
import ProductDetailPage from "./pages/ProductDetailPage"; // Missing import
import { SAPAnalyticsPage } from "./pages/SAPAnalyticsPage";
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import BackToTop from "./components/elements/BackToTop";
import { StoriesPage } from "./pages/StoriesPage";

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
      <p className="text-xl font-medium text-green-700">
        Verifying your session...
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Please wait while we authenticate you
      </p>
    </div>
  </div>
);

// Auth Redirect Handler Component
const AuthRedirectHandler = () => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [isSignedIn, navigate]);

  return null;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/login', { 
        replace: true, 
        state: { from: location.pathname } 
      });
    }
  }, [isLoaded, isSignedIn, navigate, location]);

  if (!isLoaded) {
    return null; // Render nothing while checking auth state
  }

  return isSignedIn ? children : null;
};

// Route Transition Wrapper Component
const RouteTransitionWrapper = ({ children }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(true);
    return () => setIsActive(false);
  }, []);

  return (
    <div className={`route-transition ${isActive ? 'active' : ''}`}>
      {children}
    </div>
  );
};

export const App = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 2.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      smoothTouch: false,
      wheelMultiplier: 0.7,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }, []);

  const router = createBrowserRouter([
    {
      path: "/",
      element: <AppLayout />,
      // errorElement:<ErrorPage/>,
      children: [
        {
          path: "/",
          element: (
            <RouteTransitionWrapper>
              <Home />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/shop",
          element: (
            <RouteTransitionWrapper>
              <Shop />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/shop/:name",
          element: (
            <RouteTransitionWrapper>
              <ShopDetails />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/shop/:name/:id",
          element: (
            <RouteTransitionWrapper>
              <ProductDetails />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/auction",
          element: (
            <RouteTransitionWrapper>
              <Auction />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/auction/:id",
          element: (
            <RouteTransitionWrapper>
              <AuctionDetails />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/resale",
          element: (
            <RouteTransitionWrapper>
              <Resale />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/resale-listings",
          element: <ResaleListings />,
        },
        {
          path: "/resale-listings/:id",
          element: <ResaleProductDetails />,
        },
        {
          path: "/sellform",
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <SellForm />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/cart",
          element: <CartPage />,
        },
        {
          path: "/request-auction",
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <AuctionRequestForm />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/checkout",
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <CheckoutForm />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/modal",
          element: <Modal />,
        },
        {
          path: "/payment",
          element: (
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          ),
        },
        {
          path: "/payment-success",
          element: (
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          ),
        },
        {
          path: "/subscription-success",
          element: (
            <ProtectedRoute>
              <SubscriptionSuccess />
            </ProtectedRoute>
          ),
        },
        {
          path: "/payment-failure",
          element: (
            <ProtectedRoute>
              <PaymentFailed />
            </ProtectedRoute>
          ),
        },
        {
          path: "/wallet/:id",
          element: (
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          ),
        },
        {
          path: "/admin",
          element: (
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          ),
        },
        {
          path: "/stories",
          element: <StoriesPage />,
        },
        {
          path: "/sap-analytics",
          element: (
            <ProtectedRoute>
              <SAPAnalyticsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: "/login",
          element: (
            <RouteTransitionWrapper>
              <Login />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/signup",
          element: (
            <RouteTransitionWrapper>
              <Signup />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/forgot-password",
          element: (
            <RouteTransitionWrapper>
              <ForgotPassword />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/reset-password/:token",
          element: (
            <RouteTransitionWrapper>
              <ResetPassword />
            </RouteTransitionWrapper>
          ),
        },
        {
          path: "/auth-redirect",
          element: <AuthRedirectHandler />,
        },
        {
          path: "/dashboard",
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <UserDashBoard />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/dashboard/:id",
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <UserDashBoard />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/dashboard/seller/:id", // Missing route
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <SellerDashboard />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/dashboard/buyer/:id", // Missing route
          element: (
            <ProtectedRoute>
              <RouteTransitionWrapper>
                <BuyerDashboard />
              </RouteTransitionWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: "/orders/:id", // Missing route
          element: (
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: "/products/:id", // Missing route
          element: (
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          ),
        },
        // Added new route for the "Buy Now" button's navigation
        {
          path: "/product/:id/buy",
          element: (
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          ),
        },
      ],
    },
  ]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ErrorBoundary>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
};