import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        setCaptchaInput(''); // Optional: Clear input on refresh? Maybe better to keep it if user is typing. Let's keep it for security.
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
        <div className="premium-bg flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lime-400 to-transparent opacity-50"></div>

                <div className="text-center mb-10">
                    <div className="font-black tracking-tighter text-white flex items-start select-none justify-center mb-2">
                        <span className="text-6xl">WERK</span>
                        <sup className="text-lime-400 ml-1 mt-2 text-2xl">IDE</sup>
                    </div>
                    <p className="text-zinc-500 font-medium tracking-wide">ENTER THE PORTAL</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-bold text-center animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="you@werk.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
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
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Human Verification</label>
                            <div className="flex items-center gap-4 w-full">
                                <div className="flex-1 h-12 bg-zinc-900 rounded-xl flex items-center justify-center font-mono text-xl text-white font-black tracking-widest select-none border border-zinc-700 shadow-inner relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
                                    {captcha.num1} + {captcha.num2} = ?
                                </div>
                                <input
                                    type="number"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(e.target.value)}
                                    className="h-12 w-20 bg-zinc-800 border border-zinc-600 rounded-xl text-center text-xl font-bold text-lime-400 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all placeholder-zinc-600"
                                    placeholder="?"
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-zinc-600 font-mono">Refreshes in 20s</p>
                        </div>
                    </div>

                    <button type="submit" className="w-full btn-primary uppercase tracking-wide text-lg mt-4">
                        Login
                    </button>
                </form>
                {/* <p className="mt-8 text-center text-zinc-600 text-sm font-medium">
                    New player? <Link to="/register" className="text-lime-400 hover:text-lime-300 transition-colors">Create account</Link>
                </p> */}
            </div>
        </div>
    );

};

export default Login;
