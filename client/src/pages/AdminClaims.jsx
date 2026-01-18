import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Check, X, FileText, Calendar, Search, Filter, Download, ExternalLink, Maximize2, Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { format, differenceInDays } from 'date-fns';

const AdminClaims = () => {
    const [claims, setClaims] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [calculateSortBy, setCalculateSortBy] = useState('submission'); // 'submission' or 'activity'
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchClaims();
    }, [calculateSortBy]); // Refetch when sort changes

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/claims?sortBy=${calculateSortBy}`);
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
        const matchesSearch = (item.User?.name || 'Unknown User').toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

// ... inside map ...

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {(item.User?.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-foreground font-bold text-sm leading-tight">{item.User?.name || 'Unknown User'}</h4>
                                            <p className="text-muted-foreground text-xs font-medium">{item.User?.role || 'N/A'} • {item.User?.email || ''}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={item.status} />
                                </div >

    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                <FileText size={20} />
            </div>
            <div>
                <h4 className="text-card-foreground font-bold text-lg">{item.title}</h4>

                {/* Date & Amount Row */}
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
                    <span className="text-primary font-bold text-sm">Rp {item.amount.toLocaleString('id-ID')}</span>
                </div>

                {item.description && (
                    <p className="text-muted-foreground text-xs mt-2 italic max-w-xl border-l-2 border-border pl-3 line-clamp-1">"{item.description}"</p>
                )}
                <button onClick={() => setSelectedClaim(item)} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 mt-2">
                    <ExternalLink size={12} /> View Details & Proof
                </button>
            </div>
        </div>
        {item.proof && (
            <div className="hidden sm:block ml-4 shrink-0">
                <div
                    className="w-16 h-16 rounded-lg border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-muted group/img relative"
                    onClick={() => setViewingImage(`${api.defaults.baseURL}${item.proof}`)}
                >
                    <img
                        src={`${api.defaults.baseURL}${item.proof}`}
                        alt="Proof Thumbnail"
                        className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-black/40 transition-opacity">
                        <ExternalLink size={12} className="text-white" />
                    </div>
                </div>
            </div>
        )}
    </div>

{
    item.status === 'Pending' && (
        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
            <button onClick={() => handleAction(item.id, 'Approved')} className="flex-1 md:flex-none px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Check size={16} /> Approve
            </button>
            <button onClick={() => handleAction(item.id, 'Rejected')} className="flex-1 md:flex-none px-4 py-2 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center gap-2">
                <X size={16} /> Reject
            </button>
        </div>
    )
}
                            </div >
                        )
                    })
                )}
            </div >

    {/* Claim Details Modal */ }
{
    selectedClaim && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedClaim(null)}>
            <div className="bg-card text-card-foreground w-full max-w-2xl p-0 overflow-hidden animate-in fade-in zoom-in duration-200 border border-border rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border flex justify-between items-start bg-muted/30">
                    <div>
                        <h2 className="text-2xl font-black text-foreground mb-1">Claim Details</h2>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span>{selectedClaim.User?.name}</span>
                            <span>•</span>
                            <span>{selectedClaim.date}</span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedClaim(null)} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</span>
                            <p className="text-2xl font-black text-primary">Rp {selectedClaim.amount.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</span>
                            <p className="text-lg font-bold text-foreground">{selectedClaim.category}</p>
                        </div>
                    </div>

                    <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Description</span>
                        <p className="text-foreground bg-muted/50 p-4 rounded-xl border border-border italic">
                            "{selectedClaim.description || 'No description provided.'}"
                        </p>
                    </div>

                    <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Proof of Payment</span>
                        {selectedClaim.proof ? (
                            <div
                                className="rounded-xl overflow-hidden border border-border bg-muted cursor-zoom-in relative group/proof"
                                onClick={() => setViewingImage(`${api.defaults.baseURL}${selectedClaim.proof}`)}
                            >
                                <img
                                    src={`${api.defaults.baseURL}${selectedClaim.proof}`}
                                    alt="Proof"
                                    className="w-full h-auto object-contain max-h-[400px] hover:scale-[1.02] transition-transform duration-300"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/proof:opacity-100 bg-black/30 transition-all backdrop-blur-[1px]">
                                    <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-md border border-white/20">
                                        <Maximize2 size={12} /> Click to Zoom
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                                No proof image attached.
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                    {selectedClaim.status === 'Pending' && (
                        <>
                            <button onClick={() => { handleAction(selectedClaim.id, 'Rejected'); setSelectedClaim(null); }} className="px-4 py-2 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-colors">
                                Reject Claim
                            </button>
                            <button onClick={() => { handleAction(selectedClaim.id, 'Approved'); setSelectedClaim(null); }} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                Approve Claim
                            </button>
                        </>
                    )}
                    <button onClick={() => setSelectedClaim(null)} className="px-4 py-2 text-muted-foreground font-bold hover:text-foreground transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

{/* Lightbox */ }
{
    viewingImage && (
        <div
            className="fixed inset-0 bg-background/95 backdrop-blur-lg z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setViewingImage(null)}
        >
            <button
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-2 bg-muted rounded-full"
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
    )
}
        </div >
    );
};

export default AdminClaims;
