import { useState, useEffect } from 'react';
import api from '../utils/api';
import { ShieldAlert, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await api.get('/admin/audit-logs');
                setLogs(res.data);
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.User?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.User?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Security Audit Logs</h1>
                    <p className="text-zinc-400 mt-1">Track system activity and security events.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="glass-card p-4 flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm font-bold text-zinc-300 focus:border-red-500 outline-none w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
                                <th className="p-4 font-bold">Timestamp</th>
                                <th className="p-4 font-bold">User</th>
                                <th className="p-4 font-bold">Action</th>
                                <th className="p-4 font-bold">Details</th>
                                <th className="p-4 font-bold">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="animate-spin" /> Loading Security Logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-zinc-500 text-sm font-mono whitespace-nowrap">
                                            {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                                        </td>
                                        <td className="p-4 text-white">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{log.User?.name || 'Unknown'}</span>
                                                <span className="text-xs text-zinc-500">{log.User?.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx("px-2 py-1 rounded text-xs font-bold uppercase border",
                                                log.action.includes('Delete') ? "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-500/20 dark:border-red-400/20" :
                                                    log.action.includes('Update') ? "text-yellow-700 bg-yellow-100 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-500/20 dark:border-yellow-400/20" :
                                                        log.action.includes('Create') ? "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/20 dark:border-emerald-400/20" :
                                                            "text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-500/20 dark:border-blue-400/20"
                                            )}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 text-zinc-300 text-sm max-w-md truncate group-hover:whitespace-normal group-hover:break-words transition-all">
                                            {log.details}
                                        </td>
                                        <td className="p-4 text-zinc-500 text-xs font-mono">
                                            {log.ip}
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

export default AdminAuditLogs;
