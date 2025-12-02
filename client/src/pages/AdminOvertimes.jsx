import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Check, X, Clock, Calendar, Search, Filter, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

const AdminOvertimes = () => {
    const [overtimes, setOvertimes] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOvertimes();
    }, []);

    const fetchOvertimes = async () => {
        try {
            const { data } = await api.get('/overtimes'); // Admin sees all
            setOvertimes(data);
        } catch (error) {
            console.error("Failed to fetch overtimes", error);
        }
    };

    const handleAction = async (id, status) => {
        try {
            await api.put(`/overtimes/${id}`, { status });
            fetchOvertimes();
        } catch (error) {
            alert('Action failed');
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
            Pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            Approved: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
            Rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
        };
        return (
            <span className={clsx("px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border", colors[status] || colors.Pending)}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Overtime Requests</h1>
                    <p className="text-zinc-400 text-sm">Review and approve staff hours.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search staff or activity..."
                            className="input-field w-full pl-9 py-2 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-lime-400 font-bold"
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
                    <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl">
                        No overtime requests found matching your filters.
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="glass-card p-5 flex flex-col gap-4 group hover:border-lime-400/30 transition-all">
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
                                <StatusBadge status={item.status} />
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-1">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-300 font-bold text-lg">{item.activity}</h4>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1 font-mono">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                                            <span>•</span>
                                            <span>{item.startTime} - {item.endTime} ({item.hours}h)</span>
                                            <span>•</span>
                                            <span className="text-lime-400 font-bold">Rp {item.payableAmount.toLocaleString('id-ID')}</span>
                                        </div>
                                        {item.description && (
                                            <p className="text-zinc-500 text-xs mt-2 italic max-w-xl border-l-2 border-zinc-800 pl-3">"{item.description}"</p>
                                        )}
                                    </div>
                                </div>

                                {item.status === 'Pending' && (
                                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        <button onClick={() => handleAction(item.id, 'Approved')} className="flex-1 md:flex-none px-4 py-2 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-lime-400/10">
                                            <Check size={16} /> Approve
                                        </button>
                                        <button onClick={() => handleAction(item.id, 'Rejected')} className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-red-400 font-bold rounded-xl hover:bg-red-400/10 transition-colors flex items-center justify-center gap-2">
                                            <X size={16} /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminOvertimes;
