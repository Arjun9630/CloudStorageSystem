import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { Cloud, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { resetPasswordAPI } from '../services/api';
import DitherBackground from '../components/DitherBackground';

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!token) {
            setError('Invalid or missing reset token');
            return;
        }

        setIsLoading(true);
        try {
            await resetPasswordAPI(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.message || 'Reset failed. Your link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token && !success) {
        return (
            <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
                <div className="absolute inset-0 z-0 bg-black">
                    <DitherBackground />
                </div>
                <div className="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
                    <p className="text-gray-300 mb-6">This password reset link is invalid or has expired.</p>
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 z-0 bg-black">
                <DitherBackground />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/80 backdrop-blur-md rounded-full mb-4 shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-white/20">
                        <Cloud className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">New Password</h1>
                    <p className="text-gray-200 mt-2 drop-shadow-sm">
                        Create a secure new password for your account.
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="flex justify-center mb-4">
                                <ShieldCheck className="w-16 h-16 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
                            <p className="text-gray-300 text-sm">
                                Your password has been updated. Redirecting you to login...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2 drop-shadow-sm">
                                    New Password
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

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2 drop-shadow-sm">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600/90 hover:bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] backdrop-blur-sm text-white py-3 rounded-lg border border-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Updating...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
