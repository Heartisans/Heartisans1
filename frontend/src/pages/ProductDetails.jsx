import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUser } from "../contexts/AuthContext";
import axios from "axios";
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import SAPAnalyticsDashboard from "../components/elements/SAPAnalyticsDashboard";
import { useScrollToTop } from "../hooks/useScrollToTop";

export const ProductDetails = () => {
  const { t } = useTranslation();
  const { translateCategory, translateState } = useContentTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const { user } = useUser();
  const [mongoUserId, setMongoUserId] = useState("");
  const [inCart, setInCart] = useState(false);
  const [sellerId, setSellerId] = useState("");

  useScrollToTop();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/shopcards/${id}`)
      .then(res => setCard(res.data))
      .catch(() => setCard(null));
  }, [id]);

  useEffect(() => {
    if (!user?._id) return;
    setMongoUserId(user._id);
  }, [user]);

  useEffect(() => {
    if (!mongoUserId || !card) return;
    axios.get(`http://localhost:5000/api/cart/${mongoUserId}`)
      .then(res => {
        const found = res.data?.items?.some(item => item.productId === card._id);
        setInCart(found);
      })
      .catch(() => setInCart(false));
  }, [mongoUserId, card]);

  // Fetch seller's _id based on seller name
  useEffect(() => {
    if (!card) return;
    
    console.log('=== SELLER ID DEBUG ===');
    console.log('Product card:', card.productName);
    console.log('card.sellerId:', card.sellerId);
    console.log('card.sellerId type:', typeof card.sellerId);
    console.log('card.productSellerName:', card.productSellerName);
    
    // Use sellerId directly from product data (most reliable)
    if (card.sellerId) {
      const sellerIdString = typeof card.sellerId === 'object' ? card.sellerId.toString() : card.sellerId;
      setSellerId(sellerIdString);
      console.log('Using direct sellerId:', sellerIdString);
    } else {
      console.log('sellerId missing, trying fallback...');
      // Fallback: try to look up by seller name if sellerId is missing
      if (card.productSellerName) {
        axios.get(`http://localhost:5000/api/user/username/${card.productSellerName}`)
          .then(res => {
            console.log('Fallback lookup success:', res.data._id);
            setSellerId(res.data._id);
          })
          .catch(() => {
            console.log('Fallback lookup failed');
            setSellerId("Not Available");
          });
      } else {
        setSellerId("Not Available");
      }
    }
  }, [card]);

  const handleAddToCart = async () => {
    if (!mongoUserId || !card) return;
    await axios.post("http://localhost:5000/api/cart/add", {
      userId: mongoUserId,
      productId: card._id,
      productName: card.productName,
      productImageUrl: card.productImageUrl,
      productPrice: card.productPrice,
      productCategory: card.productCategory
    });
    setInCart(true);
  };

  const handleRemoveFromCart = async () => {
    if (!mongoUserId || !card) return;
    await axios.post("http://localhost:5000/api/cart/remove", {
      userId: mongoUserId,
      productId: card._id,
    });
    setInCart(false);
  };

  const handleBuyNow = () => {
    if (!user) {
      alert(t('auth.login'));
      return;
    }
    
    if (mongoUserId === sellerId) {
      alert(t('product.cannotBuyOwn'));
      return;
    }
    
    navigate('/checkout', {
      state: {
        total: card.productPrice,
        sellerId: sellerId,
        sellerName: card.productSellerName,
        productDetails: {
          id: card._id,
          name: card.productName,
          price: card.productPrice,
          image: card.productImageUrl,
          category: card.productCategory
        }
      }
    });
  };

  // Check if current user is the seller
  const isUserSeller = mongoUserId && sellerId && mongoUserId === sellerId;

  if (!card) return (
    <div className="min-h-screen flex items-center justify-center font-mhlk" style={{ background: 'linear-gradient(to bottom right, #e8f5e8, #f0f9f0)' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mx-auto mb-4" style={{ borderColor: '#479626', borderTopColor: 'transparent' }}></div>
        <p className="text-2xl font-semibold" style={{ color: '#479626' }}>{t('common.loading')}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Hero Section */}
      <section className="min-h-screen font-mhlk" style={{ background: 'linear-gradient(to bottom right, #e8f5e8, #f0f9f0)' }}>
        <div className="w-full h-20"></div>
        
        <div className="w-full px-4 sm:px-6 lg:px-8 py-40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Product Image */}
            <div className="w-full">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white p-6">
                <img 
                  src={card.productImageUrl} 
                  alt={card.productName} 
                  className="w-full h-96 lg:h-[600px] object-cover rounded-xl" 
                />
                <div className="absolute top-8 right-8">
                  <span className="text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg" style={{ background: 'linear-gradient(to right, #479626, #3d7a20)' }}>
                    Authentic Craft
                  </span>
                </div>
              </div>
            </div>
            
            {/* Product Information */}
            <div className="w-full">
              <div className="bg-white rounded-2xl shadow-xl p-8" style={{ border: '1px solid #479626' }}>
                <div className="space-y-6">
                  {/* Title and Description */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                      {card.productName}
                    </h1>
                    <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600 mt-4 leading-relaxed whitespace-pre-wrap">
                      {card.productDescription}
                    </p>
                  </div>
                  
                  {/* Price */}
                  <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(to right, #479626, #3d7a20)' }}>
                    <p className="text-sm font-medium opacity-90">Price</p>
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                      ₹{card.productPrice}
                    </h3>
                  </div>
                  
                  {/* Product Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">{t('product.seller')}</p>
                      <p className="text-lg font-semibold text-gray-900">{card.productSellerName}</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">{t('product.material')}</p>
                      <p className="text-lg font-semibold text-gray-900">{card.productMaterial}</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">{t('product.weight')}</p>
                      <p className="text-lg font-semibold text-gray-900">{card.productWeight}g</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-500 mb-1">{t('product.color')}</p>
                      <p className="text-lg font-semibold text-gray-900">{card.productColor}</p>
                    </div>
                  </div>
                  
                  {/* Category and State Tags */}
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: '#479626' }}>
                      {translateCategory(card.productCategory)}
                    </span>
                    <span className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: '#479626' }}>
                      {translateState(card.productState)}
                    </span>
                  </div>
                  
                  {/* COD Availability */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${card.isCodAvailable ? '' : 'bg-red-500'}`} style={card.isCodAvailable ? { backgroundColor: '#479626' } : {}}></div>
                    <p className="text-lg font-medium text-gray-700">
                      {card.isCodAvailable ? t('product.codAvailable') : t('product.codNotAvailable')}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="pt-4 space-y-4">
                    {/* Add to Cart / Remove from Cart Button */}
                    {!isUserSeller && user && (
                      <button 
                        className={`w-full py-4 px-8 rounded-xl text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                          inCart 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'text-white'
                        }`}
                        style={!inCart ? { backgroundColor: '#479626' } : {}}
                        onClick={inCart ? handleRemoveFromCart : handleAddToCart}
                      >
                        {inCart ? t('product.removeFromCart') : t('product.addToCart')}
                      </button>
                    )}
                    
                    {/* Buy Now Button */}
                    <button 
                      className={`w-full py-4 px-8 rounded-xl text-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                        isUserSeller 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'text-white shadow-lg hover:shadow-xl'
                      }`}
                      style={!isUserSeller ? { backgroundColor: '#ffaf27' } : {}}
                      onClick={handleBuyNow}
                      disabled={isUserSeller}
                      title={isUserSeller ? t('product.cannotBuyOwn') : t('product.buyNow')}
                    >
                      {isUserSeller ? t('dashboard.yourProduct') : t('product.buyNow')}
                    </button>
                    
                    {/* Login prompt for non-authenticated users */}
                    {!user && (
                      <div className="text-center mt-4">
                        <p className="text-gray-600 mb-2">{t('auth.loginToAddCart')}</p>
                        <button 
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                          onClick={() => navigate('/login')}
                        >
                          {t('auth.login')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* SAP Analytics Cloud Dashboard */}
      <section className="bg-gray-50 py-10 font-mhlk">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-800 mb-4">Business Intelligence & Analytics</h2>
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-gray-600">Powered by SAP Analytics Cloud - Enterprise-grade insights for this product</p>
          </div>
          <SAPAnalyticsDashboard 
            productData={{
              name: card.productName,
              category: card.productCategory,
              material: card.productMaterial,
              region: card.productState,
              basePrice: card.productPrice,
              seller: card.productSellerName,
              weight: card.productWeight,
              color: card.productColor
            }} 
          />
        </div>
      </section>
    </>
  );
}