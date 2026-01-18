import { useState, useEffect } from 'react';
import api from '../utils/api';
import { MapPin, AlertTriangle, Calendar, Search, ExternalLink, User } from 'lucide-react';
import DateInput from '../components/ui/DateInput';
import clsx from 'clsx';
import { format } from 'date-fns';

const AdminAttendance = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [userFilter, setUserFilter] = useState('');

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

    const filteredLogs = logs.filter(log =>
        log.User?.name.toLowerCase().includes(userFilter.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                        <MapPin className="text-red-500" /> Presence Logs
                    </h1>
                    <p className="text-muted-foreground font-medium">Monitor staff location and attendance.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Filter user..."
                            className="w-full bg-background border border-input rounded-xl px-4 py-2 pl-9 focus:ring-2 focus:ring-primary outline-none text-foreground placeholder-muted-foreground text-sm"
                            value={userFilter}
                            onChange={e => setUserFilter(e.target.value)}
                        />
                    </div>
                    <div className="w-40">
                        <DateInput
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </div>
            </header>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
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
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No attendance records found for this date.</td></tr>
                            ) : (
                                filteredLogs.map(log => (
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
                </div>
            </div>
        </div>
    );
};

export default AdminAttendance;
