import { useState } from 'react';
import { Link } from 'react-router';
import { Cloud, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPasswordAPI } from '../services/api';
import DitherBackground from '../components/DitherBackground';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await forgotPasswordAPI(email);
            setIsSubmitted(true);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
                    <h1 className="text-3xl font-bold text-white drop-shadow-md">Reset Password</h1>
                    <p className="text-gray-200 mt-2 drop-shadow-sm">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] p-8">
                    {isSubmitted ? (
                        <div className="text-center py-4">
                            <div className="flex justify-center mb-4">
                                <CheckCircle className="w-16 h-16 text-green-400" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                            <p className="text-gray-300 text-sm mb-6">
                                If an account exists for {email}, you will receive a password reset link shortly.
                            </p>
                            <Link 
                                to="/login" 
                                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </Link>
                        </div>
                    ) : (
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

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600/90 hover:bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] backdrop-blur-sm text-white py-3 rounded-lg border border-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Sending link...' : 'Send Reset Link'}
                            </button>

                            <div className="text-center mt-6">
                                <Link 
                                    to="/login" 
                                    className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
