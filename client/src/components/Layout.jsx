import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Briefcase } from 'lucide-react';
import BirthdayBanner from './BirthdayBanner';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                <BirthdayBanner />
                <nav className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center shadow-sm sticky top-4 z-50">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="font-bold text-slate-900 dark:text-white flex items-center gap-2 select-none hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">W</div>
                            <span className="text-xl tracking-tight hidden md:block">WERK<span className="text-slate-400 font-normal">IDE</span></span>
                        </Link>
                        {['admin', 'super_admin'].includes(user?.role) && (
                            <Link to="/admin" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-medium border-l border-slate-200 dark:border-slate-700 pl-6">
                                <LayoutDashboard size={18} />
                                <span className="hidden md:inline">HQ Dashboard</span>
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <Briefcase size={16} className="text-blue-500" />
                            <div className="hidden md:block text-right">
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user?.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase leading-none mt-1">{user?.role}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <LogOut size={18} />
                        </button>
                    </div>
                </nav>
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
