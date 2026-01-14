import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Check, X, Clock, Calendar, Search, Filter, AlertCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { format, differenceInDays } from 'date-fns';

const AdminOvertimes = () => {
    const toast = useToast();
    const [overtimes, setOvertimes] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [calculateSortBy, setCalculateSortBy] = useState('submission'); // 'submission' or 'activity'
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOvertimes();
    }, [calculateSortBy]);

    const fetchOvertimes = async () => {
        try {
            const { data } = await api.get(`/overtimes?sortBy=${calculateSortBy}`);
            setOvertimes(data);
        } catch (error) {
            console.error("Failed to fetch overtimes", error);
        }
    };

    const handleAction = async (id, status) => {
        try {
            await api.put(`/overtimes/${id}`, { status });
            toast.success(`Request ${status}`);
            fetchOvertimes();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const filteredItems = overtimes.filter(item => {
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        const matchesSearch = item.User?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.activity.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const StatusBadge = ({ status }) => {
        const colors = {
            Pending: 'text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-400/10 dark:border-yellow-400/20',
            Approved: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-400/20',
            Rejected: 'text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-400/10 dark:border-red-400/20',
        };
        return (
            <span className={clsx("px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border", colors[status] || colors.Pending)}>
                {status}
            </span>
        );
    };

    const isLate = (activityDate, submissionDate) => {
        if (!activityDate || !submissionDate) return false;
        return differenceInDays(new Date(submissionDate), new Date(activityDate)) > 7;
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground mb-1">Overtime Requests</h1>
                    <p className="text-muted-foreground text-sm">Review and approve staff hours.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">

                    {/* Filter Toggle */}
                    <div className="flex items-center bg-muted/30 rounded-xl p-1 border border-border">
                        <button
                            onClick={() => setCalculateSortBy('submission')}
                            className={clsx("px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2",
                                calculateSortBy === 'submission' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <Calendar size={14} /> Submitted
                        </button>
                        <button
                            onClick={() => setCalculateSortBy('activity')}
                            className={clsx("px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2",
                                calculateSortBy === 'activity' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <Clock size={14} /> Activity
                        </button>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-background border border-input rounded-xl px-4 py-2 pl-9 focus:ring-2 focus:ring-primary outline-none text-foreground placeholder-muted-foreground transition-all text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-background border border-input text-foreground text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary font-bold"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
            </header>

            <div className="grid gap-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                        No overtime requests found matching your filters.
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const late = isLate(item.date, item.createdAt);
                        return (
                            <div key={item.id} className="bg-card text-card-foreground border border-border rounded-xl p-5 flex flex-col gap-4 group hover:border-primary/50 transition-all shadow-sm">
                                {/* User Identity Header */}
                                <div className="flex items-center justify-between border-b border-border pb-3 mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {item.User?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-foreground font-bold text-sm leading-tight">{item.User?.name}</h4>
                                            <p className="text-muted-foreground text-xs font-medium">{item.User?.role} • {item.User?.email}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={item.status} />
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-card-foreground font-bold text-lg">{item.activity}</h4>

                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1 font-mono">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1 text-foreground font-bold"><Calendar size={12} /> {format(new Date(item.date), 'dd MMM yyyy')}</span>
                                                    {item.createdAt && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Submitted: {format(new Date(item.createdAt), 'dd MMM HH:mm')}
                                                        </span>
                                                    )}
                                                </div>

                                                {late && (
                                                    <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 text-[10px] font-bold border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-0.5 rounded-full" title="Submitted > 7 days after activity">
                                                        <AlertTriangle size={10} /> Late Submission
                                                    </div>
                                                )}

                                                <span className="text-muted-foreground/50">|</span>
                                                <span>{item.startTime} - {item.endTime} ({item.hours}h)</span>
                                                <span className="text-muted-foreground/50">|</span>
                                                <span className="text-primary font-bold">Rp {item.payableAmount.toLocaleString('id-ID')}</span>
                                            </div>

                                            {item.description && (
                                                <p className="text-muted-foreground text-xs mt-2 italic max-w-xl border-l-2 border-border pl-3">"{item.description}"</p>
                                            )}
                                        </div>
                                    </div>

                                    {item.status === 'Pending' && (
                                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                            <button onClick={() => handleAction(item.id, 'Approved')} className="flex-1 md:flex-none px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                <Check size={16} /> Approve
                                            </button>
                                            <button onClick={() => handleAction(item.id, 'Rejected')} className="flex-1 md:flex-none px-4 py-2 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center gap-2">
                                                <X size={16} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};

export default AdminOvertimes;
