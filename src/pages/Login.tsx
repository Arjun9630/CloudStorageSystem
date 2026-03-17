import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Cloud, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DitherBackground from '../components/DitherBackground';

export function Login() {
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === 'true';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
      // If logging in through admin portal, go to admin, else home
      navigate(isAdminLogin ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0 bg-black">
        <DitherBackground />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${isAdminLogin ? 'bg-indigo-600/80' : 'bg-blue-600/80'} backdrop-blur-md rounded-full mb-4 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-white/20`}>
            {isAdminLogin ? <Shield className="w-8 h-8 text-white" /> : <Cloud className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">
            {isAdminLogin ? 'Admin Portal' : 'Welcome Back'}
          </h1>
          <p className="text-gray-200 mt-2 drop-shadow-sm">
            {isAdminLogin ? 'Please sign in to manage the system' : 'Sign in to access your cloud storage'}
          </p>
        </div>

        <div className={`bg-white/10 backdrop-blur-xl border ${isAdminLogin ? 'border-indigo-500/30' : 'border-white/20'} rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2 drop-shadow-sm">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2 drop-shadow-sm">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400" 
                />
                <span className="text-gray-200">Remember me</span>
              </label>
              <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors drop-shadow-sm">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full ${isAdminLogin ? 'bg-indigo-600/90 hover:bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-blue-600/90 hover:bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]'} backdrop-blur-sm text-white py-3 rounded-lg border border-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {!isAdminLogin && (
            <div className="mt-6 text-center text-sm text-gray-300">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors drop-shadow-sm">
                Sign up
              </Link>
            </div>
          )}

          {isAdminLogin && (
            <div className="mt-6 text-center text-sm text-gray-400">
              <Link to="/login" className="hover:text-white transition-colors">
                Back to regular login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
