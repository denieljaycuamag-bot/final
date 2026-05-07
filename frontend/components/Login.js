'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Mail, Dumbbell, Eye, EyeOff, ArrowRight, Activity, BrainCircuit, CheckCircle } from 'lucide-react';

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
    <div className="min-h-screen flex font-sans">
      {/* Left Side: Information & Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-16 flex-col justify-between relative overflow-hidden">
        
        {/* Animated background blobs */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-inner">
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Fitness Tracker</h1>
          </div>
          <p className="text-blue-100 text-xl max-w-md leading-relaxed">
            Your personal AI-powered fitness companion. Track, analyze, and surpass your goals.
          </p>
        </div>

        {/* Enhanced Feature Icons */}
        <div className="relative z-10 space-y-10">
          {[
            { icon: <Activity className="w-7 h-7 text-white" />, title: "Track Your Progress", desc: "Log workouts and monitor your fitness journey with precision." },
            { icon: <BrainCircuit className="w-7 h-7 text-white" />, title: "AI Coach", desc: "Get personalized, data-driven advice and motivation every step." },
            { icon: <CheckCircle className="w-7 h-7 text-white" />, title: "Stay Consistent", desc: "Build healthy habits that last a lifetime with streak tracking." }
          ].map((feature, i) => (
            <div key={i} className="flex items-center space-x-5 group">
              <div className="bg-white/10 group-hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl transition-colors duration-300">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-white text-lg font-bold mb-1">{feature.title}</h3>
                <p className="text-blue-100/80 text-base">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-50">
        {/* Increased max-width for better desktop readability */}
        <div className="w-full max-w-lg">
          
          <div className="lg:hidden flex flex-col items-center justify-center mb-10">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg mb-4">
              <Dumbbell className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Fitness Tracker</h2>
          </div>
          
          <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-12 transition-transform duration-500 hover:scale-[1.01]">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-gray-500 text-lg">
                {isLogin ? 'Sign in to continue your journey' : 'Start your fitness journey today'}
              </p>
            </div>
        
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-shake">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
  
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-5 py-4 border border-gray-200 rounded-2xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 transition-all flex items-center justify-center space-x-3 shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-800 font-bold text-md transition-colors"
              >
                {isLogin ? "New here? Create an account" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>

          {/* Improved contrast for Terms of Service */}
          <p className="text-center text-sm text-gray-600 mt-10 px-4 leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="underline font-medium hover:text-blue-600 transition">Terms of Service</a> and{' '}
            <a href="#" className="underline font-medium hover:text-blue-600 transition">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}