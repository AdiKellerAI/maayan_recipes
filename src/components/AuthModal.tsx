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
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center shadow-sm">
              <Lock className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">כניסה למערכת</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 text-center text-sm">
          הכנס פרטי התחברות לגישה מלאה
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              כתובת מייל
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-all duration-200"
                placeholder="your@email.com"
                disabled={isSubmitting}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              סיסמה
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-9 pl-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-all duration-200"
                placeholder="••••••••"
                disabled={isSubmitting}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2.5 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:from-orange-300 disabled:to-orange-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>מאמת...</span>
                </>
              ) : (
                <span>כניסה</span>
              )}
            </button>
          </div>
        </form>

        {/* Security Note */}
        <div className="mt-3 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700 text-center flex items-center justify-center gap-1">
            <span>🔒</span>
            <span>מוגן ומאובטח במכשיר שלך</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
