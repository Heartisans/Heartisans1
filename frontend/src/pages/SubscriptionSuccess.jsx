import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasVerified = useRef(false); // Flag to prevent double execution

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    if (orderId && !hasVerified.current) {
      hasVerified.current = true; // Set flag before calling
      verifySubscriptionPayment();
    } else if (!orderId) {
      setError('No order ID found');
      setLoading(false);
    }
  }, [orderId]);

  const verifySubscriptionPayment = async () => {
    try {
      console.log('Verifying subscription payment for order:', orderId);
      
      const response = await fetch('http://localhost:5000/subscription/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Subscription payment verification failed');
      }
    } catch (error) {
      console.error('Subscription payment verification error:', error);
      setError('Failed to verify subscription payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying subscription payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Subscription Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Subscription Activated!</h2>
          <p className="text-gray-600 mb-6">Welcome to the Artisan Plan! Your subscription is now active.</p>

          {order && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2 text-purple-800">Subscription Details:</h3>
              <p className="text-sm text-gray-600">Order ID: {order.orderId}</p>
              <p className="text-sm text-gray-600">Plan: {order.productDetails?.productName}</p>
              <p className="text-sm text-gray-600">Amount: Rs {order.amount}</p>
              <p className="text-sm text-gray-600">Status: {order.status}</p>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">🎉 Artisan Benefits Unlocked:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enhanced selling features</li>
              <li>• Priority customer support</li>
              <li>• Advanced analytics</li>
              <li>• Exclusive artisan badges</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Start Exploring
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Go to Dashboard
            </button>
            <p className="text-xs text-gray-400">
              You will receive a confirmation email shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
