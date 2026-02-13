import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { DollarSign, Check, X, ChevronLeft, ChevronRight, Megaphone, BarChart2, Plus, Trash2, Sparkles, Zap, Users, Shield, Palmtree, FileText } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { format, subMonths, addMonths } from 'date-fns';
import clsx from 'clsx';
import PayslipGenerator from '../components/PayslipGenerator';

const ServiceToggle = ({ label, description, isOn, onToggle }) => {
    return (
        <div className="bg-zinc-900 rounded-xl p-4 flex items-center justify-between border border-zinc-800">
            <div>
                <h3 className="font-bold text-white">{label}</h3>
                <p className="text-zinc-400 text-sm mt-1">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`w-12 h-6 rounded-full p-1 transition-all ${isOn ? 'bg-lime-400' : 'bg-zinc-700'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-md ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
};

const AdminDashboard = () => {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);
    const [services, setServices] = useState({});
    const [onLeaveToday, setOnLeaveToday] = useState([]);

    // Forms
    const [showVibeModal, setShowVibeModal] = useState(false);
    const [vibeForm, setVibeForm] = useState({ type: 'announcement', title: '', content: '', options: ['', ''] });

    const [showQuestModal, setShowQuestModal] = useState(false);
    const [questForm, setQuestForm] = useState({ title: '', reward: '', difficulty: 'Medium' });

    // Payslip Generator
    const [payslipUser, setPayslipUser] = useState(null);

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        console.log(`[Frontend Debug] Fetching Admin Summary for: ${month}/${year}`);

        try {
            // Summary
            try {
                const { data } = await api.get(`/admin/summary?month=${month}&year=${year}`);
                setSummary(data);
            } catch (e) {
                console.error("Failed to fetch summary:", e);
                toast.error("Failed to load payroll summary.");
            }

            // Services
            try {
                const { data } = await api.get('/admin/services');
                setServices(data || {});
            } catch (e) { console.error("Failed services", e); }

            // Active Leaves Today
            try {
                const { data } = await api.get('/admin/leaves/active');
                setOnLeaveToday(data);
            } catch (e) { console.error("Failed active leaves", e); }

            // Action Center Items
            let pending = [];

            try {
                const ot = await api.get(`/overtimes?status=Pending`);
                pending = [...pending, ...ot.data.map(i => ({ ...i, dataType: 'overtime' }))];
            } catch (e) { console.error("Failed overtimes", e); }

            try {
                const cl = await api.get(`/claims?status=Pending`);
                pending = [...pending, ...cl.data.map(i => ({ ...i, dataType: 'claim' }))];
            } catch (e) { console.error("Failed claims", e); }

            try {
                const lv = await api.get(`/leaves?status=Pending`);
                pending = [...pending, ...lv.data.map(i => ({ ...i, dataType: 'leave' }))];
            } catch (e) { console.error("Failed leaves", e); }

            setPendingItems(pending);

        } catch (err) { console.error("Critical dashboard error:", err); }
    };

    const toggleService = async (key) => {
        try {
            const newValue = !services[key];
            await api.put('/admin/services', { key, value: newValue });
            setServices(prev => ({ ...prev, [key]: newValue }));
            toast.success(`Service ${newValue ? 'Enabled' : 'Disabled'}`);
        } catch (err) {
            toast.error('Failed to update service');
        }
    };

    const handleAction = async (dataType, id, status) => {
        try {
            const endpoint = dataType === 'overtime' ? 'overtimes' : dataType === 'claim' ? 'claims' : 'leaves';
            await api.put(`/${endpoint}/${id}`, { status });
            toast.success('Action successful');
            fetchData();
        } catch (err) { toast.error('Action failed'); }
    };

    const handlePostVibe = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...vibeForm };
            if (payload.type === 'announcement') delete payload.options;
            else payload.options = payload.options.filter(o => o.trim() !== '');

            await api.post('/vibes', payload);
            toast.success('Vibe posted!');
            setShowVibeModal(false);
            setVibeForm({ type: 'announcement', title: '', content: '', options: ['', ''] });
        } catch (err) { toast.error('Failed to post'); }
    };

    const handleCreateQuest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/quests', questForm);
            toast.success('Quest created!');
            setShowQuestModal(false);
            setQuestForm({ title: '', reward: '', difficulty: 'Medium' });
        } catch (err) { toast.error('Failed to create quest'); }
    };

    const addOption = () => setVibeForm({ ...vibeForm, options: [...vibeForm.options, ''] });
    const updateOption = (idx, val) => {
        const newOpts = [...vibeForm.options];
        newOpts[idx] = val;
        setVibeForm({ ...vibeForm, options: newOpts });
    };

    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => {
        const next = addMonths(currentDate, 1);
        if (next <= new Date()) setCurrentDate(next);
    };

    const totalPayable = summary.reduce((sum, user) => sum + user.totalPayable, 0);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">HQ Dashboard</h1>
                    <p className="text-muted-foreground font-medium">Command Center & Overview</p>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowQuestModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
                        <Zap size={16} className="text-amber-500" /> Create Quest
                    </button>
                    <button onClick={() => setShowVibeModal(true)} className="btn-primary flex items-center gap-2 text-sm shadow-blue-500/20">
                        <Sparkles size={16} /> Post Vibe
                    </button>
                    <div className="flex items-center bg-card border border-border rounded-lg p-1">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground"><ChevronLeft size={16} /></button>
                        <span className="font-bold text-sm min-w-[120px] text-center text-foreground">{format(currentDate, 'MMMM yyyy')}</span>
                        <button onClick={nextMonth} disabled={currentDate >= new Date()} className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </header>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="saas-card p-6 flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Total Payroll</span>
                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/10 rounded text-emerald-600 dark:text-emerald-400">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <span className="text-3xl font-bold text-foreground tracking-tight">Rp {totalPayable.toLocaleString('id-ID')}</span>
                </div>
                <div className="saas-card p-6 flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Pending Approvals</span>
                        <div className="p-1.5 bg-violet-100 dark:bg-violet-500/10 rounded text-violet-600 dark:text-violet-400">
                            <Shield size={16} />
                        </div>
                    </div>
                    <span className="text-3xl font-bold text-foreground tracking-tight">{pendingItems.length}</span>
                </div>
                <div className="saas-card p-6 flex flex-col justify-between h-32">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-wider">Active Staff</span>
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 rounded text-blue-600 dark:text-blue-400">
                            <Users size={16} />
                        </div>
                    </div>
                    <span className="text-3xl font-bold text-foreground tracking-tight">{summary.length}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Action Center */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Zap className="text-amber-500" size={20} /> Action Center</h2>
                    {pendingItems.length === 0 ? (
                        <div className="saas-card p-10 text-center text-slate-500 border-dashed">All caught up! No pending requests.</div>
                    ) : (
                        <div className="space-y-4">
                            {pendingItems.map((item, idx) => (
                                <div key={idx} className="saas-card p-4 flex flex-col gap-3 group border-l-4 border-l-amber-400 hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-2">
                                    {/* User Identity Header */}
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">
                                                {item.User?.name ? item.User.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <h4 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{item.User?.name || 'Unknown User'}</h4>
                                                <p className="text-slate-500 text-xs font-medium">
                                                    {item.User ? `${item.User.role} • ${item.User.email}` : 'User deleted or missing'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={clsx("text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                            item.dataType === 'overtime' ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" :
                                                item.dataType === 'claim' ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400")}>
                                            {item.dataType}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                                                {item.dataType === 'overtime' ? item.activity : item.dataType === 'claim' ? item.title : 'Leave Request'}
                                            </h4>
                                            <p className="text-slate-500 text-sm">
                                                {item.dataType === 'overtime' ? `${item.startTime} - ${item.endTime} (${item.hours} hrs) • Rp ${item.payableAmount.toLocaleString('id-ID')}` :
                                                    item.dataType === 'claim' ? `Rp ${item.amount.toLocaleString('id-ID')}` : `${item.days} days`}
                                            </p>
                                            {item.dataType === 'leave' && <p className="text-slate-400 text-xs mt-2 italic">"{item.reason}"</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAction(item.dataType, item.id, 'Approved')} className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-all"><Check size={18} /></button>
                                            <button onClick={() => handleAction(item.dataType, item.id, 'Rejected')} className="p-2 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-all"><X size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payroll Summary */}
                <div className="space-y-6">
                    <div className="flex flex-col gap-6">
                        {/* Out of Office Card */}
                        <div className="bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-900/10 dark:to-orange-900/10 rounded-2xl p-6 border border-pink-100 dark:border-pink-900/20">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Palmtree className="text-pink-500" size={20} /> Out of Office
                                    <span className="bg-pink-200 dark:bg-pink-500/30 text-pink-700 dark:text-pink-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Today</span>
                                </h2>
                                <span className="text-2xl font-black text-pink-500/20">{onLeaveToday.length}</span>
                            </div>

                            {onLeaveToday.length === 0 ? (
                                <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm italic">
                                    All hands on deck! No one is on leave.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {onLeaveToday.map(leave => (
                                        <div key={leave.id} className="flex items-center gap-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-white/50 dark:border-white/5">
                                            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-800 flex items-center justify-center text-pink-600 dark:text-pink-200 font-bold text-xs shrink-0">
                                                {leave.User?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{leave.User?.name || 'Unknown'}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{leave.User?.email}</p>
                                            </div>
                                            <div className="ml-auto text-right shrink-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-zinc-800 px-2 py-1 rounded text-slate-500 border border-slate-100 dark:border-slate-700 block mb-0.5">
                                                    {leave.type}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    Returns {format(new Date(leave.endDate), 'MMM d')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6"><DollarSign className="text-emerald-500" size={20} /> Payroll Estimate</h2>
                            <div className="saas-card overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 font-bold">Staff</th>
                                            <th className="p-4 font-bold text-right">Overtime</th>
                                            <th className="p-4 font-bold text-right">Claims</th>
                                            <th className="p-4 font-bold text-right text-slate-900 dark:text-white">Total</th>
                                            <th className="p-4 font-bold text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {summary.map(user => (
                                            <tr key={user.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 font-bold text-slate-900 dark:text-white text-sm">{user.name}</td>
                                                <td className="p-4 text-right text-slate-500 text-sm">Rp {user.overtimeTotal.toLocaleString('id-ID')}</td>
                                                <td className="p-4 text-right text-slate-500 text-sm">Rp {user.claimTotal.toLocaleString('id-ID')}</td>
                                                <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">Rp {user.totalPayable.toLocaleString('id-ID')}</td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => setPayslipUser(user)}
                                                        className="bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-zinc-800 transition-colors flex items-center gap-1 mx-auto"
                                                    >
                                                        <FileText size={12} /> Slip
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Vibe Modal */}
            {showVibeModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="saas-card w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in duration-200 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Post Vibe Check</h2>
                            <button onClick={() => setShowVibeModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white"><X /></button>
                        </div>

                        <form onSubmit={handlePostVibe} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setVibeForm({ ...vibeForm, type: 'announcement' })}
                                    className={clsx("p-3 rounded-lg font-bold border transition-all text-sm", vibeForm.type === 'announcement' ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500")}>
                                    Announcement
                                </button>
                                <button type="button" onClick={() => setVibeForm({ ...vibeForm, type: 'poll' })}
                                    className={clsx("p-3 rounded-lg font-bold border transition-all text-sm", vibeForm.type === 'poll' ? "bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500")}>
                                    Poll
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</label>
                                <input type="text" required className="input-field w-full"
                                    value={vibeForm.title} onChange={e => setVibeForm({ ...vibeForm, title: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content / Question</label>
                                <textarea required className="input-field w-full h-24"
                                    value={vibeForm.content} onChange={e => setVibeForm({ ...vibeForm, content: e.target.value })} />
                            </div>

                            {vibeForm.type === 'poll' && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Options</label>
                                    {vibeForm.options.map((opt, idx) => (
                                        <input key={idx} type="text" placeholder={`Option ${idx + 1}`} className="input-field w-full"
                                            value={opt} onChange={e => updateOption(idx, e.target.value)} />
                                    ))}
                                    <button type="button" onClick={addOption} className="text-xs text-blue-600 font-bold hover:underline">+ Add Option</button>
                                </div>
                            )}

                            <button type="submit" className="btn-primary w-full mt-4">Post Vibe</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Quest Modal */}
            {showQuestModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="saas-card w-full max-w-lg p-6 space-y-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Side Quest</h2>
                            <button onClick={() => setShowQuestModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white"><X /></button>
                        </div>

                        <form onSubmit={handleCreateQuest} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quest Title</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. Fix the Coffee Machine"
                                    value={questForm.title} onChange={e => setQuestForm({ ...questForm, title: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reward</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. IDR 50k"
                                    value={questForm.reward} onChange={e => setQuestForm({ ...questForm, reward: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
                                <select className="input-field w-full" value={questForm.difficulty} onChange={e => setQuestForm({ ...questForm, difficulty: e.target.value })}>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full bg-amber-400 text-black font-bold py-3 rounded-lg hover:bg-amber-300 transition-all uppercase tracking-wide mt-4 text-sm shadow-amber-400/20 shadow-lg">
                                Create Bounty
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payslip Generator Modal */}
            {payslipUser && (
                <PayslipGenerator
                    user={payslipUser}
                    month={currentDate.getMonth() + 1}
                    year={currentDate.getFullYear()}
                    onClose={() => setPayslipUser(null)}
                />
            )}
        </div>
    );

};

export default AdminDashboard;
