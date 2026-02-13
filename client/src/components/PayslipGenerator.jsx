import { useState, useEffect } from 'react';
import api from '../utils/api';
import { X, Plus, Trash2, RefreshCw, Send, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const PayslipGenerator = ({ user, month, year, onClose }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [adjustments, setAdjustments] = useState([]);

    // New Adjustment Form State
    const [newAdj, setNewAdj] = useState({ label: '', amount: '', type: 'earning' });

    useEffect(() => {
        if (user) {
            fetchPreview();
        }
    }, [user]);

    const fetchPreview = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const payload = {
                userId: user.userId || user.id, // Handle different user object structures
                month,
                year,
                adjustments: adjustments.map(a => ({
                    ...a,
                    amount: parseInt(a.amount) // Ensure integer
                }))
            };
            const { data } = await api.post('/admin/payslip/preview', payload);
            setPreviewHtml(data.html);
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate preview');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdjustment = () => {
        if (!newAdj.label || !newAdj.amount) return;
        setAdjustments([...adjustments, { ...newAdj }]);
        setNewAdj({ label: '', amount: '', type: 'earning' }); // Reset form
    };

    const removeAdjustment = (index) => {
        const newList = [...adjustments];
        newList.splice(index, 1);
        setAdjustments(newList);
    };

    const handleSend = async () => {
        if (!confirm(`Generate and email payslip to ${user.name}? This action cannot be undone.`)) return;

        setSending(true);
        try {
            const payload = {
                userId: user.userId || user.id,
                month,
                year,
                adjustments: adjustments.map(a => ({
                    ...a,
                    amount: parseInt(a.amount)
                }))
            };
            await api.post('/admin/payslip/send', payload);
            toast.success(`Payslip sent to ${user.email}`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to send payslip');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">

                {/* Left Panel: Controls */}
                <div className="w-full md:w-1/3 flex flex-col border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
                    <div className="p-6 border-b border-slate-200 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-1">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="text-emerald-500" /> Payslip Generator
                            </h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Pre-flight check for {user.name} ({month}/{year})
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Adjustments List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Manual Adjustments</h3>
                            </div>

                            {adjustments.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-lg text-slate-400 text-sm">
                                    No manual adjustments added.
                                </div>
                            )}

                            {adjustments.map((adj, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white dark:bg-zinc-800 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-sm">
                                    <div className={`w-2 h-2 rounded-full ${adj.type === 'earning' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{adj.label}</div>
                                        <div className="text-xs text-slate-500">Rp {parseInt(adj.amount).toLocaleString('id-ID')}</div>
                                    </div>
                                    <button onClick={() => removeAdjustment(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add New Adjustment Form */}
                        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-3 shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">New Entry</div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setNewAdj({ ...newAdj, type: 'earning' })}
                                    className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${newAdj.type === 'earning'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-zinc-900 dark:border-zinc-700'}`}
                                >
                                    + Earning
                                </button>
                                <button
                                    onClick={() => setNewAdj({ ...newAdj, type: 'deduction' })}
                                    className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${newAdj.type === 'deduction'
                                        ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-zinc-900 dark:border-zinc-700'}`}
                                >
                                    - Deduction
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Label (e.g. Bonus, Tax)"
                                className="input-field w-full text-sm"
                                value={newAdj.label}
                                onChange={e => setNewAdj({ ...newAdj, label: e.target.value })}
                            />

                            <input
                                type="number"
                                placeholder="Amount (IDR)"
                                className="input-field w-full text-sm font-mono"
                                value={newAdj.amount}
                                onChange={e => setNewAdj({ ...newAdj, amount: e.target.value })}
                            />

                            <button
                                onClick={handleAddAdjustment}
                                disabled={!newAdj.label || !newAdj.amount}
                                className="w-full btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add Item
                            </button>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                        <button
                            onClick={fetchPreview}
                            disabled={loading}
                            className="w-full btn-secondary flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh Preview
                        </button>

                        <button
                            onClick={handleSend}
                            disabled={loading || sending}
                            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base shadow-lg shadow-blue-500/20"
                        >
                            {sending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                            {sending ? 'Sending...' : 'Generate & Email Payslip'}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-1 bg-slate-100 dark:bg-black/50 overflow-hidden relative flex flex-col">
                    <div className="absolute top-4 right-4 z-10 bg-slate-800 text-white text-xs px-3 py-1 rounded-full opacity-70 pointer-events-none">
                        A4 Preview Mode
                    </div>

                    {loading && !previewHtml ? (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="w-full h-full p-8 overflow-y-auto flex justify-center">
                            <div
                                className="bg-white shadow-2xl w-[210mm] min-h-[297mm] origin-top transform scale-75 md:scale-90 lg:scale-100 transition-transform origin-top-center"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayslipGenerator;
