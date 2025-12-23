import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Check, X, FileText, Calendar, Search, Filter, Download, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

const AdminClaims = () => {
    const [claims, setClaims] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/claims'); // Admin sees all
            setClaims(data);
        } catch (error) {
            console.error("Failed to fetch claims", error);
            toast.error("Failed to fetch claims data.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        try {
            await api.put(`/claims/${id}`, { status });
            toast.success(`Claim ${status} successfully!`);
            fetchClaims();
        } catch (error) {
            toast.error('Action failed. Please try again.');
        }
    };

    const filteredItems = claims.filter(item => {
        const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
        const matchesSearch = item.User?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const StatusBadge = ({ status }) => {
        const colors = {
            Pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            Approved: 'text-lime-400 bg-lime-400/10 border-lime-400/20',
            Rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
            Paid: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        };
        return (
            <span className={clsx("px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border", colors[status] || colors.Pending)}>
                {status}
            </span>
        );
    };

    const [selectedClaim, setSelectedClaim] = useState(null);

    return (
        <div className="space-y-6">
            {/* ... header ... */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Reimbursement Claims</h1>
                    <p className="text-zinc-400 text-sm">Process staff expenses and receipts.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto flex-1 justify-end">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search staff or title..."
                            className="flex-1 w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 pl-9 focus:ring-2 focus:ring-lime-400 outline-none text-white placeholder-zinc-500 transition-all"
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
                {loading ? (
                    // Skeleton Loading State
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 flex flex-col gap-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-20 rounded" />
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex gap-4">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-4 w-64" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-10 w-24 rounded-xl" />
                                    <Skeleton className="h-10 w-24 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl">
                        No claims found matching your filters.
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
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-300 font-bold text-lg">{item.title}</h4>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1 font-mono">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                                            <span>•</span>
                                            <span className="text-lime-400 font-bold">Rp {item.amount.toLocaleString('id-ID')}</span>
                                        </div>
                                        {item.description && (
                                            <p className="text-zinc-500 text-xs mt-2 italic max-w-xl border-l-2 border-zinc-800 pl-3 line-clamp-1">"{item.description}"</p>
                                        )}
                                        <button onClick={() => setSelectedClaim(item)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 mt-2">
                                            <ExternalLink size={12} /> View Details & Proof
                                        </button>
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

            {/* Claim Details Modal */}
            {selectedClaim && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSelectedClaim(null)}>
                    <div className="glass-card w-full max-w-2xl p-0 overflow-hidden animate-in fade-in zoom-in duration-200 border border-zinc-700" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-900/50">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-1">Claim Details</h2>
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                    <span>{selectedClaim.User?.name}</span>
                                    <span>•</span>
                                    <span>{selectedClaim.date}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClaim(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Amount</span>
                                    <p className="text-2xl font-black text-lime-400">Rp {selectedClaim.amount.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</span>
                                    <p className="text-lg font-bold text-white">{selectedClaim.category}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Description</span>
                                <p className="text-zinc-300 bg-zinc-900/30 p-4 rounded-xl border border-white/5 italic">
                                    "{selectedClaim.description || 'No description provided.'}"
                                </p>
                            </div>

                            <div>
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Proof of Payment</span>
                                {selectedClaim.proof ? (
                                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50">
                                        <img
                                            src={`${api.defaults.baseURL}${selectedClaim.proof}`}
                                            alt="Proof"
                                            className="w-full h-auto object-contain max-h-[400px]"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                                        No proof image attached.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-3">
                            {selectedClaim.status === 'Pending' && (
                                <>
                                    <button onClick={() => { handleAction(selectedClaim.id, 'Rejected'); setSelectedClaim(null); }} className="px-4 py-2 bg-zinc-800 text-red-400 font-bold rounded-xl hover:bg-red-400/10 transition-colors">
                                        Reject Claim
                                    </button>
                                    <button onClick={() => { handleAction(selectedClaim.id, 'Approved'); setSelectedClaim(null); }} className="px-6 py-2 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-300 transition-colors shadow-lg shadow-lime-400/20">
                                        Approve Claim
                                    </button>
                                </>
                            )}
                            <button onClick={() => setSelectedClaim(null)} className="px-4 py-2 text-zinc-400 font-bold hover:text-white transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClaims;
