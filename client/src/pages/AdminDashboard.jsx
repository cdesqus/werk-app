import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { DollarSign, Check, X, ChevronLeft, ChevronRight, Megaphone, BarChart2, Plus, Trash2, Sparkles, Zap, Users, Shield } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import clsx from 'clsx';

const AdminDashboard = () => {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState([]);
    const [pendingItems, setPendingItems] = useState([]);

    // Forms
    const [showVibeModal, setShowVibeModal] = useState(false);
    const [vibeForm, setVibeForm] = useState({ type: 'announcement', title: '', content: '', options: ['', ''] });

    const [showQuestModal, setShowQuestModal] = useState(false);
    const [questForm, setQuestForm] = useState({ title: '', reward: '', difficulty: 'Medium' });

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        try {
            const [summaryRes, otRes, claimRes, leaveRes] = await Promise.all([
                api.get(`/admin/summary?month=${month}&year=${year}`),
                api.get(`/overtimes?month=${month}&year=${year}`),
                api.get(`/claims?month=${month}&year=${year}`),
                api.get(`/leaves?month=${month}&year=${year}`)
            ]);
            setSummary(summaryRes.data);

            const pending = [
                ...otRes.data.filter(i => i.status === 'Pending').map(i => ({ ...i, dataType: 'overtime' })),
                ...claimRes.data.filter(i => i.status === 'Pending').map(i => ({ ...i, dataType: 'claim' })),
                ...leaveRes.data.filter(i => i.status === 'Pending').map(i => ({ ...i, dataType: 'leave' }))
            ];
            setPendingItems(pending);
        } catch (err) { console.error(err); }
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
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">HQ Dashboard</h1>
                    <p className="text-zinc-400 font-medium">Command Center</p>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setShowQuestModal(true)} className="btn-secondary flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold transition-all">
                        <Zap size={20} className="text-yellow-400" /> Create Quest
                    </button>
                    <button onClick={() => setShowVibeModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-lime-400 text-black hover:bg-lime-300 transition-all">
                        <Sparkles size={20} /> Post Vibe
                    </button>
                    <div className="flex items-center gap-4 bg-zinc-900 p-2 rounded-2xl border border-zinc-800">
                        <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"><ChevronLeft /></button>
                        <span className="font-bold text-lg min-w-[150px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
                        <button onClick={nextMonth} disabled={currentDate >= new Date()} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-30"><ChevronRight /></button>
                    </div>
                </div>
            </header>

            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 flex flex-col justify-between h-40 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <div className="flex justify-between items-start">
                        <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Total Payroll</span>
                        <DollarSign className="text-lime-400" />
                    </div>
                    <span className="text-4xl font-black text-white tracking-tight">Rp {totalPayable.toLocaleString('id-ID')}</span>
                </div>
                <div className="glass-card p-6 flex flex-col justify-between h-40 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <div className="flex justify-between items-start">
                        <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Pending Approvals</span>
                        <Shield className="text-purple-400" />
                    </div>
                    <span className="text-4xl font-black text-white tracking-tight">{pendingItems.length}</span>
                </div>
                <div className="glass-card p-6 flex flex-col justify-between h-40 bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
                    <div className="flex justify-between items-start">
                        <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Active Staff</span>
                        <Users className="text-blue-400" />
                    </div>
                    <span className="text-4xl font-black text-white tracking-tight">{summary.length}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Action Center */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="text-yellow-400" /> Action Center</h2>
                    {pendingItems.length === 0 ? (
                        <div className="glass-card p-10 text-center text-zinc-500 border-dashed border-2 border-zinc-800">All caught up! No pending requests.</div>
                    ) : (
                        <div className="space-y-4">
                            {pendingItems.map((item, idx) => (
                                <div key={idx} className="glass-card p-5 flex flex-col gap-3 group hover:border-lime-400/30 transition-colors animate-in fade-in slide-in-from-bottom-2">
                                    {/* User Identity Header */}
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center text-black font-bold text-xs shadow-lg shadow-lime-400/20">
                                                {item.User?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm leading-tight">{item.User?.name}</h4>
                                                <p className="text-zinc-500 text-xs font-medium">{item.User?.role} • {item.User?.email}</p>
                                            </div>
                                        </div>
                                        <span className={clsx("text-xs font-bold uppercase px-2 py-0.5 rounded",
                                            item.dataType === 'overtime' ? "bg-blue-500/20 text-blue-400" :
                                                item.dataType === 'claim' ? "bg-purple-500/20 text-purple-400" : "bg-emerald-500/20 text-emerald-400")}>
                                            {item.dataType}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-white text-lg mb-1">
                                                {item.dataType === 'overtime' ? item.activity : item.dataType === 'claim' ? item.title : 'Leave Request'}
                                            </h4>
                                            <p className="text-zinc-500 text-sm">
                                                {item.dataType === 'overtime' ? `${item.startTime} - ${item.endTime} (${item.hours} hrs) • Rp ${item.payableAmount.toLocaleString('id-ID')}` :
                                                    item.dataType === 'claim' ? `Rp ${item.amount.toLocaleString('id-ID')}` : `${item.days} days`}
                                            </p>
                                            {item.dataType === 'leave' && <p className="text-zinc-500 text-xs mt-2 italic">"{item.reason}"</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAction(item.dataType, item.id, 'Approved')} className="p-3 bg-lime-400/10 text-lime-400 rounded-xl hover:bg-lime-400 hover:text-black transition-all"><Check size={20} /></button>
                                            <button onClick={() => handleAction(item.dataType, item.id, 'Rejected')} className="p-3 bg-red-400/10 text-red-400 rounded-xl hover:bg-red-400 hover:text-black transition-all"><X size={20} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payroll Summary */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><DollarSign className="text-lime-400" /> Payroll Estimate</h2>
                    <div className="glass-card overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-bold">Staff</th>
                                    <th className="p-4 font-bold text-right">Overtime</th>
                                    <th className="p-4 font-bold text-right">Claims</th>
                                    <th className="p-4 font-bold text-right text-white">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {summary.map(user => (
                                    <tr key={user.userId} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold text-white">{user.name}</td>
                                        <td className="p-4 text-right text-zinc-400 font-medium">Rp {user.overtimeTotal.toLocaleString('id-ID')}</td>
                                        <td className="p-4 text-right text-zinc-400 font-medium">Rp {user.claimTotal.toLocaleString('id-ID')}</td>
                                        <td className="p-4 text-right font-black text-lime-400">Rp {user.totalPayable.toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Post Vibe Modal */}
            {showVibeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card w-full max-w-lg p-8 space-y-6 animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-white">Post Vibe Check</h2>
                            <button onClick={() => setShowVibeModal(false)} className="text-zinc-400 hover:text-white"><X /></button>
                        </div>

                        <form onSubmit={handlePostVibe} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setVibeForm({ ...vibeForm, type: 'announcement' })}
                                    className={clsx("p-3 rounded-xl font-bold border transition-all", vibeForm.type === 'announcement' ? "bg-lime-400 text-black border-lime-400" : "bg-zinc-900 border-zinc-700 text-zinc-400")}>
                                    Announcement
                                </button>
                                <button type="button" onClick={() => setVibeForm({ ...vibeForm, type: 'poll' })}
                                    className={clsx("p-3 rounded-xl font-bold border transition-all", vibeForm.type === 'poll' ? "bg-purple-500 text-white border-purple-500" : "bg-zinc-900 border-zinc-700 text-zinc-400")}>
                                    Poll
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Title</label>
                                <input type="text" required className="input-field w-full"
                                    value={vibeForm.title} onChange={e => setVibeForm({ ...vibeForm, title: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Content / Question</label>
                                <textarea required className="input-field w-full h-24"
                                    value={vibeForm.content} onChange={e => setVibeForm({ ...vibeForm, content: e.target.value })} />
                            </div>

                            {vibeForm.type === 'poll' && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Options</label>
                                    {vibeForm.options.map((opt, idx) => (
                                        <input key={idx} type="text" placeholder={`Option ${idx + 1}`} className="input-field w-full"
                                            value={opt} onChange={e => updateOption(idx, e.target.value)} />
                                    ))}
                                    <button type="button" onClick={addOption} className="text-sm text-lime-400 font-bold hover:underline">+ Add Option</button>
                                </div>
                            )}

                            <button type="submit" className="btn-primary w-full mt-4">Post Vibe</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Quest Modal */}
            {showQuestModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card w-full max-w-lg p-8 space-y-6 animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-white">Create Side Quest</h2>
                            <button onClick={() => setShowQuestModal(false)} className="text-zinc-400 hover:text-white"><X /></button>
                        </div>

                        <form onSubmit={handleCreateQuest} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quest Title</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. Fix the Coffee Machine"
                                    value={questForm.title} onChange={e => setQuestForm({ ...questForm, title: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reward</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. IDR 50k"
                                    value={questForm.reward} onChange={e => setQuestForm({ ...questForm, reward: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Difficulty</label>
                                <select className="input-field w-full" value={questForm.difficulty} onChange={e => setQuestForm({ ...questForm, difficulty: e.target.value })}>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full bg-yellow-400 text-black font-black py-4 rounded-xl hover:bg-yellow-300 transition-all uppercase tracking-wide mt-4">
                                Create Bounty
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
