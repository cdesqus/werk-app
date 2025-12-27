import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Palmtree, DollarSign, Clock,
    FileText, Zap, Sparkles, LogOut, Bell, Moon, Sun, Search, Menu, ChevronLeft, ChevronRight, Briefcase, ShieldAlert, Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink to={to} end={to === '/admin'} title={isCollapsed ? label : ''} className={({ isActive }) => clsx(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-1",
            isActive
                ? "bg-lime-400/10 text-lime-400 border-r-2 border-lime-400"
                : "text-zinc-400 hover:bg-white/5 hover:text-white",
            isCollapsed && "justify-center px-2"
        )}>
            <Icon size={20} className="shrink-0" />
            <span className={clsx("transition-all duration-300 overflow-hidden whitespace-nowrap", isCollapsed ? "w-0 opacity-0 md:hidden" : "w-auto opacity-100")}>
                {label}
            </span>
        </NavLink>
    );

    const SectionHeader = ({ label }) => (
        <div className={clsx("px-4 mt-6 mb-2 transition-all duration-300", isCollapsed && "opacity-0 hidden")}>
            <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">{label}</span>
        </div>
    );

    // Breadcrumb Logic (Simple)
    const getBreadcrumb = () => {
        const path = location.pathname;
        if (path === '/admin') return 'HQ / Dashboard';
        if (path.includes('users')) return 'People / Squad';
        if (path.includes('leaves')) return 'People / Touch Grass';
        if (path.includes('payroll')) return 'Finance / Payroll';
        if (path.includes('overtimes')) return 'Finance / Overtimes';
        if (path.includes('claims')) return 'Finance / Claims';
        if (path.includes('quests')) return 'Culture / Side Quests';
        if (path.includes('vibes')) return 'Culture / Vibe Check';
        if (path.includes('logs')) return 'System / Audit Logs';
        return 'HQ';
    };

    return (
        <div className="premium-bg flex font-sans selection:bg-lime-400 selection:text-black">
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 bg-zinc-900/95 backdrop-blur-3xl border-r border-white/5 flex flex-col z-50 transition-all duration-300",
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                isCollapsed ? "md:w-20" : "md:w-[280px]",
                "w-[280px]" // Always 280px on mobile when open
            )}>
                {/* Header */}
                <div className={clsx("p-6 border-b border-white/5 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && (
                        <div className="font-black tracking-tighter text-white flex items-start select-none animate-in fade-in duration-300">
                            <span className="text-3xl">WERK</span>
                            <sup className="text-lime-400 ml-1 mt-1 text-sm">IDE</sup>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 custom-scrollbar">
                    <SectionHeader label="Main" />
                    <NavItem to="/admin" icon={LayoutDashboard} label="HQ Dashboard" />

                    <SectionHeader label="People & Ops" />
                    <NavItem to="/admin/users" icon={Users} label="Squad" />
                    <NavItem to="/admin/leaves" icon={Palmtree} label="Touch Grass" />

                    <SectionHeader label="Finance" />
                    <NavItem to="/admin/payroll" icon={DollarSign} label="Payroll" />
                    <NavItem to="/admin/overtimes" icon={Clock} label="Overtimes" />
                    <NavItem to="/admin/claims" icon={FileText} label="Claims" />

                    <SectionHeader label="Culture" />
                    <NavItem to="/admin/quests" icon={Zap} label="Side Quests" />
                    <NavItem to="/admin/vibes" icon={Sparkles} label="Vibe Check" />

                    <SectionHeader label="System" />
                    <NavItem to="/admin/logs" icon={ShieldAlert} label="Audit Logs" />
                    <NavItem to="/admin/settings" icon={Settings} label="System Settings" />

                    <SectionHeader label="Personal" />
                    <NavItem to="/staff" icon={Briefcase} label="My Workspace" />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                    <div className={clsx("flex items-center gap-3 p-2 rounded-xl bg-zinc-950 border border-zinc-800 transition-all", isCollapsed && "justify-center p-0 border-0 bg-transparent")}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shrink-0">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className={clsx("flex-1 overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                            <p className="text-sm font-bold truncate">{user?.name}</p>
                            <p className="text-xs text-zinc-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <button onClick={handleLogout} className={clsx("p-2 hover:text-red-400 transition-colors", isCollapsed && "hidden")}>
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={clsx(
                "flex-1 min-h-screen transition-all duration-300",
                isCollapsed ? "md:ml-20" : "md:ml-[280px]"
            )}>
                {/* Top Bar */}
                <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-4 text-sm font-medium text-zinc-400">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="hidden md:flex items-center gap-2">
                            <span className="text-lime-400 font-bold">WERK IDE</span>
                            <span className="text-zinc-700">/</span>
                            <span className="text-white">{getBreadcrumb()}</span>
                        </div>
                        <span className="md:hidden text-white font-bold">{getBreadcrumb().split('/').pop().trim()}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input type="text" placeholder="Command + K" className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-4 text-xs font-bold text-zinc-400 focus:border-lime-400 outline-none w-48" />
                        </div>
                        <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-lime-400 rounded-full"></span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
