import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Palmtree, DollarSign, Clock, Calendar,
    FileText, Zap, Sparkles, LogOut, Bell, Menu, ChevronLeft, ChevronRight, Briefcase, ShieldAlert, Settings, Search, MapPin
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

    // Color Mapping Logic
    const getColorClass = (path) => {
        if (path === '/admin') return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10'; // HQ
        if (path.includes('users') || path.includes('leaves')) return 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10'; // People
        if (path.includes('payroll') || path.includes('overtimes') || path.includes('claims')) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'; // Finance
        if (path.includes('quests') || path.includes('vibes')) return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10'; // Culture
        if (path.includes('logs') || path.includes('settings')) return 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800'; // System
        return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-800';
    };

    const getIconColor = (path) => {
        if (path === '/admin') return 'text-blue-500';
        if (path.includes('users') || path.includes('leaves')) return 'text-violet-500';
        if (path.includes('payroll') || path.includes('overtimes') || path.includes('claims')) return 'text-emerald-500';
        if (path.includes('quests') || path.includes('vibes')) return 'text-amber-500';
        return 'text-slate-500';
    };

    const NavItem = ({ to, icon: Icon, label }) => {
        const activeColorClass = getColorClass(to);
        const iconColor = getIconColor(to);

        return (
            <NavLink to={to} end={to === '/admin'} title={isCollapsed ? label : ''} className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-sm mb-1",
                isActive
                    ? clsx(activeColorClass, "font-bold shadow-sm")
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200",
                isCollapsed && "justify-center px-2"
            )}>
                <Icon size={18} className={clsx("shrink-0 transition-colors", iconColor)} />
                <span className={clsx("transition-all duration-300 overflow-hidden whitespace-nowrap", isCollapsed ? "w-0 opacity-0 md:hidden" : "w-auto opacity-100")}>
                    {label}
                </span>
            </NavLink>
        );
    };

    const SectionHeader = ({ label }) => (
        <div className={clsx("px-3 mt-6 mb-2 transition-all duration-300", isCollapsed && "opacity-0 hidden")}>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{label}</span>
        </div>
    );

    // Breadcrumb Logic
    const getBreadcrumb = () => {
        const path = location.pathname;
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 1 && parts[0] === 'admin') return 'Dashboard';
        return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 flex font-sans min-h-screen text-slate-900 dark:text-slate-50 selection:bg-blue-100 selection:text-blue-900">
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 bg-muted/30 border-r border-border flex flex-col z-50 transition-all duration-300 shadow-sm backdrop-blur-xl h-screen",
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                isCollapsed ? "md:w-16" : "md:w-64",
                "w-64"
            )}>
                {/* Header */}
                <div className={clsx("h-16 border-b flex items-center px-4 shrink-0 bg-background/50 backdrop-blur-md", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && (
                        <div className="font-bold text-foreground flex items-center gap-2 select-none">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">W</div>
                            <span className="text-lg tracking-tight">WERK<span className="text-muted-foreground font-normal">IDE</span></span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 custom-scrollbar">
                    <SectionHeader label="Overview" />
                    <NavItem to="/admin" icon={LayoutDashboard} label="Dashboard" />

                    <SectionHeader label="Teams" />
                    <NavItem to="/admin/users" icon={Users} label="People" />
                    <NavItem to="/admin/attendance" icon={MapPin} label="Presence" />
                    <NavItem to="/admin/roster" icon={Calendar} label="Roster" />
                    <NavItem to="/admin/leaves" icon={Palmtree} label="Time Off" />

                    <SectionHeader label="Finance" />
                    <NavItem to="/admin/payroll" icon={DollarSign} label="Payroll" />
                    <NavItem to="/admin/overtimes" icon={Clock} label="Overtime" />
                    <NavItem to="/admin/claims" icon={FileText} label="Claims" />

                    <SectionHeader label="Culture" />
                    <NavItem to="/admin/quests" icon={Zap} label="Quests" />
                    <NavItem to="/admin/vibes" icon={Sparkles} label="Vibes" />

                    <SectionHeader label="System" />
                    <NavItem to="/admin/logs" icon={ShieldAlert} label="Audit" />
                    <NavItem to="/admin/settings" icon={Settings} label="Settings" />

                    <div className="my-4 border-t"></div>
                    <NavItem to="/staff" icon={Briefcase} label="My View" />
                </div>

                {/* User Footer */}
                <div className="p-3 border-t bg-muted/20 backdrop-blur-sm shrink-0">
                    <div className={clsx("flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-all border border-transparent hover:border-border cursor-pointer", isCollapsed && "justify-center p-0 hover:bg-transparent border-0")}>
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className={clsx("flex-1 overflow-hidden min-w-0 transition-all duration-300", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                            <p className="text-sm font-semibold text-foreground truncate leading-tight">{user?.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <button onClick={handleLogout} className={clsx("text-muted-foreground hover:text-red-500 transition-colors", isCollapsed && "hidden")}>
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={clsx(
                "flex-1 min-h-screen transition-all duration-300 bg-background",
                isCollapsed ? "md:ml-16" : "md:ml-64"
            )}>
                {/* Header */}
                <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="md:hidden text-muted-foreground hover:text-foreground"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Briefcase size={16} className="text-muted-foreground" />
                            <span>/</span>
                            <span className="font-semibold text-foreground">{getBreadcrumb()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 pr-4 py-1.5 bg-muted/50 border-transparent focus:bg-background border focus:border-blue-500 rounded-md text-sm text-foreground w-64 transition-all outline-none"
                            />
                        </div>
                        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                        </button>
                    </div>
                </header>

                {/* Page View */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
