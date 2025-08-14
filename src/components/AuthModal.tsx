import React, { useState } from 'react';
import { X, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AuthModal: React.FC = () => {
  const { showAuthModal, authenticate, hideAuthModal } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!email.trim() || !password.trim()) {
      setError('אנא מלא את כל השדות');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = authenticate(email, password);
    
    if (!success) {
      setError('מייל או סיסמה שגויים');
      setIsSubmitting(false);
    } else {
      // Reset form
      setEmail('');
      setPassword('');
      setError('');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEmail('');
    setPassword('');
    setError('');
    setIsSubmitting(false);
    hideAuthModal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">אימות זהות</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-6 text-center">
          כדי לבצע פעולות עריכה, אנא הכנס את פרטי ההתחברות
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כתובת מייל
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="your@email.com"
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="flex-1 bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>מאמת...</span>
                </>
              ) : (
                <span>אישור</span>
              )}
            </button>
          </div>
        </form>

        {/* Security Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            🔒 הפרטים שלך מוגנים ונשמרים באופן מקומי במכשיר בלבד
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
