import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: 0 });
    const [captchaInput, setCaptchaInput] = useState('');

    useEffect(() => {
        generateCaptcha();
        const interval = setInterval(() => {
            generateCaptcha();
        }, 20000); // Change every 20 seconds

        return () => clearInterval(interval);
    }, []);

    const generateCaptcha = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        setCaptcha({ num1, num2, answer: num1 + num2 });
        setCaptchaInput('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate Captcha
        if (parseInt(captchaInput) !== captcha.answer) {
            setError('Incorrect captcha answer');
            generateCaptcha();
            return;
        }

        try {
            const user = await login(email, password);
            if (['admin', 'super_admin'].includes(user.role)) navigate('/admin');
            else navigate('/staff');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            generateCaptcha();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Mesh Gradient Background (Light Mode) */}
            <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(59,130,246,0.1)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(139,92,246,0.1)_0px,transparent_50%)] dark:hidden pointer-events-none"></div>

            <div className="saas-card w-full max-w-md p-10 relative z-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="text-center mb-10">
                    <div className="font-black tracking-tighter text-slate-900 dark:text-white flex items-center justify-center gap-1 mb-2 select-none">
                        <span className="text-4xl">WERK</span>
                        <sup className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent text-lg font-bold mt-2">IDE</sup>
                    </div>
                    <p className="text-slate-500 font-medium text-sm">Sign in to your workspace</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg mb-6 text-sm font-bold text-center animate-in fade-in slide-in-from-top-2 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="name@company.com"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {/* Captcha */}
                    <div className="pt-2">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Check</label>
                            <div className="flex items-center gap-3 w-full">
                                <div className="flex-1 h-11 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center font-mono text-lg text-slate-700 dark:text-slate-200 font-bold tracking-widest select-none border border-slate-300 dark:border-slate-600 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/20 dark:bg-black/20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)' }}></div>
                                    <span className="relative z-10">{captcha.num1} + {captcha.num2} = ?</span>
                                </div>
                                <input
                                    type="number"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(e.target.value)}
                                    className="h-11 w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-center text-lg font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-400"
                                    placeholder="?"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full btn-primary text-base font-bold shadow-blue-500/20 shadow-lg hover:shadow-blue-500/30">
                        Enter Workspace
                    </button>
                </form>
            </div>

            <div className="absolute bottom-6 text-center text-xs text-slate-400 font-medium">
                &copy; {new Date().getFullYear()} WERK IDE. All systems nominal.
            </div>
        </div>
    );

};

export default Login;
