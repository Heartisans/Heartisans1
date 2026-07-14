import { useEffect, useState } from "react"
import axios from "axios"
import { useTranslation } from 'react-i18next'
import { FaUsers, FaShoppingBag, FaGavel, FaChartBar, FaEye, FaEdit, FaTrash, FaCrown, FaUserShield, FaTimes, FaComments, FaRobot, FaCheck, FaPlay } from 'react-icons/fa'
import { StoryAdminPanel } from '../components/elements/StoryAdminPanel'
import { AuctionMindModal } from '../components/elements/AuctionMindModal'
import { PublishAuctionModal } from '../components/elements/PublishAuctionModal'
import { useScrollToTop } from "../hooks/useScrollToTop"
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export const AdminPanel = () => {
  const { t } = useTranslation();
  const { user, isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  
  // Data states
  const [users, setUsers] = useState([])
  const [shopCards, setShopCards] = useState([])
  const [auctions, setAuctions] = useState([])
  const [auctionRequests, setAuctionRequests] = useState([])
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [carts, setCarts] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalAuctions: 0,
    totalArtisans: 0,
    totalSubscriptions: 0
  })

  useScrollToTop();

  // Check authentication and admin status
  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn || !user) {
        navigate('/login');
        return;
      }
      
      if (!user.isAdmin) {
        navigate('/'); // Redirect to home if not admin
        return;
      }
      
      setAuthLoading(false);
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  // Fetch all data on component mount
  useEffect(() => {
    if (!authLoading && user?.isAdmin) {
      fetchAllData();
    }
  }, [authLoading, user]);

  // Show loading while checking authentication
  if (authLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaUserShield className="mx-auto h-24 w-24 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [usersRes, shopCardsRes, auctionsRes, auctionReqsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/user"), // We'll need to create this endpoint
        axios.get("http://localhost:5000/api/shopcards"),
        axios.get("http://localhost:5000/api/auctions"),
        axios.get("http://localhost:5000/api/auction-requests")
      ])

      setUsers(usersRes.data || [])
      setShopCards(shopCardsRes.data || [])
      setAuctions(auctionsRes.data || [])
      setAuctionRequests(auctionReqsRes.data.data || auctionReqsRes.data || [])

      // Calculate stats
      const userData = usersRes.data || []
      setStats({
        totalUsers: userData.length,
        totalProducts: shopCardsRes.data?.length || 0,
        totalAuctions: auctionsRes.data?.length || 0,
        totalArtisans: userData.filter(user => user.isArtisan).length,
        totalSubscriptions: userData.filter(user => user.hasArtisanSubscription).length
      })

    } catch (error) {
      console.error('Error fetching admin data:', error)
      // Fallback to individual API calls for existing endpoints
      try {
        const shopCardsRes = await axios.get("http://localhost:5000/api/shopcards")
        setShopCards(shopCardsRes.data || [])
        const auctionsRes = await axios.get("http://localhost:5000/api/auctions")
        setAuctions(auctionsRes.data || [])
        
        setStats(prevStats => ({
          ...prevStats,
          totalProducts: shopCardsRes.data?.length || 0,
          totalAuctions: auctionsRes.data?.length || 0,
        }))
      } catch (fallbackError) {
        console.error('Error in fallback fetch:', fallbackError)
      }
    }
    setLoading(false)
  }

  const tabs = [
    { id: 'overview', name: t('admin.overview'), icon: FaChartBar },
    { id: 'users', name: t('admin.users'), icon: FaUsers },
    { id: 'products', name: t('admin.products'), icon: FaShoppingBag },
    { id: 'auctions', name: t('admin.auctions'), icon: FaGavel },
    { id: 'auction-requests', name: 'Auction Requests', icon: FaGavel },
    { id: 'stories', name: 'Stories', icon: FaComments }
  ]

  // Admin action functions
  const deleteUser = async (userId) => {
    if (window.confirm(t('admin.confirmDeleteUser'))) {
      try {
        await axios.delete(`http://localhost:5000/api/user/${userId}`)
        setUsers(users.filter(user => user._id !== userId))
        // Update stats
        const updatedUsers = users.filter(user => user._id !== userId)
        setStats(prevStats => ({
          ...prevStats,
          totalUsers: updatedUsers.length,
          totalArtisans: updatedUsers.filter(user => user.isArtisan).length,
          totalSubscriptions: updatedUsers.filter(user => user.hasArtisanSubscription).length
        }))
        alert(t('admin.userDeleted'))
      } catch (error) {
        console.error('Error deleting user:', error)
        alert(t('admin.errorDeletingUser'))
      }
    }
  }

  const deleteProduct = async (productId) => {
    if (window.confirm(t('admin.confirmDeleteProduct'))) {
      try {
        await axios.delete(`http://localhost:5000/api/shopcards/${productId}`)
        setShopCards(shopCards.filter(product => product._id !== productId))
        setStats(prevStats => ({
          ...prevStats,
          totalProducts: prevStats.totalProducts - 1
        }))
        alert(t('admin.productDeleted'))
      } catch (error) {
        console.error('Error deleting product:', error)
        alert(t('admin.errorDeletingProduct'))
      }
    }
  }

  const deleteAuction = async (auctionId) => {
    if (window.confirm(t('admin.confirmDeleteAuction'))) {
      try {
        await axios.delete(`http://localhost:5000/api/auctions/${auctionId}`)
        setAuctions(auctions.filter(auction => auction._id !== auctionId))
        setStats(prevStats => ({
          ...prevStats,
          totalAuctions: prevStats.totalAuctions - 1
        }))
        alert(t('admin.auctionDeleted'))
      } catch (error) {
        console.error('Error deleting auction:', error)
        alert(t('admin.errorDeletingAuction'))
      }
    }
  }

  const terminateSubscription = async (userId) => {
    if (window.confirm(t('admin.confirmTerminateSubscription'))) {
      try {
        await axios.patch(`http://localhost:5000/api/user/${userId}/subscription`, {
          hasArtisanSubscription: false,
          subscriptionType: null,
          subscriptionDate: null
        })
        // Update local state
        setUsers(users.map(user => 
          user._id === userId 
            ? { ...user, hasArtisanSubscription: false, subscriptionType: null, subscriptionDate: null }
            : user
        ))
        setStats(prevStats => ({
          ...prevStats,
          totalSubscriptions: prevStats.totalSubscriptions - 1
        }))
        alert(t('admin.subscriptionTerminated'))
      } catch (error) {
        console.error('Error terminating subscription:', error)
        alert(t('admin.errorTerminatingSubscription'))
      }
    }
  }

  const filteredData = (data, searchFields) => {
    return data
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  // Overview Component
  const OverviewTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="bg-blue-50 p-8 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-lg font-semibold">{t('admin.totalUsers')}</p>
              <p className="text-4xl font-bold text-blue-900 mt-2">{stats.totalUsers}</p>
            </div>
            <FaUsers className="text-blue-500 text-3xl" />
          </div>
        </div>
        
        <div className="bg-green-50 p-8 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-lg font-semibold">{t('admin.totalProducts')}</p>
              <p className="text-4xl font-bold text-green-900 mt-2">{stats.totalProducts}</p>
            </div>
            <FaShoppingBag className="text-green-500 text-3xl" />
          </div>
        </div>
        
        <div className="bg-purple-50 p-8 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-lg font-semibold">{t('admin.totalAuctions')}</p>
              <p className="text-4xl font-bold text-purple-900 mt-2">{stats.totalAuctions}</p>
            </div>
            <FaGavel className="text-purple-500 text-3xl" />
          </div>
        </div>
        
        <div className="bg-orange-50 p-8 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-lg font-semibold">{t('admin.totalArtisans')}</p>
              <p className="text-4xl font-bold text-orange-900 mt-2">{stats.totalArtisans}</p>
            </div>
            <FaCrown className="text-orange-500 text-3xl" />
          </div>
        </div>
        
        <div className="bg-rose-50 p-8 rounded-xl border border-rose-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-600 text-lg font-semibold">{t('admin.activeSubscriptions')}</p>
              <p className="text-4xl font-bold text-rose-900 mt-2">{stats.totalSubscriptions}</p>
            </div>
            <FaUserShield className="text-rose-500 text-3xl" />
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg border">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">{t('admin.recentActivity')}</h3>
        <div className="space-y-4">
          {shopCards.slice(0, 5).map((product, index) => (
            <div key={index} className="flex items-center space-x-6 p-6 bg-gray-50 rounded-lg">
              <img src={product.productImageUrl} alt={product.productName} className="w-16 h-16 object-cover rounded-lg" />
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-lg">{product.productName}</p>
                <p className="text-base text-gray-600">{t('admin.addedBy')} {product.productSellerName}</p>
              </div>
              <span className="text-lg font-medium text-gray-500">{formatCurrency(product.productPrice)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Users Tab Component
  const UsersTab = () => {
    const filteredUsers = filteredData(users, ['userName', 'email', 'fullName'])
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-bold text-gray-800">{t('admin.userManagement')}</h3>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.user')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.email')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.role')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.joinDate')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.balance')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.status')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-14 w-14 rounded-full" src={user.imageUrl || '/api/placeholder/40/40'} alt="" />
                        <div className="ml-6">
                          <div className="text-lg font-semibold text-gray-900">{user.fullName || user.userName}</div>
                          <div className="text-base text-gray-500">@{user.userName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">{user.email}</td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {user.isAdmin && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">Admin</span>}
                        {user.isArtisan && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">Artisan</span>}
                        {!user.isAdmin && !user.isArtisan && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">User</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">{formatDate(user.joiningDate)}</td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg font-semibold text-gray-900">{formatCurrency(user.balance)}</td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      {user.hasArtisanSubscription ? (
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            {t('admin.subscribed')} ({user.subscriptionType})
                          </span>
                          <button 
                            onClick={() => terminateSubscription(user._id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                            title={t('admin.terminateSubscription')}
                          >
                            <FaTimes size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                          {t('admin.free')}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg font-medium">
                      <div className="flex space-x-4">
                        <button className="text-blue-600 hover:text-blue-900 p-3 hover:bg-blue-50 rounded-full transition-colors" title={t('admin.view')}>
                          <FaEye size={18} />
                        </button>
                        <button className="text-green-600 hover:text-green-900 p-3 hover:bg-green-50 rounded-full transition-colors" title={t('admin.edit')}>
                          <FaEdit size={18} />
                        </button>
                        <button 
                          onClick={() => deleteUser(user._id)}
                          className="text-red-600 hover:text-red-900 p-3 hover:bg-red-50 rounded-full transition-colors"
                          title={t('admin.delete')}
                        >
                          <FaTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Products Tab Component
  const ProductsTab = () => {
    const filteredProducts = filteredData(shopCards, ['productName', 'productSellerName', 'productCategory', 'productState'])
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-bold text-gray-800">{t('admin.productManagement')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div key={product._id} className="bg-white rounded-xl shadow-lg overflow-hidden border hover:shadow-xl transition-shadow">
              <img 
                src={product.productImageUrl} 
                alt={product.productName}
                className="w-full h-56 object-cover"
              />
              <div className="p-6">
                <h4 className="font-bold text-gray-800 mb-3 text-xl">{product.productName}</h4>
                <p className="text-lg text-gray-600 mb-3">{t('admin.seller')}: {product.productSellerName}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(product.productPrice)}</span>
                  <span className="text-base bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">{product.productCategory}</span>
                </div>
                <p className="text-base text-gray-500 mb-4">{product.productState}</p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => deleteProduct(product._id)}
                    className="w-full bg-red-500 text-white py-3 px-4 rounded-lg text-base font-semibold hover:bg-red-600 transition-colors"
                  >
                    <FaTrash className="inline mr-2" size={16} /> {t('admin.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Auctions Tab Component
  const AuctionsTab = () => {
    const filteredAuctions = filteredData(auctions, ['productName', 'sellerName', 'status'])
    
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-bold text-gray-800">{t('admin.auctionManagement')}</h3>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.product')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.seller')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.basePrice')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.currentBid')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.bids')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.startTime')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.duration')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.status')}</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAuctions.map((auction) => {
                  const currentBid = auction.bids && auction.bids.length > 0 
                    ? Math.max(...auction.bids.map(bid => bid.amount))
                    : auction.basePrice
                  const now = new Date()
                  const auctionEnd = new Date(new Date(auction.startTime).getTime() + auction.duration * 60 * 1000)
                  const isActive = now >= new Date(auction.startTime) && now <= auctionEnd
                  const isEnded = now > auctionEnd
                  
                  return (
                    <tr key={auction._id} className="hover:bg-gray-50">
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center">
                          <img className="h-14 w-14 rounded-lg object-cover" src={auction.productImageUrl} alt="" />
                          <div className="ml-6">
                            <div className="text-lg font-semibold text-gray-900">{auction.productName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">{auction.sellerName}</td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg font-semibold text-gray-900">{formatCurrency(auction.basePrice)}</td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg font-bold text-green-600">{formatCurrency(currentBid)}</td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg font-medium text-gray-900">{auction.bids ? auction.bids.length : 0}</td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">{formatDate(auction.startTime)}</td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">{auction.duration} {t('admin.minutes')}</td>
                      <td className="px-8 py-6 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                            {t('admin.active')}
                          </span>
                        ) : isEnded ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                            {t('admin.ended')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                            {t('admin.scheduled')}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-lg font-medium">
                        <div className="flex space-x-4">
                          <button className="text-blue-600 hover:text-blue-900 p-3 hover:bg-blue-50 rounded-full transition-colors" title={t('admin.view')}>
                            <FaEye size={18} />
                          </button>
                          <button className="text-green-600 hover:text-green-900 p-3 hover:bg-green-50 rounded-full transition-colors" title={t('admin.edit')}>
                            <FaEdit size={18} />
                          </button>
                          <button 
                            onClick={() => deleteAuction(auction._id)}
                            className="text-red-600 hover:text-red-900 p-3 hover:bg-red-50 rounded-full transition-colors"
                            title={t('admin.delete')}
                          >
                            <FaTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Auction Requests Tab Component
  const AuctionRequestsTab = () => {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-bold text-gray-800">Auction Requests Management</h3>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">Artisan</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">Verification Date</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-6 text-left text-base font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auctionRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-14 w-14 rounded-lg object-cover" src={request.productImageUrl} alt="" />
                        <div className="ml-6">
                          <div className="text-lg font-semibold text-gray-900">{request.productName}</div>
                          {request.predictedBasePrice && (
                            <div className="text-sm font-bold text-green-600 mt-1">
                              AI Base Price: ₹{request.predictedBasePrice}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">{request.userName}</td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg text-gray-900">
                      {new Date(request.offlineVerificationDate).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-lg font-medium">
                      {request.status === 'pending' && (
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsAuctionModalOpen(true);
                          }}
                          className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                        >
                          <FaRobot /> Verify & AI Pricing
                        </button>
                      )}
                      {request.status === 'approved' && (
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsPublishModalOpen(true);
                          }}
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold"
                        >
                          <FaPlay /> Start Auction
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {auctionRequests.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-8 py-12 text-center text-gray-500 text-lg">
                      No auction requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Stories Tab Component
  const StoriesTab = () => {
    return (
      <div className="bg-white rounded-lg shadow">
        <StoryAdminPanel />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full h-[10vh]"></div>
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <h1 className="text-4xl font-bold text-gray-900">{t('admin.adminPanel')}</h1>
            <p className="mt-3 text-xl text-gray-600">{t('admin.manageYourPlatform')}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-12 py-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                  }}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="text-lg" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'auctions' && <AuctionsTab />}
        {activeTab === 'auction-requests' && <AuctionRequestsTab />}
        {activeTab === 'stories' && <StoriesTab />}
      </div>
      
      <AuctionMindModal 
        isOpen={isAuctionModalOpen} 
        onClose={() => {
          setIsAuctionModalOpen(false);
          setSelectedRequest(null);
        }} 
        request={selectedRequest}
        onApprove={(requestId, prediction) => {
          // Update the local state to show it's approved and has prediction
          setAuctionRequests(prev => prev.map(r => 
            r._id === requestId 
              ? { ...r, status: 'approved', predictedBasePrice: prediction.base_price, predictedCeilingPrice: prediction.ceiling_price } 
              : r
          ));
        }}
      />

      <PublishAuctionModal
        isOpen={isPublishModalOpen}
        onClose={() => {
          setIsPublishModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onPublish={(newAuction) => {
          setAuctions(prev => [newAuction, ...prev]);
          setAuctionRequests(prev => prev.map(r =>
            r._id === selectedRequest._id ? { ...r, status: 'Live' } : r
          ));
        }}
      />
    </div>
  )
}