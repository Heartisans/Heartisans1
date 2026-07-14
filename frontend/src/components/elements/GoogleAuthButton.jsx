import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export const GoogleAuthButton = ({ isSignUp = false }) => {
  const { googleSignIn } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleAuth = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const result = await googleSignIn(codeResponse.code);

        if (result.success) {
          // Redirect to auth handler which will properly route to home
          navigate('/auth-redirect');
        } else {
          setErrorMessage(result.error || 'Google authentication failed. Please try again.');
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Google auth error:', error);
        setErrorMessage(error.message || 'An unexpected error occurred during Google authentication.');
        setIsOpen(true);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setErrorMessage('Google login popup failed. Please check your Google Client ID configuration.');
      setIsOpen(true);
    },
    flow: 'auth-code',
  });

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleAuth}
        className="w-full flex items-center justify-center py-6 px-6 border border-gray-300 text-xl font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-200 cursor-pointer"
      >
        <img 
          src="/photos/google-search.png" 
          alt="Google" 
          className="w-8 h-8 mr-3 rounded-full"
        />
        {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
      </button>

      {/* Error Dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-4">
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  Account Already Exists
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Got it
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};