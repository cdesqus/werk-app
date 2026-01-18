import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { MapPin, AlertTriangle, Calendar, Search, ExternalLink, User, FileSpreadsheet, LayoutList, List } from 'lucide-react';
import DateInput from '../components/ui/DateInput';
import clsx from 'clsx';
import { format, differenceInMinutes, parseISO } from 'date-fns';

const AdminAttendance = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [userFilter, setUserFilter] = useState('');
    const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'raw'

    useEffect(() => {
        fetchLogs();
    }, [dateFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/attendance', {
                params: { date: dateFilter }
            });
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Data
    const summaryData = useMemo(() => {
        const userGroups = {};

        // logs are typically ordered DESC by timestamp, but we'll sort them to be sure
        const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedLogs.forEach(log => {
            const userId = log.UserId;
            if (!userGroups[userId]) {
                userGroups[userId] = {
                    id: userId,
                    staffId: log.User?.staffId,
                    name: log.User?.name,
                    logs: [],
                    firstIn: null,
                    lastOut: null,
                    suspiciousCount: 0
                };
            }
            userGroups[userId].logs.push(log);
            if (log.is_suspicious) userGroups[userId].suspiciousCount++;

            if (log.type === 'CLOCK_IN') {
                if (!userGroups[userId].firstIn) userGroups[userId].firstIn = log;
            } else if (log.type === 'CLOCK_OUT') {
                userGroups[userId].lastOut = log;
            }
        });

        // Convert to array
        return Object.values(userGroups).map(u => {
            let duration = 0;
            // Simple duration calculation: Last Out - First In
            // This is a naive calculation; complex shifts might need more advanced pairs processing
            // But sufficient for "Per Day Summary" as per request
            if (u.firstIn && u.lastOut) {
                const start = new Date(u.firstIn.timestamp);
                const end = new Date(u.lastOut.timestamp);
                if (end > start) {
                    duration = differenceInMinutes(end, start);
                }
            }

            // Format Duration H:M
            const hrs = Math.floor(duration / 60);
            const mins = duration % 60;
            u.durationStr = duration > 0 ? `${hrs}h ${mins}m` : '-';

            return u;
        }).filter(u => (u.name || '').toLowerCase().includes(userFilter.toLowerCase()));
    }, [logs, userFilter]);

    // Raw Filtered Logs
    const filteredRawLogs = logs.filter(log =>
        (log.User?.name || 'Unknown').toLowerCase().includes(userFilter.toLowerCase())
    );

    // Export Handler
    const handleExport = () => {
        // Headers
        const headers = ["Staff ID", "Name", "Date", "First Clock In", "Last Clock Out", "Duration", "Suspicious Logs"];

        // Rows
        const rows = summaryData.map(u => [
            u.staffId || '-',
            u.name,
            dateFilter,
            u.firstIn ? format(new Date(u.firstIn.timestamp), 'HH:mm:ss') : '-',
            u.lastOut ? format(new Date(u.lastOut.timestamp), 'HH:mm:ss') : '-',
            u.durationStr,
            u.suspiciousCount
        ]);

        // CSV Content
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Create Blob and Link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Summary_${dateFilter}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                        <MapPin className="text-red-500" /> Presence Logs
                    </h1>
                    <p className="text-muted-foreground font-medium">Monitor staff location and attendance.</p>
                </div>
                <div className="flex flex-col md:flex-row items-end md:items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 w-full md:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Filter user..."
                            className="w-full bg-background border border-input rounded-xl px-4 py-2 pl-9 focus:ring-2 focus:ring-primary outline-none text-foreground placeholder-muted-foreground text-sm"
                            value={userFilter}
                            onChange={e => setUserFilter(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-40">
                        <DateInput
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
                        <button
                            onClick={() => setViewMode('summary')}
                            className={clsx("p-2 rounded-md transition-all text-sm font-bold flex items-center gap-2", viewMode === 'summary' ? "bg-white dark:bg-zinc-800 shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="Daily Summary View"
                        >
                            <LayoutList size={16} /> <span className="hidden md:inline">Summary</span>
                        </button>
                        <button
                            onClick={() => setViewMode('raw')}
                            className={clsx("p-2 rounded-md transition-all text-sm font-bold flex items-center gap-2", viewMode === 'raw' ? "bg-white dark:bg-zinc-800 shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                            title="Raw Logs View"
                        >
                            <List size={16} /> <span className="hidden md:inline">Raw</span>
                        </button>
                    </div>

                    {viewMode === 'summary' && (
                        <button
                            onClick={handleExport}
                            className="btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            <FileSpreadsheet size={16} /> Export CSV
                        </button>
                    )}
                </div>
            </header>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {/* SUMMARY TABLE */}
                    {viewMode === 'summary' && (
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="p-4 font-bold">Staff</th>
                                    <th className="p-4 font-bold text-center">First In</th>
                                    <th className="p-4 font-bold text-center">Last Out</th>
                                    <th className="p-4 font-bold text-center">Duration</th>
                                    <th className="p-4 font-bold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Loading data...</td></tr>
                                ) : summaryData.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No attendance records found for this date.</td></tr>
                                ) : (
                                    summaryData.map(user => (
                                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-bold text-foreground">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs">
                                                        {user.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <span className="block">{user.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{user.staffId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {user.firstIn ? (
                                                    <span className="font-mono bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">
                                                        {format(new Date(user.firstIn.timestamp), 'HH:mm:ss')}
                                                    </span>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className="p-4 text-center">
                                                {user.lastOut ? (
                                                    <span className="font-mono bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 px-2 py-1 rounded text-xs font-bold">
                                                        {format(new Date(user.lastOut.timestamp), 'HH:mm:ss')}
                                                    </span>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className="p-4 text-center font-bold text-sm text-foreground">
                                                {user.durationStr}
                                            </td>
                                            <td className="p-4 text-right">
                                                {user.suspiciousCount > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
                                                        <AlertTriangle size={12} /> {user.suspiciousCount} FLAGGED
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground font-medium">Clean</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* RAW LOGS TABLE */}
                    {viewMode === 'raw' && (
                        <table className="w-full text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="p-4 font-bold">Staff</th>
                                    <th className="p-4 font-bold">Time (Server)</th>
                                    <th className="p-4 font-bold">Type</th>
                                    <th className="p-4 font-bold">Location</th>
                                    <th className="p-4 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Loading logs...</td></tr>
                                ) : filteredRawLogs.length === 0 ? (
                                    <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No attendance records found for this date.</td></tr>
                                ) : (
                                    filteredRawLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-bold text-foreground">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                        {log.User?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <span className="block">{log.User?.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{log.User?.staffId}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-foreground font-mono">
                                                {format(new Date(log.timestamp), 'HH:mm:ss')}
                                            </td>
                                            <td className="p-4">
                                                <span className={clsx("px-2 py-1 rounded-md text-xs font-bold uppercase",
                                                    log.type === 'CLOCK_IN' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                                )}>
                                                    {log.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <a
                                                    href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                                                >
                                                    <MapPin size={14} />
                                                    View Map
                                                    <ExternalLink size={12} />
                                                </a>
                                                <div className="text-[10px] text-muted-foreground mt-1">
                                                    ± {Math.round(log.accuracy)}m accuracy
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {log.is_suspicious ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800">
                                                        <AlertTriangle size={12} />
                                                        SUSPICIOUS
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold">
                                                        VERIFIED
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAttendance;
