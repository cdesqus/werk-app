import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import { DollarSign, Calendar, ChevronLeft, ChevronRight, Download, CheckCircle, Loader, CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, AlertTriangle, Filter, Search } from 'lucide-react';
import { format, subMonths, addMonths, differenceInDays } from 'date-fns';
import * as XLSX from 'xlsx';
import clsx from 'clsx';

const AdminPayroll = () => {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [summary, setSummary] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('submission'); // 'submission' or 'activity'

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    // New state for month and year to align with the provided snippet's month navigation
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    useEffect(() => {
        // Update currentDate when month or year changes
        setCurrentDate(new Date(year, month - 1));
    }, [month, year]);

    useEffect(() => {
        fetchPayroll();
    }, [currentDate, filterMode]); // Refetch on date or filter mode change

    const fetchPayroll = async () => {
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        try {
            const { data } = await api.get(`/admin/summary?month=${currentMonth}&year=${currentYear}&filterMode=${filterMode}`);
            setSummary(data);
            setSelectedUserIds([]); // Reset selection on month change
        } catch (error) {
            console.error("Failed to fetch payroll", error);
        }
    };

    const totalPayout = summary.reduce((sum, user) => sum + user.totalPayable, 0);

    // Selection Logic
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Only select users with totalPayable > 0 and status not 'Paid'
            const allIds = summary.filter(u => u.totalPayable > 0 && u.status !== 'Paid').map(u => u.id);
            setSelectedUserIds(allIds);
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (userId) => {
        if (selectedUserIds.includes(userId)) {
            setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
        } else {
            setSelectedUserIds([...selectedUserIds, userId]);
        }
    };

    // Actions
    const handleMarkAsPaid = () => {
        if (selectedUserIds.length === 0) return;
        setConfirmModal({ isOpen: true });
    };

    const confirmPayout = async () => {
        setIsProcessing(true);
        try {
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();
            await api.post('/admin/payout', { userIds: selectedUserIds, month: currentMonth, year: currentYear });
            toast.success('Payout processed successfully!');
            fetchPayroll(); // Refresh data
        } catch (error) {
            toast.error('Failed to process payout');
            console.error(error);
        } finally {
            setIsProcessing(false);
            setConfirmModal({ isOpen: false });
        }
    };

    const handleExportExcel = () => {
        const formatCurrency = (val) => `Rp ${val.toLocaleString('id-ID')}`;

        const dataToExport = summary.map(user => ({
            'Staff ID': user.userId,
            'Name': user.name,
            'Email': user.email,
            'Overtime Hours': user.overtimeHours,
            'Overtime Amount': formatCurrency(user.overtimeTotal),
            'Claims Amount': formatCurrency(user.claimTotal),
            'Total Payable': formatCurrency(user.totalPayable),
            'Status': user.status // Use actual status
        }));

        // Calculate Totals
        const totalOvertimeHours = summary.reduce((sum, user) => sum + (parseFloat(user.overtimeHours) || 0), 0);
        const totalOvertimeAmount = summary.reduce((sum, user) => sum + user.overtimeTotal, 0);
        const totalClaimsAmount = summary.reduce((sum, user) => sum + user.claimTotal, 0);
        const totalPayableAmount = summary.reduce((sum, user) => sum + user.totalPayable, 0);

        // Add Summary Row
        dataToExport.push({
            'Staff ID': '',
            'Name': 'TOTAL SUMMARY',
            'Email': '',
            'Overtime Hours': totalOvertimeHours,
            'Overtime Amount': formatCurrency(totalOvertimeAmount),
            'Claims Amount': formatCurrency(totalClaimsAmount),
            'Total Payable': formatCurrency(totalPayableAmount),
            'Status': ''
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
        XLSX.writeFile(wb, `Payroll_Summary_${format(currentDate, 'yyyy_MM')}.xlsx`);
    };

    const StatusBadge = ({ status }) => {
        const colors = {
            Processing: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            Paid: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
            'No Data': 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${colors[status] || colors['No Data']}`}>
                {status}
            </span>
        );
    };

    // Helper for Late Check
    const isLate = (activityDate, submissionDate) => {
        if (!activityDate || !submissionDate) return false;
        return differenceInDays(new Date(submissionDate), new Date(activityDate)) > 7;
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Payroll Management</h1>
                    <p className="text-zinc-400 text-sm">Review and process staff salaries.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 pl-9 focus:ring-2 focus:ring-lime-400 outline-none text-white placeholder-zinc-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Filter Toggle */}
                    <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-700">
                        <button
                            onClick={() => setFilterMode('submission')}
                            className={clsx("px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2",
                                filterMode === 'submission' ? "bg-lime-400 text-zinc-900" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                        >
                            <Calendar size={14} /> Submission Date
                        </button>
                        <button
                            onClick={() => setFilterMode('activity')}
                            className={clsx("px-3 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2",
                                filterMode === 'activity' ? "bg-lime-400 text-zinc-900" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                            )}
                        >
                            <Clock size={14} /> Activity Date
                        </button>
                    </div>

                    <div className="flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-700">
                        <button onClick={() => setMonth(m => m === 1 ? 12 : m - 1)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                        <span className="w-32 text-center font-bold text-white text-sm">{new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => setMonth(m => m === 12 ? 1 : m + 1)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                    </div>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors border border-zinc-700">
                        <Download size={16} /> Export Excel
                    </button>
                </div>
            </header>

            {/* Bulk Actions */}
            {selectedUserIds.length > 0 && (
                <div className="bg-lime-400/10 border border-lime-400/20 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-black font-bold">
                            {selectedUserIds.length}
                        </div>
                        <span className="text-lime-400 font-bold text-sm">Staff Selected</span>
                    </div>
                    <button
                        onClick={handleMarkAsPaid}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-300 transition-colors flex items-center gap-2 shadow-lg shadow-lime-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? <Loader className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        Mark as Paid
                    </button>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={summary.length > 0 && selectedUserIds.length === summary.filter(u => u.totalPayable > 0 && u.status !== 'Paid').length}
                                        className="rounded border-input text-primary focus:ring-primary/20 bg-background"
                                    />
                                </th>
                                <th className="p-4 text-left">Staff Member</th>
                                <th className="p-4 text-center">Overtime (Hrs)</th>
                                <th className="p-4 text-right">Overtime Pay</th>
                                <th className="p-4 text-right">Claims</th>
                                <th className="p-4 text-right">Total Payable</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {summary.filter(user =>
                                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (user.staffId && user.staffId.toLowerCase().includes(searchTerm.toLowerCase()))
                            ).map(user => (
                                <>
                                    <tr key={user.id} className={clsx("hover:bg-muted/30 transition-colors group", expandedRows.has(user.id) ? "bg-muted/30" : "bg-card")}>
                                        <td className="p-4 text-center">
                                            {user.totalPayable > 0 && user.status !== 'Paid' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onChange={() => handleSelectUser(user.id)}
                                                    className="rounded border-input text-primary focus:ring-primary/20 bg-background"
                                                />
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleRow(user.id)}>
                                                <button className="text-muted-foreground hover:text-foreground">
                                                    {expandedRows.has(user.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground">{user.name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{user.staffId || user.userId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-mono text-muted-foreground">
                                            {user.overtimeHours > 0 ? <span className="text-foreground font-bold">{user.overtimeHours}h</span> : <span className="opacity-30">0h</span>}
                                        </td>
                                        <td className="p-4 text-right font-mono text-muted-foreground">
                                            {user.overtimeTotal > 0 ? <span className="text-foreground font-bold">Rp {user.overtimeTotal.toLocaleString('id-ID')}</span> : <span className="opacity-30">Rp 0</span>}
                                        </td>
                                        <td className="p-4 text-right font-mono text-muted-foreground">
                                            {user.claimTotal > 0 ? <span className="text-foreground font-bold">Rp {user.claimTotal.toLocaleString('id-ID')}</span> : <span className="opacity-30">Rp {user.claimTotal.toLocaleString('id-ID')}</span>}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            Rp {user.totalPayable.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                                user.status === 'Paid'
                                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                    : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                            )}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {user.totalPayable > 0 && user.status !== 'Paid' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserIds([user.id]);
                                                        setConfirmModal({ isOpen: true });
                                                    }}
                                                    className="text-xs font-bold text-primary hover:text-primary/80 hover:underline transition-all"
                                                >
                                                    Pay Now
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expanded Details */}
                                    {expandedRows.has(user.id) && (
                                        <tr className="bg-muted/20">
                                            <td colSpan="8" className="p-0">
                                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-border shadow-inner">

                                                    {/* Overtime Detail */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                            <Clock size={14} /> Overtime Details
                                                        </h4>
                                                        {user.details?.overtimes?.length > 0 ? (
                                                            <div className="bg-card rounded-lg border border-border overflow-hidden">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-border">
                                                                        <tr>
                                                                            <th className="p-2 text-left">Date</th>
                                                                            <th className="p-2 text-left">Activity</th>
                                                                            <th className="p-2 text-right">Hours</th>
                                                                            <th className="p-2 text-right">Amount</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border">
                                                                        {user.details.overtimes.map(ot => {
                                                                            const late = isLate(ot.date, ot.createdAt);
                                                                            return (
                                                                                <tr key={ot.id} className="text-foreground">
                                                                                    <td className="p-2">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-medium">{format(new Date(ot.date), 'dd MMM')}</span>
                                                                                            {ot.createdAt && (
                                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                                    Sub: {format(new Date(ot.createdAt), 'dd MMM')}
                                                                                                </span>
                                                                                            )}
                                                                                            {late && (
                                                                                                <div className="flex items-center gap-1 text-amber-500 text-[10px] mt-0.5" title="Submitted > 7 days after activity">
                                                                                                    <AlertTriangle size={10} /> Late
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-2">{ot.activity}</td>
                                                                                    <td className="p-2 text-right font-mono text-muted-foreground">{ot.hours}</td>
                                                                                    <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">Rp {ot.amount.toLocaleString('id-ID')}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground italic px-2">No overtime logged.</div>
                                                        )}
                                                    </div>

                                                    {/* Claims Detail */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                            <FileText size={14} /> Claims Details
                                                        </h4>
                                                        {user.details?.claims?.length > 0 ? (
                                                            <div className="bg-card rounded-lg border border-border overflow-hidden">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-muted/50 text-muted-foreground text-xs border-b border-border">
                                                                        <tr>
                                                                            <th className="p-2 text-left">Date</th>
                                                                            <th className="p-2 text-left">Title</th>
                                                                            <th className="p-2 text-right">Status</th>
                                                                            <th className="p-2 text-right">Amount</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-border">
                                                                        {user.details.claims.map(claim => {
                                                                            const late = isLate(claim.date, claim.createdAt);
                                                                            return (
                                                                                <tr key={claim.id} className="text-foreground">
                                                                                    <td className="p-2">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-medium">{format(new Date(claim.date), 'dd MMM')}</span>
                                                                                            {claim.createdAt && (
                                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                                    Sub: {format(new Date(claim.createdAt), 'dd MMM')}
                                                                                                </span>
                                                                                            )}
                                                                                            {late && (
                                                                                                <div className="flex items-center gap-1 text-amber-500 text-[10px] mt-0.5" title="Submitted > 7 days after activity">
                                                                                                    <AlertTriangle size={10} /> Late
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-2">{claim.title}</td>
                                                                                    <td className="p-2 text-right">
                                                                                        <span className={clsx("text-xs font-bold",
                                                                                            claim.status === 'Paid' ? "text-emerald-500" :
                                                                                                claim.status === 'Approved' ? "text-lime-500" : "text-amber-500"
                                                                                        )}>{claim.status}</span>
                                                                                    </td>
                                                                                    <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">Rp {claim.amount.toLocaleString('id-ID')}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-muted-foreground italic px-2">No claims filed.</div>
                                                        )}
                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                            {summary.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="p-8 text-center text-muted-foreground italic">
                                        No payroll data found for this month.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-muted/50 border-t border-border font-bold">
                            <tr>
                                <td colSpan="2" className="p-4 text-right text-muted-foreground uppercase tracking-wider text-xs">Total Summary</td>
                                <td className="p-4 text-center font-mono text-foreground">
                                    {summary.reduce((sum, user) => sum + (parseFloat(user.overtimeHours) || 0), 0)}h
                                </td>
                                <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    Rp {summary.reduce((sum, user) => sum + user.overtimeTotal, 0).toLocaleString('id-ID')}
                                </td>
                                <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    Rp {summary.reduce((sum, user) => sum + user.claimTotal, 0).toLocaleString('id-ID')}
                                </td>
                                <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    Rp {summary.reduce((sum, user) => sum + user.totalPayable, 0).toLocaleString('id-ID')}
                                </td>
                                <td colSpan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>


            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={confirmPayout}
                title="Confirm Payout"
                message={`Are you sure you want to mark ${selectedUserIds.length} staff members as PAID? This action cannot be undone.`}
                confirmText="Process Payout"
                isDanger={false}
            />
        </div >
    );
};

export default AdminPayroll;
