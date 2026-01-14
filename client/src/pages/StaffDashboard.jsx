import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import DateInput from '../components/ui/DateInput';
import { Clock, FileText, History, Palmtree, Sparkles, Upload, Megaphone, BarChart2, Zap, CheckCircle, Circle, Plus, X, Calendar, Pencil, Trash2, Camera, CheckCircle2, Lock, Monitor, Moon, Sun, Settings } from 'lucide-react';
import { format, differenceInMinutes, parse, isSunday } from 'date-fns';
import clsx from 'clsx';

const TimePicker = ({ label, value, onChange }) => {
    const parseTime = (timeStr) => {
        if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        let hour = h % 12;
        if (hour === 0) hour = 12;
        return {
            hour: hour.toString().padStart(2, '0'),
            minute: m.toString().padStart(2, '0'),
            period
        };
    };

    const { hour, minute, period } = parseTime(value);

    const handleChange = (field, newVal) => {
        let newHour = field === 'hour' ? newVal : hour;
        let newMinute = field === 'minute' ? newVal : minute;
        let newPeriod = field === 'period' ? newVal : period;

        let h = parseInt(newHour, 10);
        if (newPeriod === 'PM' && h !== 12) h += 12;
        if (newPeriod === 'AM' && h === 12) h = 0;

        const timeStr = `${h.toString().padStart(2, '0')}:${newMinute}`;
        onChange(timeStr);
    };

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <select
                        className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-2 py-2 focus:ring-2 focus:ring-lime-400 outline-none font-bold text-center text-sm"
                        value={hour}
                        onChange={(e) => handleChange('hour', e.target.value)}
                    >
                        {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>
                <span className="text-zinc-400 dark:text-zinc-600 font-bold self-center">:</span>
                <div className="relative flex-1">
                    <select
                        className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-2 py-2 focus:ring-2 focus:ring-lime-400 outline-none font-bold text-center text-sm"
                        value={minute}
                        onChange={(e) => handleChange('minute', e.target.value)}
                    >
                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="relative flex-1">
                    <select
                        className={clsx("w-full appearance-none border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-2 focus:ring-2 focus:ring-lime-400 outline-none font-black text-center transition-colors text-sm",
                            period === 'AM' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" : "bg-lime-400 text-black"
                        )}
                        value={period}
                        onChange={(e) => handleChange('period', e.target.value)}
                    >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

const StaffDashboard = () => {
    // Force re-render verification
    console.log("StaffDashboard Rendering");
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('overtime');

    // Modals
    const [showOtModal, setShowOtModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null });

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);

    // Forms
    const [otForm, setOtForm] = useState({ date: '', startTime: '', endTime: '', activity: '', customer: '', description: '' });
    const [claimForm, setClaimForm] = useState({ date: '', category: 'Transport', title: '', amount: '', proof: null });
    const [leaveForm, setLeaveForm] = useState({ type: 'annual', startDate: '', endDate: '', reason: '' });
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, level: 'Low' });

    // Data
    const [history, setHistory] = useState([]);
    const [feeds, setFeeds] = useState([]);
    const [quests, setQuests] = useState([]);
    const [leaveQuota, setLeaveQuota] = useState(user?.leaveQuota || 0);
    const [stats, setStats] = useState({ earned: 0, pendingClaims: 0 });
    const [loading, setLoading] = useState(false);

    // Calculated OT Duration
    const [otDuration, setOtDuration] = useState(0);
    const [isHoliday, setIsHoliday] = useState(false);

    // Holidays (Simplified for now - checking if Sunday)
    useEffect(() => {
        const date = new Date();
        setIsHoliday(isSunday(date));
    }, []);

    // Calculate OT Duration
    useEffect(() => {
        if (otForm.startTime && otForm.endTime) {
            const start = parse(otForm.startTime, 'HH:mm', new Date());
            const end = parse(otForm.endTime, 'HH:mm', new Date());

            // Calculate difference in minutes
            const diff = differenceInMinutes(end, start);

            // Update duration if valid (positive), otherwise 0
            if (diff > 0) {
                setOtDuration(diff / 60);
            } else {
                setOtDuration(0);
            }
        } else {
            setOtDuration(0);
        }
    }, [otForm.startTime, otForm.endTime]);

    // FETCH DATA
    const fetchHistory = async () => {
        try {
            const [otRes, claimRes, leaveRes] = await Promise.all([
                api.get('/overtimes?personal=true'),
                api.get('/claims?personal=true'),
                api.get('/leaves?personal=true')
            ]);

            const otData = otRes.data.map(i => ({ ...i, dataType: 'overtime' }));
            const claimData = claimRes.data.map(i => ({ ...i, dataType: 'claim' }));
            const leaveData = leaveRes.data.map(i => ({ ...i, dataType: 'leave' }));

            // Calculate Stats
            // 1. Earned: Sum of Approved Overtimes * Hourly Rate (Assume 20k/hr if not in response)
            // Ideally backend sends 'amount', but we can estimate or sum 'totalRate' if present. 
            // We'll trust the user's dashboard logic, assuming 'hours' * 20000 roughly if field missing.
            const totalEarned = otData
                .filter(ot => ot.status === 'Approved')
                .reduce((acc, curr) => acc + (curr.totalRate || (parseFloat(curr.hours) * 20000)), 0);

            const pendingClaims = claimData.filter(c => c.status === 'Pending').length;

            setStats({ earned: totalEarned, pendingClaims });
            setHistory([...otData, ...claimData, ...leaveData].sort((a, b) => new Date(b.date || b.startDate) - new Date(a.date || a.startDate)));
        } catch (err) {
            console.error("Failed to fetch history", err);
            // toast.error("Failed to load history."); // Optional, maybe too noisy on mount
        }
    };

    useEffect(() => {
        fetchHistory();
        fetchFeeds();
        fetchQuests();
    }, []);

    // Password Logic
    const calculateStrength = (password) => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) score++;
        if (password.match(/\d/)) score++;
        if (password.match(/[^a-zA-Z\d]/)) score++;

        let level = 'Low';
        if (score >= 3 && password.length >= 10) level = 'High';
        else if (score >= 2 && password.length >= 8) level = 'Medium';
        else level = 'Low';

        setPasswordStrength({ score: level === 'High' ? 3 : level === 'Medium' ? 2 : 1, level });
    };

    const generatePassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let password = "";
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPasswordForm({ ...passwordForm, new: password, confirm: password });
        calculateStrength(password);
        toast.success("Strong password generated!");
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            toast.error("New passwords do not match.");
            return;
        }
        if (passwordStrength.level === 'Low') {
            toast.error("Password is too weak. Please use a stronger password.");
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwordForm.current,
                newPassword: passwordForm.new
            });
            toast.success("Password updated successfully!");
            setPasswordForm({ current: '', new: '', confirm: '' });
            setPasswordStrength({ score: 0, level: 'Low' });
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    const fetchFeeds = async () => {
        try {
            const res = await api.get('/vibes');
            setFeeds(res.data);
        } catch (err) { console.error("Failed to fetch vibes", err); }
    };

    const fetchQuests = async () => {
        try {
            const res = await api.get('/quests');
            setQuests(res.data);
        } catch (err) { console.error("Failed to fetch quests", err); }
    };

    const handleDelete = (type, id) => {
        setConfirmModal({ isOpen: true, type, id });
    };

    const confirmDelete = async () => {
        const { type, id } = confirmModal;
        try {
            const endpoint = type === 'overtime' ? 'overtimes' : type === 'claim' ? 'claims' : 'leaves';
            await api.delete(`/${endpoint}/${id}`);
            toast.success('Item deleted successfully');
            fetchHistory();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Delete failed');
        } finally {
            setConfirmModal({ isOpen: false, type: null, id: null });
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        if (item.dataType === 'overtime') {
            setOtForm({
                date: item.date,
                startTime: item.startTime,
                endTime: item.endTime,
                activity: item.activity,
                customer: item.customer,
                description: item.description
            });
            setShowOtModal(true);
        } else if (item.dataType === 'claim') {
            setClaimForm({
                date: item.date,
                category: item.category,
                title: item.title,
                amount: item.amount,
                proof: null // Reset proof as we can't pre-fill file input
            });
            setShowClaimModal(true);
        } else if (item.dataType === 'leave') {
            setLeaveForm({
                type: item.type,
                startDate: item.startDate,
                endDate: item.endDate,
                reason: item.reason
            });
            setShowLeaveModal(true);
        }
    };

    const resetForms = () => {
        setEditingId(null);
        setOtForm({ date: '', startTime: '', endTime: '', activity: '', customer: '', description: '' });
        setClaimForm({ date: '', category: 'Transport', title: '', amount: '', proof: null });
        setLeaveForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
    };

    const handleOtSubmit = async (e) => {
        e.preventDefault();
        if (otDuration <= 0) {
            toast.error('End time must be after start time.');
            return;
        }
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/overtimes/${editingId}`, { ...otForm, hours: otDuration });
                toast.success('Overtime updated!');
            } else {
                await api.post('/overtimes', { ...otForm, hours: otDuration });
                toast.success('Overtime submitted!');
            }
            resetForms();
            setShowOtModal(false);
            fetchHistory();
        } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
        setLoading(false);
    };

    const handleClaimSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingId) {
                // Edit Mode: Send JSON as backend PUT doesn't support file update in this version easily
                // Filter out File object if present, only send other fields
                const { proof, ...rest } = claimForm;
                await api.put(`/claims/${editingId}`, rest);
                toast.success('Claim updated!');
            } else {
                // Create Mode: Send FormData
                const formData = new FormData();
                Object.keys(claimForm).forEach(key => {
                    if (claimForm[key] !== null) formData.append(key, claimForm[key]);
                });

                await api.post('/claims', formData, {
                    // headers: { 'Content-Type': 'multipart/form-data' }, // REMOVED: Let browser set boundary
                    timeout: 30000
                });
                toast.success('Claim submitted!');
            }
            resetForms();
            setShowClaimModal(false);
            fetchHistory();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to submit claim. Potentially file too large.');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/leaves/${editingId}`, leaveForm);
                toast.success('Leave updated!');
            } else {
                await api.post('/leaves', leaveForm);
                toast.success('Leave requested!');
            }
            resetForms();
            setShowLeaveModal(false);
            fetchHistory();
        } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
        setLoading(false);
    };

    const handleVote = async (feedId, optionId) => {
        try {
            await api.post(`/vibes/${feedId}/vote`, { optionId });
            fetchFeeds();
        } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    };

    const handleAcceptQuest = async (id) => {
        try {
            await api.put(`/quests/${id}/accept`);
            fetchQuests();
            toast.success('Quest Accepted! Good luck.');
        } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
    };

    const tabs = [
        { id: 'overtime', label: 'My Hustle', icon: Clock },
        { id: 'claim', label: 'Claims', icon: FileText },
        { id: 'leave', label: 'Touch Grass', icon: Palmtree },
        { id: 'quests', label: 'Side Quests', icon: Zap },
        { id: 'vibe', label: 'Vibe Check', icon: Sparkles },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const formatDuration = (decimalHours) => {
        const totalMinutes = Math.round(Number(decimalHours) * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    };

    const renderHistoryList = (type) => {
        const filtered = history.filter(i => i.dataType === type);
        if (filtered.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="text-zinc-600" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No hustles yet.</h3>
                    <p className="text-zinc-500">Start grinding to see your history here.</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
                {filtered.map((item, idx) => (
                    <div key={idx} className="glass-card p-0 overflow-hidden group hover:border-lime-400/50 transition-all relative dark:bg-black/40 bg-white border border-zinc-200 dark:border-zinc-800">
                        <div className="p-6">
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                {format(new Date(item.date || item.startDate), 'EEEE, MMM d')}
                            </p>
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 break-words pr-16 bg-transparent">
                                {item.dataType === 'overtime' ? item.activity : item.dataType === 'claim' ? item.title : 'Leave Request'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-400">
                                {item.dataType === 'overtime' && (
                                    <>
                                        <Clock size={16} className="text-lime-400 shrink-0" />
                                        <span>{item.startTime} - {item.endTime} ({formatDuration(item.hours)})</span>
                                    </>
                                )}
                                {item.dataType === 'claim' && (
                                    <>
                                        <FileText size={16} className="text-purple-400 shrink-0" />
                                        <span>Rp {item.amount.toLocaleString('id-ID')}</span>
                                    </>
                                )}
                                {item.dataType === 'leave' && (
                                    <>
                                        <Palmtree size={16} className="text-emerald-400 shrink-0" />
                                        <span>{item.days} Days ({item.type})</span>
                                    </>
                                )}
                            </div>
                            {item.dataType === 'claim' && item.proof && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Proof Attached</p>
                                    <div
                                        className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden cursor-zoom-in group/img"
                                        onClick={() => setViewingImage(`${api.defaults.baseURL}${item.proof}`)}
                                    >
                                        <img
                                            src={`${api.defaults.baseURL}${item.proof}`}
                                            alt="Proof of Payment"
                                            className="w-full h-full object-cover opacity-70 group-hover/img:opacity-100 transition-all duration-300"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/40 transition-opacity backdrop-blur-[2px]">
                                            <span className="text-xs font-bold text-white flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/20">
                                                <Camera size={14} /> View Proof
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute top-0 right-0 p-4 flex gap-2 z-10">
                            {item.status === 'Pending' && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-200 dark:hover:bg-white hover:text-black transition-colors cursor-pointer">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.dataType, item.id); }} className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                            <StatusBadge status={item.status} />
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Bento Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 flex flex-col justify-between h-32 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 bg-white border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Total Earned (OT)</span>
                    <span className="text-3xl font-black text-lime-600 dark:text-lime-400">Rp {stats.earned.toLocaleString('id-ID')}</span>
                </div>
                <div className="glass-card p-6 flex flex-col justify-between h-32 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 bg-white border border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Pending Claims</span>
                    <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats.pendingClaims}</span>
                </div>
                <div className="glass-card p-6 flex items-center justify-between h-32 dark:bg-gradient-to-br dark:from-zinc-900 dark:to-zinc-950 bg-white border border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col justify-between h-full">
                        <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">Leave Quota</span>
                        <span className="text-3xl font-black text-zinc-900 dark:text-white">{leaveQuota} <span className="text-sm text-zinc-500">Days</span></span>
                    </div>
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-lime-400"
                                strokeDasharray={2 * Math.PI * 28}
                                strokeDashoffset={2 * Math.PI * 28 * (1 - (leaveQuota / 12))}
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm border",
                            activeTab === tab.id
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                                : "bg-zinc-100 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {/* Overtime Tab */}
                {activeTab === 'overtime' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white">My Hustle History</h2>
                            <button onClick={() => { resetForms(); setShowOtModal(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-lime-400/20">
                                <Plus size={20} /> New Hustle
                            </button>
                        </div>
                        {renderHistoryList('overtime')}
                    </div>
                )}

                {/* Claims Tab */}
                {activeTab === 'claim' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white">Claims History</h2>
                            <button onClick={() => { resetForms(); setShowClaimModal(true); }} className="btn-secondary flex items-center gap-2 shadow-lg shadow-purple-500/20">
                                <Plus size={20} /> New Claim
                            </button>
                        </div>
                        {renderHistoryList('claim')}
                    </div>
                )}

                {/* Leaves Tab */}
                {activeTab === 'leave' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white">Leave History</h2>
                            <button onClick={() => { resetForms(); setShowLeaveModal(true); }} className="bg-emerald-500 text-black font-bold py-3 px-6 rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                                <Plus size={20} /> Request Leave
                            </button>
                        </div>
                        {renderHistoryList('leave')}
                    </div>
                )}

                {/* Quests Tab */}
                {activeTab === 'quests' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                        {quests.length === 0 && <p className="text-zinc-500 col-span-2 text-center py-10">No active bounties. Check back later.</p>}
                        {quests.map(quest => (
                            <div key={quest.id} className="glass-card p-6 border border-zinc-800 relative overflow-hidden group hover:border-lime-400/50 transition-all">
                                <div className="absolute top-0 right-0 p-2">
                                    <span className={clsx("text-xs font-bold px-2 py-1 rounded uppercase",
                                        quest.difficulty === 'Easy' ? "bg-green-500/20 text-green-400" :
                                            quest.difficulty === 'Medium' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                                    )}>{quest.difficulty}</span>
                                </div>
                                <h3 className="text-xl font-black text-white mb-1">{quest.title}</h3>
                                <p className="text-lime-400 font-bold text-lg mb-4">Reward: {quest.reward}</p>

                                {quest.status === 'Open' ? (
                                    <button onClick={() => handleAcceptQuest(quest.id)} className="w-full py-3 bg-zinc-800 hover:bg-white hover:text-black rounded-xl font-bold transition-colors">
                                        Accept Quest
                                    </button>
                                ) : (
                                    <div className="w-full py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl font-bold text-zinc-500 text-center flex items-center justify-center gap-2">
                                        {quest.status === 'Completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                                        {quest.status}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Vibe Tab */}
                {activeTab === 'vibe' && (
                    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {feeds.length === 0 && <p className="text-zinc-500 text-center py-10">No vibes yet. Stay tuned!</p>}
                        {feeds.map(feed => (
                            <div key={feed.id} className="glass-card p-6 border-l-4 border-l-lime-400">
                                <div className="flex items-center gap-3 mb-4">
                                    {feed.type === 'announcement' ? <Megaphone className="text-lime-400" /> : <BarChart2 className="text-purple-400" />}
                                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{feed.type}</span>
                                    <span className="text-xs text-zinc-600 ml-auto">{format(new Date(feed.createdAt), 'MMM d, h:mm a')}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{feed.title}</h3>
                                <p className="text-zinc-300 mb-6 whitespace-pre-wrap">{feed.content}</p>

                                {feed.type === 'poll' && (
                                    <div className="space-y-3">
                                        {feed.options.map(opt => {
                                            const percent = feed.totalVotes > 0 ? Math.round((opt.voteCount / feed.totalVotes) * 100) : 0;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => !feed.hasVoted && handleVote(feed.id, opt.id)}
                                                    disabled={feed.hasVoted}
                                                    className="w-full relative h-12 rounded-xl bg-zinc-800 overflow-hidden group transition-all hover:bg-zinc-700 disabled:cursor-default"
                                                >
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-lime-400/20 transition-all duration-500"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                                                        <span className="font-medium text-white">{opt.label}</span>
                                                        {feed.hasVoted && <span className="font-bold text-lime-400">{percent}%</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        <p className="text-xs text-zinc-500 text-center mt-2">{feed.totalVotes} votes • {feed.hasVoted ? 'You voted' : 'Tap to vote'}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="max-w-xl mx-auto glass-card p-8 animate-in fade-in slide-in-from-bottom-4 space-y-8">

                        <div>
                            <h2 className="text-2xl font-black text-white mb-6">Appearance</h2>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setTheme('system')}
                                    className={clsx("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                        theme === 'system'
                                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg"
                                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    <Monitor size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">System</span>
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={clsx("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                        theme === 'light'
                                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg"
                                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    <Sun size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Light</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={clsx("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                        theme === 'dark'
                                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-lg"
                                            : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    <Moon size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Dark</span>
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-zinc-200 dark:border-white/5 pt-8">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-6">Security</h2>

                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Current Password</label>
                                    <input
                                        type="password"
                                        className="input-field w-full bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-black dark:text-white"
                                        value={passwordForm.current}
                                        onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Password</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={clsx("input-field w-full bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-black dark:text-white",
                                                passwordStrength.level === 'High' ? 'border-lime-400 focus:ring-lime-400' :
                                                    passwordStrength.level === 'Medium' ? 'border-yellow-400 focus:ring-yellow-400' :
                                                        passwordStrength.level === 'Low' && passwordForm.new.length > 0 ? 'border-red-400 focus:ring-red-400' : ''
                                            )}
                                            value={passwordForm.new}
                                            onChange={e => {
                                                setPasswordForm({ ...passwordForm, new: e.target.value });
                                                calculateStrength(e.target.value);
                                            }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={generatePassword}
                                            className="absolute right-2 top-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white hover:text-black transition-colors text-xs font-bold flex items-center gap-1"
                                            title="Generate Strong Password"
                                        >
                                            <Sparkles size={12} /> Generate
                                        </button>
                                    </div>

                                    {/* Strength Meter */}
                                    {passwordForm.new && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1 h-1 mt-2">
                                                <div className={clsx("flex-1 rounded-full", passwordStrength.score >= 1 ? "bg-red-400" : "bg-zinc-800")}></div>
                                                <div className={clsx("flex-1 rounded-full", passwordStrength.score >= 2 ? "bg-yellow-400" : "bg-zinc-800")}></div>
                                                <div className={clsx("flex-1 rounded-full", passwordStrength.score >= 3 ? "bg-lime-400" : "bg-zinc-800")}></div>
                                            </div>
                                            <p className={clsx("text-xs font-bold text-right",
                                                passwordStrength.level === 'High' ? "text-lime-400" :
                                                    passwordStrength.level === 'Medium' ? "text-yellow-400" : "text-red-400"
                                            )}>
                                                Strength: {passwordStrength.level}
                                            </p>
                                            {passwordStrength.level === 'Low' && (
                                                <p className="text-[10px] text-red-400 mt-1">
                                                    Password must be at least 8 chars and contain letters & numbers.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="input-field w-full bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-black dark:text-white"
                                        value={passwordForm.confirm}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || passwordStrength.score < 2}
                                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}

            {/* Overtime Modal */}
            {showOtModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <button onClick={() => setShowOtModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-black text-white mb-6">{editingId ? 'Edit Overtime' : 'Log Overtime'}</h2>
                        <form onSubmit={handleOtSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</label>
                                <DateInput required className="w-full"
                                    value={otForm.date} onChange={e => setOtForm({ ...otForm, date: e.target.value })} />
                                {isHoliday && (
                                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold mt-1">
                                        <Calendar size={14} />
                                        <span>🇮🇩 National Holiday / Sunday</span>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TimePicker
                                    label="Start Time"
                                    value={otForm.startTime}
                                    onChange={val => setOtForm(prev => ({ ...prev, startTime: val }))}
                                />
                                <TimePicker
                                    label="End Time"
                                    value={otForm.endTime}
                                    onChange={val => setOtForm(prev => ({ ...prev, endTime: val }))}
                                />
                            </div>

                            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Duration</span>
                                    <span className="text-white font-bold">{formatDuration(otDuration)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Customer</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. Client X"
                                    value={otForm.customer} onChange={e => setOtForm({ ...otForm, customer: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Activity</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. Bug Fixing"
                                    value={otForm.activity} onChange={e => setOtForm({ ...otForm, activity: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                                <textarea className="input-field w-full h-24" placeholder="Details..."
                                    value={otForm.description} onChange={e => setOtForm({ ...otForm, description: e.target.value })} />
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                                {loading ? (editingId ? 'Updating...' : 'Submitting...') : (editingId ? 'Update Overtime' : 'Submit Overtime')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Claim Modal */}
            {showClaimModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <button onClick={() => setShowClaimModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-black text-white mb-6">{editingId ? 'Edit Claim' : 'Submit Claim'}</h2>
                        <form onSubmit={handleClaimSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</label>
                                    <DateInput required className="w-full"
                                        value={claimForm.date} onChange={e => setClaimForm({ ...claimForm, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</label>
                                    <input type="number" required className="input-field w-full"
                                        value={claimForm.amount} onChange={e => setClaimForm({ ...claimForm, amount: e.target.value })} />
                                    {claimForm.amount && (
                                        <p className="text-xs text-lime-400 font-bold mt-1 text-right">
                                            Rp {Number(claimForm.amount).toLocaleString('id-ID')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</label>
                                <select className="input-field w-full" value={claimForm.category} onChange={e => setClaimForm({ ...claimForm, category: e.target.value })}>
                                    <option value="Transport">Transport</option>
                                    <option value="Medical">Medical</option>
                                    <option value="Food">Food</option>
                                    <option value="Subscription">Subscription</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Title</label>
                                <input type="text" required className="input-field w-full" placeholder="e.g. Grab to Client"
                                    value={claimForm.title} onChange={e => setClaimForm({ ...claimForm, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Proof</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-4 text-center hover:border-lime-400 transition-colors cursor-pointer relative bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                                        <input type="file" accept=".jpg, .jpeg, .png" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                                                if (!validTypes.includes(file.type)) {
                                                    toast.error('Only JPG and PNG files are allowed.');
                                                    e.target.value = null;
                                                    return;
                                                }
                                                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                                    toast.error('File size too large. Max 5MB.');
                                                    e.target.value = null;
                                                    return;
                                                }
                                                setClaimForm({ ...claimForm, proof: file });
                                            }
                                        }} />
                                        <Camera className="text-zinc-400" />
                                        <span className="text-xs font-bold text-zinc-400">Take Photo</span>
                                    </div>
                                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-4 text-center hover:border-lime-400 transition-colors cursor-pointer relative bg-zinc-900/50 flex flex-col items-center justify-center gap-2">
                                        <input type="file" accept=".jpg, .jpeg, .png" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                                                if (!validTypes.includes(file.type)) {
                                                    toast.error('Only JPG and PNG files are allowed.');
                                                    e.target.value = null;
                                                    return;
                                                }
                                                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                                                    toast.error('File size too large. Max 5MB.');
                                                    e.target.value = null;
                                                    return;
                                                }
                                                setClaimForm({ ...claimForm, proof: file });
                                            }
                                        }} />
                                        <Upload className="text-zinc-400" />
                                        <span className="text-xs font-bold text-zinc-400">Upload File</span>
                                    </div>
                                </div>
                                {claimForm.proof && (
                                    <div className="flex items-center gap-2 text-sm text-lime-400 bg-lime-400/10 p-2 rounded-lg">
                                        <CheckCircle2 size={16} />
                                        <span className="truncate">{claimForm.proof.name}</span>
                                    </div>
                                )}
                            </div>
                            <button type="submit" disabled={loading} className="btn-secondary w-full mt-4">
                                {loading ? (editingId ? 'Updating...' : 'Submitting...') : (editingId ? 'Update Claim' : 'Submit Claim')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Leave Modal */}
            {showLeaveModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <button onClick={() => setShowLeaveModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-black text-white mb-6">{editingId ? 'Edit Leave' : 'Request Leave'}</h2>
                        <form onSubmit={handleLeaveSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</label>
                                <select className="input-field w-full" value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                                    <option value="annual">Annual Leave</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="unpaid">Unpaid Leave</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Start Date</label>
                                    <DateInput required className="w-full"
                                        value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">End Date</label>
                                    <DateInput required className="w-full"
                                        value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reason</label>
                                <textarea className="input-field w-full h-24" placeholder="Why do you need to touch grass?"
                                    value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                            </div>
                            <button type="submit" disabled={loading} className="bg-emerald-500 text-black font-bold py-3 px-6 rounded-xl hover:bg-emerald-400 transition-colors w-full mt-4">
                                {loading ? (editingId ? 'Updating...' : 'Requesting...') : (editingId ? 'Update Leave' : 'Request Leave')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: null, id: null })}
                onConfirm={confirmDelete}
                title="Delete Item?"
                message="This action cannot be undone. Are you sure you want to proceed?"
                confirmText="Delete"
                isDanger={true}
            />



            {/* Lightbox */}
            {viewingImage && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-lg z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setViewingImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 bg-black/50 rounded-full"
                        onClick={() => setViewingImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={viewingImage}
                        alt="Full Size Proof"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200"
                    />
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const colors = {
        Pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        Approved: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
        Rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
        Assigned: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        Completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    };
    return (
        <span className={clsx("px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider", colors[status] || colors.Pending)}>
            {status}
        </span>
    );
};

export default StaffDashboard;
