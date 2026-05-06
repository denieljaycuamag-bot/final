'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Mail, Dumbbell, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12 flex-col justify-between relative overflow-hidden">
        
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Fitness Tracker</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Your personal AI-powered fitness companion
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-start space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg mt-1">
              <div className="w-6 h-6 bg-white rounded"></div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Track Your Progress</h3>
              <p className="text-blue-100 text-sm">Log workouts and monitor your fitness journey</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg mt-1">
              <div className="w-6 h-6 bg-white rounded"></div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">AI Coach</h3>
              <p className="text-blue-100 text-sm">Get personalized advice and motivation</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg mt-1">
              <div className="w-6 h-6 bg-white rounded"></div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Stay Consistent</h3>
              <p className="text-blue-100 text-sm">Build healthy habits that last</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="bg-blue-600 p-4 rounded-2xl">
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-gray-600">
                {isLogin ? 'Sign in to continue your fitness journey' : 'Start your fitness journey today'}
              </p>
            </div>

            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 caret-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500 caret-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-auto"
                  >
                    <span className="text-gray-400 hover:text-gray-600 transition pointer-events-none">
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium transition"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}