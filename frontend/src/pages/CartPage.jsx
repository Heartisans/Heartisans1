import { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { CartSummary } from "../components/elements/CartSummary";
import { useTranslation } from 'react-i18next';
import { useScrollToTop } from "../hooks/useScrollToTop";

export const CartPage = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [cart, setCart] = useState(null);
  const [mongoUserId, setMongoUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useScrollToTop();

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    setMongoUserId(user._id);
    axios.get(`http://localhost:5000/api/cart/${user._id}`)
      .then(res => {
        setCart(res.data);
        setLoading(false);
      })
      .catch(() => {
        setCart({ items: [] });
        setLoading(false);
      });
  }, [user]);

  const handleRemove = async (productId) => {
    if (!mongoUserId || !productId) return;
    await axios.post("http://localhost:5000/api/cart/remove", {
      userId: mongoUserId,
      productId,
    });
    // Refresh cart after removal
    const res = await axios.get(`http://localhost:5000/api/cart/${mongoUserId}`);
    setCart(res.data);
  };

  const handleVisit = (productCategory, productId) => {
    navigate(`/shop/${productCategory}/${productId}`);
  };

  const handleContinueShopping = () => {
    navigate('/shop');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mhlk" style={{ background: 'linear-gradient(to bottom right, #e8f5e8, #f0f9f0)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mx-auto mb-4" style={{ borderColor: '#479626', borderTopColor: 'transparent' }}></div>
          <p className="text-2xl font-semibold" style={{ color: '#479626' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen font-mhlk" style={{ background: 'linear-gradient(to bottom right, #e8f5e8, #f0f9f0)' }}>
        <div className="w-full h-20"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 mb-6">
              {t('cart.title')}
            </h1>
            <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
              <div className="text-6xl mb-6">🛒</div>
              <p className="text-xl text-gray-600 mb-8">{t('auth.loginToAddCart')}</p>
              <button 
                className="w-full py-4 px-8 rounded-xl text-xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                style={{ backgroundColor: '#479626' }}
                onClick={() => navigate('/login')}
              >
                {t('auth.login')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen font-mhlk" style={{ background: 'linear-gradient(to bottom right, #e8f5e8, #f0f9f0)' }}>
        <div className="w-full h-20"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-800 mb-4">
              {t('cart.title')}
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">
              {cart && cart.items.length > 0 
                ? `${cart.items.length} ${cart.items.length === 1 ? 'item' : 'items'} in your cart`
                : 'Your shopping cart'
              }
            </p>
          </div>

          {cart && cart.items.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="xl:col-span-2">
                <div className="space-y-6">
                  {cart.items.map((item, index) => (
                    <div 
                      key={item.productId} 
                      className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border transition-all duration-300 hover:shadow-2xl"
                      style={{ borderColor: '#479626' }}
                    >
                      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img 
                            src={item.productImageUrl} 
                            alt={item.productName} 
                            className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-cover rounded-xl shadow-lg" 
                          />
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 line-clamp-2">
                            {item.productName}
                          </h3>
                          <p className="text-lg sm:text-xl text-gray-600 mb-2">
                            {t('common.quantity')}: {item.quantity || 1}
                          </p>
                          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4" style={{ color: '#479626' }}>
                            ₹{item.productPrice?.toLocaleString()}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              className="flex-1 py-3 px-6 rounded-xl text-lg font-semibold text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                              style={{ backgroundColor: '#479626' }}
                              onClick={() => handleVisit(item.productCategory, item.productId)}
                            >
                              {t('products.details')}
                            </button>
                            <button
                              className="flex-1 py-3 px-6 rounded-xl text-lg font-semibold bg-red-500 hover:bg-red-600 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                              onClick={() => handleRemove(item.productId)}
                            >
                              {t('product.removeFromCart')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Summary Sidebar */}
              <div className="xl:col-span-1">
                <div className="sticky top-24">
                  <CartSummary
                    cart={cart}
                    onCheckout={total => navigate("/checkout", { state: { total } })}
                  />
                  
                  {/* Continue Shopping Button */}
                  <button
                    className="w-full py-4 px-8 rounded-xl text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mt-4"
                    style={{ backgroundColor: '#ffaf27', color: 'white' }}
                    onClick={handleContinueShopping}
                  >
                    {t('cart.continueShopping')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty Cart */
            <div className="text-center py-20">
              <div className="bg-white rounded-2xl shadow-xl p-12 sm:p-16 max-w-2xl mx-auto">
                <div className="text-8xl sm:text-9xl mb-8">🛒</div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
                  {t('cart.empty')}
                </h2>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8">
                  Discover amazing handcrafted products from talented artisans
                </p>
                <button
                  className="py-4 px-8 rounded-xl text-xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: '#479626' }}
                  onClick={handleContinueShopping}
                >
                  {t('cart.continueShopping')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}