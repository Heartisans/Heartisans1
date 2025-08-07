import { useTranslation } from 'react-i18next';

export const CartSummary = ({ cart, onCheckout }) => {
  const { t } = useTranslation();
  
  const total = cart?.items?.reduce(
    (sum, item) => sum + (item.productPrice * (item.quantity || 1)),
    0
  );

  const itemCount = cart?.items?.length || 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border" style={{ borderColor: '#479626' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          {t('cart.summary')}
        </h3>
        <p className="text-lg text-gray-600">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Order Summary */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center py-3 border-b border-gray-200">
          <span className="text-lg sm:text-xl font-medium text-gray-700">Subtotal:</span>
          <span className="text-lg sm:text-xl font-semibold text-gray-900">₹{total?.toLocaleString() || 0}</span>
        </div>
        
        <div className="flex justify-between items-center py-3 border-b border-gray-200">
          <span className="text-lg sm:text-xl font-medium text-gray-700">Shipping:</span>
          <span className="text-lg sm:text-xl font-semibold text-green-600">Free</span>
        </div>
        
        <div className="flex justify-between items-center py-4 border-t-2 border-gray-300">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">{t('cart.total')}:</span>
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#479626' }}>
            ₹{total?.toLocaleString() || 0}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        className={`w-full py-4 px-8 rounded-xl text-xl sm:text-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
          !cart || !cart.items || cart.items.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'text-white'
        }`}
        style={cart && cart.items && cart.items.length > 0 ? { backgroundColor: '#479626' } : {}}
        disabled={!cart || !cart.items || cart.items.length === 0}
        onClick={() => onCheckout(total)}
      >
        {cart && cart.items && cart.items.length > 0 
          ? t('cart.proceedToCheckout') 
          : 'Cart is Empty'
        }
      </button>

      {/* Security Notice */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <span>🔒</span>
          Secure checkout with 256-bit SSL encryption
        </p>
      </div>
    </div>
  );
};