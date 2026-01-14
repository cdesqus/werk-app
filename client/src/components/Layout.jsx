import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Users } from 'lucide-react';
import BirthdayBanner from './BirthdayBanner';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="premium-bg p-4 md:p-8">
            <BirthdayBanner />
            <nav className="glass-card mb-8 p-4 flex justify-between items-center sticky top-4 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/" className="font-black tracking-tighter text-zinc-900 dark:text-white flex items-start select-none hover:opacity-80 transition-opacity">
                        <span className="text-2xl">WERK</span>
                        <sup className="text-lime-600 dark:text-lime-400 ml-0.5 mt-1 text-xs">IDE</sup>
                    </Link>
                    {['admin', 'super_admin'].includes(user?.role) && (
                        <>
                            <Link to="/admin" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-medium border-l border-zinc-200 dark:border-zinc-700 pl-4 ml-4">
                                <LayoutDashboard size={16} /> Admin Dashboard
                            </Link>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/5 transition-colors">
                        <User size={16} className={user?.role === 'admin' ? 'text-purple-600 dark:text-purple-500' : 'text-lime-600 dark:text-lime-400'} />
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">{user?.name}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-white dark:bg-zinc-900 px-2 py-0.5 rounded ml-2 border border-zinc-200 dark:border-zinc-800">
                            {user?.role}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="p-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-red-500 dark:hover:text-red-400">
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
