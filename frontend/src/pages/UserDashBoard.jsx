import { useParams, useNavigate, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import SAPAnalyticsDashboard from "../components/elements/SAPAnalyticsDashboard";
import { FaWallet } from "react-icons/fa";
import { ArtisanPlanModal } from "../components/elements/ArtisanPlanModal";
import { useTranslation } from "react-i18next";
import { useScrollToTop } from "../hooks/useScrollToTop";
import { useAuth } from "../contexts/AuthContext";

// Seller Earnings Component
const SellerEarningsSection = ({ userId }) => {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/user/earnings/${userId}`);

      // Ensure numbers are properly formatted
      const formattedEarnings = {
        ...response.data,
        totalEarnings: Number(response.data.totalEarnings || 0),
        currentBalance: Number(response.data.currentBalance || 0),
        freePostingRemaining: Math.max(0, 1000 - Number(response.data.totalEarnings || 0))
      };

      setEarnings(formattedEarnings);
    } catch (error) {
      console.error('Failed to fetch seller earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchEarnings();
    }
  }, [userId]);

  // Auto-refresh every 30 seconds to catch updates
  useEffect(() => {
    if (userId) {
      const interval = setInterval(fetchEarnings, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="border-t-2 border-green-100 pt-12">
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border border-green-200">
          <div className="animate-pulse">
            <div className="h-8 bg-green-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-green-200 rounded w-full"></div>
              <div className="h-4 bg-green-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!earnings) {
    return null;
  }

  return (
    <div className="border-t-2 border-green-100 pt-12">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
          💰 Seller Business Model
        </h3>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? '↻' : '🔄'} Refresh
        </button>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border border-green-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="text-lg font-bold text-gray-700 mb-2">Total Earnings</h4>
            <p className="text-3xl font-bold text-green-600">
              ₹{(earnings.totalEarnings || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="text-lg font-bold text-gray-700 mb-2">Current Balance</h4>
            <p className="text-3xl font-bold text-blue-600">
              ₹{(earnings.currentBalance || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="text-lg font-bold text-gray-700 mb-2">Commission Rate</h4>
            <p className="text-3xl font-bold text-purple-600">
              {earnings.isCommissionActive ? '10%' : '0%'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h4 className="text-lg font-bold text-gray-700 mb-2">Status</h4>
            <p className={`text-lg font-bold ${earnings.isCommissionActive ? 'text-orange-600' : 'text-green-600'}`}>
              {earnings.isCommissionActive ? 'Commission Active' : 'Free Posting'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {!earnings.isCommissionActive && (
            <div className="bg-green-100 border border-green-300 rounded-xl p-6">
              <h5 className="font-bold text-green-800 text-xl mb-2">🎉 Free Posting Active!</h5>
              <p className="text-green-700 text-lg">
                You can post unlimited crafts for free until you earn ₹1,000 through our platform.
              </p>
              <p className="text-green-600 font-semibold mt-2">
                Remaining: ₹{earnings.freePostingRemaining.toLocaleString()} to reach commission threshold
              </p>
            </div>
          )}

          {earnings.isCommissionActive && (
            <div className="bg-orange-100 border border-orange-300 rounded-xl p-6">
              <h5 className="font-bold text-orange-800 text-xl mb-2">📊 Commission Model Active</h5>
              <p className="text-orange-700 text-lg mb-2">
                Since you've earned over ₹1,000, a 10% commission applies to all future sales.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">You Receive</p>
                  <p className="text-2xl font-bold text-green-600">90%</p>
                  <p className="text-xs text-gray-500">of product price</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">Platform Fee</p>
                  <p className="text-2xl font-bold text-orange-600">10%</p>
                  <p className="text-xs text-gray-500">commission on sales</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-100 border border-blue-300 rounded-xl p-6">
            <h5 className="font-bold text-blue-800 text-xl mb-2">ℹ️ How It Works</h5>
            <ul className="text-blue-700 space-y-2">
              <li>• Post unlimited crafts for free until ₹1,000 total earnings</li>
              <li>• After ₹1,000, 10% commission applies only when products are sold</li>
              <li>• Buyers pay product price + ₹40 platform fee (transparent pricing)</li>
              <li>• Your revenue: {earnings.isCommissionActive ? '90%' : '100%'} of product price goes to your wallet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UserDashBoard = () => {
  const { t } = useTranslation();
  const { user: authUser, isSignedIn, isLoaded, signOut } = useAuth();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { id } = useParams();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [userProducts, setUserProducts] = useState([]);
  const [userResaleListings, setUserResaleListings] = useState([]);
  const [auctionRequests, setAuctionRequests] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showArtisanPlanModal, setShowArtisanPlanModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingResaleListing, setEditingResaleListing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editResaleForm, setEditResaleForm] = useState({});
  const navigate = useNavigate();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  // Add these new state variables for video modals
  const [showSellVideo, setShowSellVideo] = useState(false);
  const [showResaleVideo, setShowResaleVideo] = useState(false);
  const [showAuctionVideo, setShowAuctionVideo] = useState(false);

  // Simplified useEffect for redirection
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/login');
    }
  }, [isLoaded, isSignedIn, navigate]);

  useScrollToTop();

  useEffect(() => {
    if (isSignedIn && isInitialLoad) {
      setIsInitialLoad(false);
      // You could add any initial data fetching here
    }
  }, [isSignedIn, isInitialLoad]);

  // Enhanced user data fetching
  useEffect(() => {
    if (!isSignedIn || !id) return;

    const fetchUserData = async () => {
      try {
        setLoadingUser(true);
        const userRes = await axios.get(`http://localhost:5000/api/user/${id}`);

        // Verify the fetched user matches the authenticated user
        if (userRes.data._id !== authUser?._id) {
          signOut();
          return;
        }

        setUser(userRes.data);

        // Fetch user's resale listings
        try {
          const token = localStorage.getItem('authToken');

          if (!token) {
            setUserResaleListings([]);
            return;
          }

          const resaleRes = await axios.get(`http://localhost:5000/api/resale/user/listings`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          setUserResaleListings(resaleRes.data.data || resaleRes.data);
        } catch (error) {
          console.error('Failed to fetch resale listings:', error.response?.data || error.message);

          // If the protected route fails, try to fetch all listings and filter by user
          try {
            const allListingsRes = await axios.get('http://localhost:5000/api/resale');
            const userListings = allListingsRes.data.data?.filter(listing =>
              listing.seller?._id === userRes.data._id || listing.seller === userRes.data._id
            ) || [];
            setUserResaleListings(userListings);
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            setUserResaleListings([]);
          }
        }

        if (userRes.data.isArtisan) {
          try {
            const productsRes = await axios.get("http://localhost:5000/api/shopcards");
            console.log('All products from API:', productsRes.data);
            console.log('Current user ID:', userRes.data._id);
            console.log('Current user name:', userRes.data.userName);

            const userProducts = productsRes.data.filter(product => {
              console.log('Checking product:', {
                productName: product.productName,
                sellerId: product.sellerId,
                productSellerName: product.productSellerName,
                sellerIdType: typeof product.sellerId,
                userIdType: typeof userRes.data._id
              });

              // Primary check: sellerId (most reliable after our fix)
              const matchesSellerId = product.sellerId &&
                (product.sellerId === userRes.data._id ||
                  product.sellerId.toString() === userRes.data._id.toString());

              // Fallback check: seller name (for any remaining edge cases)
              const matchesSellerName = product.productSellerName === userRes.data.userName;

              const isMatch = matchesSellerId || matchesSellerName;
              console.log('Match result:', isMatch, {
                matchesSellerId,
                matchesSellerName
              });

              return isMatch;
            });

            console.log('Filtered user products:', userProducts);
            setUserProducts(userProducts);
            if (userProducts.length > 0) {
              setSelectedProduct(userProducts[0]);
            }
          } catch (error) {
            console.error('Failed to fetch user products:', error);
            setUserProducts([]);
          }

          try {
            const auctionReqRes = await axios.get(`http://localhost:5000/api/auction-requests/user/${userRes.data._id}`);
            setAuctionRequests(auctionReqRes.data.data || auctionReqRes.data);
          } catch (err) {
            console.error("Failed to fetch auction requests", err);
            setAuctionRequests([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        if (error.response?.status === 401 || error.response?.status === 404) {
          signOut();
        }
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [id, isSignedIn, authUser, signOut]);

  if (isInitialLoad) {
    return null; // Shows nothing during initial load
  }

  // If you still need to show something while loading user data
  if (loadingUser) {
    return null; // Or a very minimal loader if absolutely necessary
  }

  const handleLogout = () => {
    signOut();
    // Navigation is now handled by signOut function
  };

  const handleArtisanStatus = (status) => {
    axios
      .patch(`http://localhost:5000/api/user/${id}/artisan`, {
        isArtisan: status,
      })
      .then((res) => setUser(res.data))
      .catch(() => alert("Failed to update status"));
  };

  const handleProtectedRedirect = (path) => {
    if (user?.isArtisan) {
      navigate(path);
    } else {
      setShowModal(true);
    }
  };

  // Product editing handlers
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditForm({
      productName: product.productName || "",
      productPrice: product.productPrice || 0,
      productDescription: product.productDescription || "",
      productMaterial: product.productMaterial || "",
      productWeight: product.productWeight || 0.1,
      productColor: product.productColor || "",
      productCategory: product.productCategory || "",
      productState: product.productState || "",
      isCodAvailable: product.isCodAvailable || false,
    });
    setUpdateMessage("");
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateMessage("");

    try {
      const response = await axios.patch(
        `http://localhost:5000/api/shopcards/${editingProduct._id}`,
        editForm
      );

      setUserProducts((prev) =>
        prev.map((product) =>
          product._id === editingProduct._id ? response.data : product
        )
      );

      setUpdateMessage("Product updated successfully!");
      setTimeout(() => {
        setEditingProduct(null);
        setUpdateMessage("");
      }, 2000);
    } catch (error) {
      console.error("Update error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      let errorMessage = "Failed to update product. Please try again.";

      if (error.response?.status === 404) {
        errorMessage = "Product not found. It may have been deleted.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || "Invalid product data provided.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUpdateMessage(`Failed to update: ${errorMessage}`);
    }
    setUpdateLoading(false);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(`http://localhost:5000/api/shopcards/${productId}`);
        setUserProducts((prev) =>
          prev.filter((product) => product._id !== productId)
        );
        setUpdateMessage("Product deleted successfully!");
        setTimeout(() => setUpdateMessage(""), 3000);
      } catch (error) {
        setUpdateMessage("Failed to delete product. Please try again.");
      }
    }
  };

  // Resale listing handlers
  const handleEditResaleListing = (listing) => {
    setEditingResaleListing(listing);
    setEditResaleForm({
      productName: listing.productName,
      category: listing.category,
      description: listing.description,
      originalPrice: listing.originalPrice,
      condition: listing.condition,
      material: listing.material || '',
      weight: listing.weight || '',
      color: listing.color || ''
    });
  };

  const handleEditResaleFormChange = (e) => {
    const { name, value } = e.target;
    setEditResaleForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateResaleListing = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `http://localhost:5000/api/resale/${editingResaleListing._id}`,
        editResaleForm,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update the local state with the updated listing
        setUserResaleListings(prev =>
          prev.map(listing =>
            listing._id === editingResaleListing._id
              ? { ...listing, ...editResaleForm }
              : listing
          )
        );
        setEditingResaleListing(null);
        setUpdateMessage("Resale listing updated successfully!");
        setTimeout(() => setUpdateMessage(""), 3000);
      }
    } catch (error) {
      console.error('Update resale listing error:', error);
      setUpdateMessage("Failed to update resale listing. Please try again.");
      setTimeout(() => setUpdateMessage(""), 3000);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteResaleListing = async (listingId) => {
    if (window.confirm("Are you sure you want to delete this resale listing?")) {
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`http://localhost:5000/api/resale/${listingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setUserResaleListings((prev) =>
          prev.filter((listing) => listing._id !== listingId)
        );
        setUpdateMessage("Resale listing deleted successfully!");
        setTimeout(() => setUpdateMessage(""), 3000);
      } catch (error) {
        console.error('Delete resale listing error:', error);
        setUpdateMessage("Failed to delete resale listing. Please try again.");
        setTimeout(() => setUpdateMessage(""), 3000);
      }
    }
  };

  return (
    <>
      <section className="min-h-screen font-mhlk" style={{ background: 'linear-gradient(to bottom right, #f0f9ff, #ecfdf5, #f7fee7)' }}>
        <div className="w-full h-[10vh]"></div>

        {/* User Header */}
        <div className="text-white py-16 relative" style={{ background: 'linear-gradient(to right, #479626, #3d7a20)' }}>
          {/* Wallet Button */}
          <div
            className={`absolute top-6 right-6 ${user.isArtisan || user.isAdmin ? "block" : "hidden"
              }`}
          >
            <NavLink to={`/wallet/${user._id}`}>
              <button className="w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl border-2 border-white" style={{ backgroundColor: '#ffaf27' }}>
                <FaWallet size={20} className="text-white lg:w-6 lg:h-6" />
              </button>
            </NavLink>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="size-40 lg:size-48 rounded-full bg-white/20 overflow-hidden border-4 border-white/30 shadow-2xl">
                <img
                  src={user.imageUrl}
                  alt={user.userName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center md:text-left space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 leading-tight">
                  {t("dashboard.welcome")}, {user.userName}!
                </h1>
                <p className="text-xl sm:text-2xl lg:text-3xl mb-4" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {user.email}
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {t("dashboard.dateJoined")}:{" "}
                  {user.joiningDate &&
                    new Date(user.joiningDate).toLocaleDateString("en-GB")}
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <span
                    className={`px-6 py-3 rounded-2xl text-lg sm:text-xl font-semibold shadow-lg ${user.isArtisan
                      ? "text-white"
                      : "text-white"
                      }`}
                    style={{ backgroundColor: user.isArtisan ? '#ffaf27' : '#6b7280' }}
                  >
                    {user.isArtisan ? "✓ Verified Artisan" : "Regular User"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl border-b border-green-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                {
                  id: "profile",
                  label: t("dashboard.profile") || "Profile",
                  icon: "👤",
                },
                {
                  id: "products",
                  label: t("dashboard.myProducts") || "My Products",
                  icon: "🛍️",
                  artisanOnly: true,
                },
                {
                  id: "resale-listings",
                  label: "My Resale Listings",
                  icon: "♻️",
                },
                {
                  id: "manage-products",
                  label: t("dashboard.manageProducts") || "Manage Products",
                  icon: "✏️",
                  artisanOnly: true,
                },
                {
                  id: "analytics",
                  label: "SAP Analytics",
                  icon: "📊",
                  artisanOnly: true,
                },
                {
                  id: "actions",
                  label: t("dashboard.quickActions") || "Quick Actions",
                  icon: "⚡",
                },
                {
                  id: "request-status",
                  label: "Request Status",
                  icon: "📝",
                },
              ].map(
                (tab) =>
                  (!tab.artisanOnly || user.isArtisan) && (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-6 px-4 border-b-4 font-bold text-lg sm:text-xl transition-all duration-300 ${activeTab === tab.id
                        ? "text-white"
                        : "border-transparent text-gray-500 hover:bg-gray-50"
                        }`}
                      style={activeTab === tab.id ? { borderColor: '#479626', backgroundColor: '#479626' } : { borderColor: 'transparent' }}
                    >
                      <span className="mr-3 text-xl">{tab.icon}</span>
                      {tab.label}
                    </button>
                  )
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Seller Tutorials Section - NEW ADDITION */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-green-100">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
                Seller Tutorials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* How to Sell Button */}
                <button
                  onClick={() => setShowSellVideo(true)}
                  className="bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200 border-2 border-green-200 rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  <div className="text-4xl mb-4">🛍️</div>
                  <h3 className="text-lg font-bold mb-2">How to sell on Heartisans</h3>
                  <p className="text-sm text-gray-600">Learn the selling process</p>
                </button>

                {/* How to Start Resale Button */}
                <button
                  onClick={() => setShowResaleVideo(true)}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  <div className="text-4xl mb-4">♻️</div>
                  <h3 className="text-lg font-bold mb-2">How to start Resale</h3>
                  <p className="text-sm text-gray-600">Reselling guide for artisans</p>
                </button>

                {/* How to Initiate Auction Button */}
                <button
                  onClick={() => setShowAuctionVideo(true)}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 rounded-2xl p-6 text-center transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  <div className="text-4xl mb-4">🏺</div>
                  <h3 className="text-lg font-bold mb-2">How to initiate auction</h3>
                  <p className="text-sm text-gray-600">Auction setup tutorial</p>
                </button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl shadow-xl p-12" style={{ border: '1px solid #479626' }}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-12 text-gray-900">
                {t("dashboard.profileSettings") || "Profile Settings"}
              </h2>
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-gray-700 font-bold text-xl sm:text-2xl lg:text-3xl mb-4">
                      {t("dashboard.username") || "Username"}
                    </label>
                    <input
                      type="text"
                      value={user.userName}
                      disabled
                      className="w-full p-6 border-2 rounded-2xl bg-gray-50 text-lg sm:text-xl lg:text-2xl"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold text-xl sm:text-2xl lg:text-3xl mb-4">
                      {t("dashboard.email") || "Email"}
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full p-6 border-2 rounded-2xl bg-gray-50 text-lg sm:text-xl lg:text-2xl"
                    />
                  </div>
                </div>

                <div className="border-t-2 border-green-100 pt-12">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 text-gray-900">
                    {t("dashboard.artisanStatus") || "Artisan Status"}
                  </h3>
                  <div className="flex gap-6">
                    <button
                      className={`px-8 py-4 rounded-2xl font-bold text-xl sm:text-2xl transition-all duration-300 transform hover:scale-105 shadow-xl ${user.isArtisan
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl"
                        }`}
                      disabled={user.isArtisan}
                      onClick={() => handleArtisanStatus(true)}
                    >
                      {user.isArtisan
                        ? "✓ Artisan Verified"
                        : t("dashboard.applyArtisan")}
                    </button>
                    {user.isArtisan && (
                      <button
                        className="px-8 py-4 rounded-2xl font-bold text-xl sm:text-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl cursor-pointer"
                        onClick={() => handleArtisanStatus(false)}
                      >
                        {t("dashboard.revoke")}
                      </button>
                    )}
                  </div>
                  {user.isArtisan && (
                    <div className="mt-8 p-8 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border border-green-200">
                      <p className="text-green-800 text-lg sm:text-xl lg:text-2xl leading-relaxed">
                        🎉{" "}
                        {t("dashboard.congratulations") ||
                          "Congratulations! You have access to advanced features including product analytics, seller tools, and SAP business intelligence."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Seller Earnings Section */}
                {user.isArtisan && (
                  <SellerEarningsSection userId={user._id} />
                )}

                {/* Quick Action Buttons in Profile */}
                <div className="border-t-2 border-green-100 pt-12">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 text-gray-900">
                    {t("dashboard.quickActions") || "Quick Actions"}
                  </h3>
                  <div className="flex gap-6 flex-wrap">
                    <button
                      className="px-8 py-4 rounded-2xl font-bold text-xl sm:text-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl cursor-pointer"
                      onClick={() => handleProtectedRedirect("/auctionform")}
                    >
                      {t("dashboard.startAuction")}
                    </button>
                    <button
                      className="px-8 py-4 rounded-2xl font-bold text-xl sm:text-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl cursor-pointer"
                      onClick={() => handleProtectedRedirect("/sellform")}
                    >
                      {t("dashboard.sellOnHeartisans")}
                    </button>
                    <button
                      className="px-8 py-4 rounded-2xl font-bold text-xl sm:text-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl cursor-pointer"
                      onClick={() => navigate(user.isArtisan ? `/dashboard/seller/${user._id}` : `/dashboard/buyer/${user._id}`)}
                    >
                      {user.isArtisan ? "Seller Dashboard" : "Buyer Dashboard"}
                    </button>
                    <button
                      className={`px-8 py-4 rounded-2xl font-bold text-xl sm:text-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl ${!user.isArtisan
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : user.hasArtisanSubscription
                          ? "bg-green-500 text-white cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white cursor-pointer"
                        }`}
                      disabled={!user.isArtisan || user.hasArtisanSubscription}
                      onClick={() =>
                        user.isArtisan &&
                        !user.hasArtisanSubscription &&
                        setShowArtisanPlanModal(true)
                      }
                      title={
                        !user.isArtisan
                          ? t("dashboard.becomeArtisan")
                          : user.hasArtisanSubscription
                            ? t("dashboard.subscribed")
                            : t("dashboard.artisanPlan")
                      }
                    >
                      {user.hasArtisanSubscription
                        ? t("dashboard.subscribed")
                        : "Artisanship Plan"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Products Tab */}
          {activeTab === "products" && user.isArtisan && (
            <div className="bg-white rounded-2xl shadow-xl p-12 border border-green-100">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-12 text-gray-900">
                {t("dashboard.myProducts") || "My Products"}
              </h2>
              {userProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {userProducts.map((product) => (
                    <div
                      key={product._id}
                      className="border-2 border-green-100 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50"
                    >
                      <img
                        src={product.productImageUrl}
                        alt={product.productName}
                        className="w-full h-48 object-cover rounded-2xl mb-6 shadow-lg"
                      />
                      <h3 className="font-bold text-xl sm:text-2xl lg:text-3xl mb-4 text-gray-900 leading-tight">
                        {product.productName}
                      </h3>
                      <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-4">
                        {product.productCategory}
                      </p>
                      <p className="text-green-600 font-bold text-2xl sm:text-3xl lg:text-4xl mb-6">
                        ₹{product.productPrice.toLocaleString()}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setActiveTab("analytics");
                        }}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                      >
                        {t("dashboard.viewAnalytics") || "View Analytics"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border border-green-200">
                  <div className="text-6xl mb-8">📦</div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-600 mb-6">
                    {t("dashboard.noProducts") || "No Products Yet"}
                  </h3>
                  <p className="text-gray-500 text-xl sm:text-2xl lg:text-3xl mb-12 max-w-2xl mx-auto leading-relaxed">
                    {t("dashboard.startSelling") ||
                      "Start selling your handcrafted items to see them here"}
                  </p>
                  <button
                    onClick={() => handleProtectedRedirect("/sellform")}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 rounded-2xl font-bold text-xl sm:text-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                  >
                    {t("dashboard.addFirstProduct") || "Add Your First Product"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resale Listings Tab */}
          {activeTab === "resale-listings" && (
            <div className="bg-white rounded-2xl shadow-xl p-12 border border-green-100">
              <div className="mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 text-gray-900">
                  My Resale Listings
                </h2>
                <p className="text-gray-600 text-xl sm:text-2xl lg:text-3xl">
                  View and manage your pre-owned items listed for resale
                </p>
              </div>

              {updateMessage && (
                <div
                  className={`mb-8 p-6 rounded-xl border-2 ${updateMessage.includes("success")
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                    }`}
                >
                  <p className="text-lg font-semibold">{updateMessage}</p>
                </div>
              )}

              <div className="flex gap-6 mb-8">
                <button
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                  onClick={() => navigate("/resale")}
                >
                  + Create New Listing
                </button>
                <button
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                  onClick={() => navigate("/resale-listings")}
                >
                  Browse All Listings
                </button>
              </div>

              {editingResaleListing ? (
                // Edit Resale Listing Form
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border border-green-200">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      Edit Resale Listing: {editingResaleListing.productName}
                    </h3>
                    <button
                      onClick={() => setEditingResaleListing(null)}
                      className="text-gray-500 hover:text-gray-700 text-3xl font-bold transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleUpdateResaleListing} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Product Name
                        </label>
                        <input
                          type="text"
                          name="productName"
                          value={editResaleForm.productName}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Category
                        </label>
                        <select
                          name="category"
                          value={editResaleForm.category}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="Art">Art</option>
                          <option value="Pottery">Pottery</option>
                          <option value="Fashion">Fashion</option>
                          <option value="Crafts">Crafts</option>
                          <option value="Crochet">Crochet</option>
                          <option value="Accessories">Accessories</option>
                          <option value="Jewelry">Jewelry</option>
                          <option value="Textiles">Textiles</option>
                          <option value="Woodwork">Woodwork</option>
                          <option value="Metalwork">Metalwork</option>
                          <option value="Paintings">Paintings</option>
                          <option value="Sculptures">Sculptures</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Original Price (₹)
                        </label>
                        <input
                          type="number"
                          name="originalPrice"
                          value={editResaleForm.originalPrice}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Condition
                        </label>
                        <select
                          name="condition"
                          value={editResaleForm.condition}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        >
                          <option value="">Select Condition</option>
                          <option value="with-tag">With Tag - Just Like New</option>
                          <option value="without-tag">Without Tag - Good to Fair</option>
                          <option value="lesser-quality">Lesser Quality</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Material
                        </label>
                        <input
                          type="text"
                          name="material"
                          value={editResaleForm.material}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          placeholder="e.g., Wood, Clay, Cotton"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Weight (grams)
                        </label>
                        <input
                          type="number"
                          name="weight"
                          value={editResaleForm.weight}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          placeholder="Weight in grams"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Color
                        </label>
                        <input
                          type="text"
                          name="color"
                          value={editResaleForm.color}
                          onChange={handleEditResaleFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          placeholder="e.g., Brown, Blue, Multicolor"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold text-lg mb-3">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={editResaleForm.description}
                        onChange={handleEditResaleFormChange}
                        rows="4"
                        className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg resize-none"
                        placeholder="Describe the condition and details of your item"
                      ></textarea>
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button
                        type="submit"
                        disabled={updateLoading}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:transform-none disabled:shadow-lg"
                      >
                        {updateLoading ? "Updating..." : "Update Listing"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingResaleListing(null)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Resale Listings List
                <div>
                  {userResaleListings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {userResaleListings.map((listing) => (
                        <div
                          key={listing._id}
                          className="border-2 border-green-100 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50"
                        >
                          {listing.images && listing.images.length > 0 && (
                            <img
                              src={listing.images[0].url}
                              alt={listing.productName}
                              className="w-full h-48 object-cover rounded-xl mb-4 shadow-lg"
                            />
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${listing.condition === 'with-tag' ? 'bg-green-100 text-green-800' :
                              listing.condition === 'without-tag' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                              {listing.condition === 'with-tag' ? 'Like New' :
                                listing.condition === 'without-tag' ? 'Good' : 'Fair'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${listing.status === 'available' ? 'bg-blue-100 text-blue-800' :
                              listing.status === 'sold' ? 'bg-gray-100 text-gray-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                              {listing.status}
                            </span>
                          </div>
                          <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight">
                            {listing.productName}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {listing.category}
                          </p>
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <p className="text-green-600 font-bold text-2xl">
                                ₹{listing.currentPrice?.toLocaleString()}
                              </p>
                              {listing.originalPrice && (
                                <p className="text-gray-500 text-sm line-through">
                                  ₹{listing.originalPrice.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-blue-600 font-semibold text-sm">
                                {listing.interestedUsers?.length || 0} interested
                              </p>
                              <p className="text-gray-500 text-xs">
                                {new Date(listing.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditResaleListing(listing)}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-1"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteResaleListing(listing._id)}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-1"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border border-green-200">
                      <div className="text-6xl mb-8">♻️</div>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-600 mb-6">
                        No Resale Listings Yet
                      </h3>
                      <p className="text-gray-500 text-xl sm:text-2xl lg:text-3xl mb-12 max-w-2xl mx-auto leading-relaxed">
                        Start listing your pre-owned handcrafted items to give them a new life
                      </p>
                      <button
                        onClick={() => navigate("/resale")}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 rounded-2xl font-bold text-xl sm:text-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                      >
                        Create Your First Listing
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SAP Analytics Tab */}
          {activeTab === "analytics" && user.isArtisan && (
            <div className="space-y-12">
              {userProducts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl p-12 border border-green-100">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-12 text-gray-900">
                    {t("dashboard.selectProduct") ||
                      "Select Product for Analytics"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {userProducts.map((product) => (
                      <div
                        key={product._id}
                        onClick={() => setSelectedProduct(product)}
                        className={`cursor-pointer p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${selectedProduct?._id === product._id
                          ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl"
                          : "border-gray-200 hover:border-green-300 hover:bg-green-50"
                          }`}
                      >
                        <img
                          src={product.productImageUrl}
                          alt={product.productName}
                          className="w-full h-32 object-cover rounded-2xl mb-6 shadow-lg"
                        />
                        <h3 className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900 mb-3 leading-tight">
                          {product.productName}
                        </h3>
                        <p className="text-green-600 font-bold text-xl sm:text-2xl lg:text-3xl">
                          ₹{product.productPrice.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct ? (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-green-100">
                  <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-100 p-12 border-b border-green-200">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4">
                      SAP Analytics: {selectedProduct.productName}
                    </h3>
                    <p className="text-gray-600 text-xl sm:text-2xl lg:text-3xl">
                      {t("dashboard.enterpriseInsights") ||
                        "Get enterprise-grade insights for your product"}
                    </p>
                  </div>
                  <SAPAnalyticsDashboard
                    productData={{
                      name: selectedProduct.productName,
                      category: selectedProduct.productCategory,
                      material: selectedProduct.productMaterial,
                      region: selectedProduct.productState,
                      basePrice: selectedProduct.productPrice,
                      seller: selectedProduct.productSellerName,
                      weight: selectedProduct.productWeight,
                      color: selectedProduct.productColor,
                    }}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl p-16 text-center border border-green-100">
                  <div className="text-6xl mb-8">📊</div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-600 mb-6">
                    {t("dashboard.noProductSelected") || "No Product Selected"}
                  </h3>
                  <p className="text-gray-500 text-xl sm:text-2xl lg:text-3xl leading-relaxed">
                    {t("dashboard.selectProductAbove") ||
                      "Select a product above to view its analytics"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions Tab */}
          {/* Quick Actions Tab */}
          {activeTab === "actions" && (
            <div className="bg-white rounded-2xl shadow-xl p-12 border border-green-100">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-12 text-gray-900">
                {t("dashboard.quickActions") || "Quick Actions"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">🛍️</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    {t("dashboard.sellProducts") || "Sell Products"}
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    {t("dashboard.listHandcrafted") ||
                      "List your handcrafted items on the marketplace"}
                  </p>
                  <button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    onClick={() => handleProtectedRedirect("/sellform")}
                  >
                    {t("dashboard.startSelling") || "Start Selling"}
                  </button>
                </div>

                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">🏺</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    Request for Auction
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    Submit your request for auction
                  </p>
                  <button
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    onClick={() => handleProtectedRedirect("/request-auction")}
                  >
                    Request Auction
                  </button>
                </div>

                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">♻️</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    Resale Marketplace
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    Sell your pre-owned handcrafted items and give them a new life
                  </p>
                  <button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    onClick={() => navigate("/resale")}
                  >
                    List Resale Item
                  </button>
                </div>

                {/* New Dashboard Card */}
                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">📊</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    {user.isArtisan ? "Seller Dashboard" : "Buyer Dashboard"}
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    {user.isArtisan
                      ? "Track sales, orders, and business performance"
                      : "View purchase history and account analytics"}
                  </p>
                  <button
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    onClick={() => {
                      if (user.isArtisan) {
                        navigate(`/dashboard/seller/${user._id}`);
                      } else {
                        navigate(`/dashboard/buyer/${user._id}`);
                      }
                    }}
                  >
                    {"View Dashboard"}
                  </button>
                </div>
                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">🛒</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    {t("dashboard.myCart") || "My Cart"}
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    {t("dashboard.manageCart") || "View and manage your shopping cart efficiently"}
                  </p>
                  <button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    onClick={() => navigate("/cart")}
                  >
                    {t("dashboard.goToCart") || "Go to Cart"}
                  </button>
                </div>

                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">🏪</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    {t("dashboard.browseShop") || "Browse Shop"}
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    {t("dashboard.discoverProducts") ||
                      "Discover Handcrafted Treasures"}
                  </p>
                  <button
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    onClick={() => navigate("/shop")}
                  >
                    {t("dashboard.browseProducts") || "Browse Products"}
                  </button>
                </div>

                <div className="p-8 border-2 border-green-100 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="text-5xl mb-6">🚪</div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-gray-900">
                    {t("dashboard.signOut") || "Sign Out"}
                  </h3>
                  <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-8 leading-relaxed">
                    {t("dashboard.secureLogout") ||
                      "Securely log out of your account"}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-4 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                  >
                    {t("auth.logout") || "Log Out"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manage Products Tab */}
          {activeTab === "manage-products" && user.isArtisan && (
            <div className="bg-white rounded-2xl shadow-xl p-12 border border-green-100">
              <div className="mb-12">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 text-gray-900">
                  {t("dashboard.manageProducts") || "Manage Products"}
                </h2>
                <p className="text-gray-600 text-xl sm:text-2xl lg:text-3xl">
                  {t("dashboard.editDeleteProducts") ||
                    "Edit and manage your listed products"}
                </p>
              </div>

              {updateMessage && (
                <div
                  className={`mb-8 p-6 rounded-xl border-2 ${updateMessage.includes("success")
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                    }`}
                >
                  <p className="text-lg font-semibold">{updateMessage}</p>
                </div>
              )}

              {editingProduct ? (
                // Edit Product Form
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 border border-green-200">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      Edit Product: {editingProduct.productName}
                    </h3>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="text-gray-500 hover:text-gray-700 text-3xl font-bold transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleUpdateProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Product Name
                        </label>
                        <input
                          type="text"
                          name="productName"
                          value={editForm.productName}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          name="productPrice"
                          value={editForm.productPrice}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Category
                        </label>
                        <select
                          name="productCategory"
                          value={editForm.productCategory}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="Art">Art</option>
                          <option value="Pottery">Pottery</option>
                          <option value="Fashion">Fashion</option>
                          <option value="Crafts">Crafts</option>
                          <option value="Crochet">Crochet</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Material
                        </label>
                        <input
                          type="text"
                          name="productMaterial"
                          value={editForm.productMaterial}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          name="productWeight"
                          value={editForm.productWeight}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          step="0.1"
                          min="0.1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          Color
                        </label>
                        <input
                          type="text"
                          name="productColor"
                          value={editForm.productColor}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold text-lg mb-3">
                          State
                        </label>
                        <select
                          name="productState"
                          value={editForm.productState}
                          onChange={handleEditFormChange}
                          className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg"
                          required
                        >
                          <option value="">Select State</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Jharkhand">Jharkhand</option>
                          <option value="Jammu and Kashmir">
                            Jammu and Kashmir
                          </option>
                          <option value="Kerala">Kerala</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="West Bengal">West Bengal</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            name="isCodAvailable"
                            checked={editForm.isCodAvailable}
                            onChange={handleEditFormChange}
                            className="w-5 h-5 text-green-600 border-2 border-green-300 rounded focus:ring-green-500"
                          />
                          <label className="text-gray-700 font-bold text-lg">
                            Cash on Delivery Available
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold text-lg mb-3">
                        Description
                      </label>
                      <textarea
                        name="productDescription"
                        value={editForm.productDescription}
                        onChange={handleEditFormChange}
                        rows="4"
                        className="w-full p-4 border-2 border-green-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-lg resize-none"
                        required
                      ></textarea>
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button
                        type="submit"
                        disabled={updateLoading}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:transform-none disabled:shadow-lg"
                      >
                        {updateLoading ? "Updating..." : "Update Product"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Products List
                <div>
                  {userProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {userProducts.map((product) => (
                        <div
                          key={product._id}
                          className="border-2 border-green-100 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-green-50 to-emerald-50"
                        >
                          <img
                            src={product.productImageUrl}
                            alt={product.productName}
                            className="w-full h-48 object-cover rounded-xl mb-4 shadow-lg"
                          />
                          <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight">
                            {product.productName}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            {product.productCategory}
                          </p>
                          <p className="text-green-600 font-bold text-2xl mb-4">
                            ₹{product.productPrice.toLocaleString()}
                          </p>
                          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                            {product.productDescription}
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border border-green-200">
                      <div className="text-6xl mb-8">📦</div>
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-600 mb-6">
                        No Products Yet
                      </h3>
                      <p className="text-gray-500 text-xl sm:text-2xl lg:text-3xl mb-12 max-w-2xl mx-auto leading-relaxed">
                        Start selling your handcrafted items to manage them here
                      </p>
                      <button
                        onClick={() => handleProtectedRedirect("/sellform")}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 rounded-2xl font-bold text-xl sm:text-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                      >
                        Add Your First Product
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Request Status Tab */}
          {activeTab === "request-status" && (
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <div className="mb-8">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-gray-900">
                  My Auction Requests
                </h3>
                <p className="text-gray-600 text-lg sm:text-xl">
                  Track the status of your offline verification and auction pricing
                </p>
              </div>
              
              {auctionRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {auctionRequests.map((request) => (
                    <div
                      key={request._id}
                      className="border-2 border-purple-100 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-purple-50 to-pink-50"
                    >
                      <img
                        src={request.productImageUrl}
                        alt={request.productName}
                        className="w-full h-48 object-cover rounded-xl mb-4 shadow-lg"
                      />
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-xl text-gray-900 leading-tight">
                          {request.productName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-200 text-green-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                        {request.productDescription}
                      </p>
                      
                      <div className="bg-white rounded-lg p-3 border border-purple-100">
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Verification:</span> {new Date(request.offlineVerificationDate).toLocaleDateString()}
                        </p>
                        {request.status === 'approved' && request.predictedBasePrice && (
                          <p className="text-sm font-bold text-green-600">
                            Base Price: ₹{request.predictedBasePrice.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                  <p className="text-gray-500 text-xl">No auction requests yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-12 rounded-2xl shadow-2xl text-center max-w-lg mx-4 border border-green-200">
            <div className="text-6xl mb-8">🔒</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 text-gray-900">
              {t("dashboard.artisanRequired") || "Artisan Access Required"}
            </h2>
            <p className="text-gray-600 text-lg sm:text-xl lg:text-2xl mb-12 leading-relaxed">
              {t("dashboard.mustBeArtisan") ||
                "You must be a verified artisan to use this feature. Apply for artisan status to unlock advanced tools and analytics."}
            </p>
            <div className="flex gap-6">
              <button
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-6 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                onClick={() => {
                  setShowModal(false);
                  setActiveTab("profile");
                }}
              >
                {t("dashboard.applyArtisan") || "Apply as Artisan"}
              </button>
              <button
                className="flex-1 bg-gray-300 text-gray-700 py-4 px-6 rounded-2xl font-bold text-lg sm:text-xl hover:bg-gray-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                onClick={() => setShowModal(false)}
              >
                {t("common.close") || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ArtisanPlanModal
        isOpen={showArtisanPlanModal}
        onClose={() => setShowArtisanPlanModal(false)}
        user={user}
      />

      {/* Video Modals */}
      {/* How to Sell Video Modal */}
      {showSellVideo && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
          <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 border-2 border-gray-300">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold">How to Sell on Heartisans</h3>
              <button
                onClick={() => setShowSellVideo(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl sm:text-3xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="aspect-w-16 aspect-h-9 w-full">
              <iframe
                width="100%"
                height="400"
                src="https://www.youtube.com/embed/jlp1YQ4w2TA?rel=0&modestbranding=1"
                title="How to Sell on Heartisans"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* How to Start Resale Video Modal */}
      {showResaleVideo && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
          <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 border-2 border-gray-300">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold">How to Start Resale</h3>
              <button
                onClick={() => setShowResaleVideo(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl sm:text-3xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="aspect-w-16 aspect-h-9 w-full">
              <iframe
                width="100%"
                height="400"
                src="https://www.youtube.com/embed/bmiKFeisDOs?rel=0&modestbranding=1"
                title="Tutorial - How to Resale on Heartisans"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* How to Initiate Auction Video Modal */}
      {showAuctionVideo && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
          <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 border-2 border-gray-300">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold">How to Initiate Auction</h3>
              <button
                onClick={() => setShowAuctionVideo(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl sm:text-3xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="aspect-w-16 aspect-h-9 w-full">
              <iframe
                width="100%"
                height="400"
                src="https://www.youtube.com/embed/Z2zzBCY_8gw?rel=0&modestbranding=1"
                title="How to Initiate Auction at Heartisans"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </>
  );
};