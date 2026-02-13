import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Save, X, Edit, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';
import clsx from 'clsx';

const AdminRoster = () => {
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shifts, setShifts] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [rosters, setRosters] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedDate, setSelectedDate] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ userId: '', shiftId: '', startDate: '', endDate: '' });

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [shiftRes, holidayRes, rosterRes, userRes] = await Promise.all([
                api.get('/admin/shifts'),
                api.get('/holidays'),
                api.get(`/admin/roster?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`),
                api.get('/admin/users')
            ]);
            setShifts(shiftRes.data);
            setHolidays(holidayRes.data);
            setRosters(rosterRes.data);
            setUsers(userRes.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load roster data');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignShift = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/roster', assignForm);
            toast.success('Roster assigned successfully');
            setShowAssignModal(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to assign shift');
        }
    };

    // Calendar Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Matrix: Users x Days
    // We want to show a Gantt-like or Table view. Calendar View (Month) is good for single view, but for many staff, a Timeline/Table is better.
    // Let's do a Matrix Table: Rows = Users, Cols = Days

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-1">Roster Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Assign shifts and manage staff schedules.</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X className="rotate-45" size={16} /> {/* Using X as arrow icon replacement if needed, or just text */}
                        Prev
                    </button>
                    <span className="w-40 text-center font-bold text-slate-900 dark:text-white">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                        Next
                    </button>
                </div>
            </header>

            {/* Roster Matrix */}
            <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-0">
                <div className="overflow-auto flex-1 relative custom-scrollbar">
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider shadow-sm">
                            <tr>
                                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-zinc-950 p-4 min-w-[200px] text-left border-b border-r border-slate-200 dark:border-zinc-800">
                                    Staff Member
                                </th>
                                {daysInMonth.map(day => {
                                    const isHoliday = holidays.find(h => h.date === format(day, 'yyyy-MM-dd'));
                                    const dayIsToday = isToday(day);
                                    return (
                                        <th key={day.toString()} className={clsx("p-2 min-w-[50px] text-center border-b border-r border-slate-200 dark:border-zinc-800",
                                            dayIsToday ? "bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400" : "",
                                            isHoliday ? "bg-red-50/50 dark:bg-red-900/10 text-red-600 dark:text-red-400" : ""
                                        )}>
                                            <div className="flex flex-col items-center">
                                                <span className="opacity-70 text-[10px]">{format(day, 'EEE')}</span>
                                                <span className={clsx("w-6 h-6 flex items-center justify-center rounded-full mt-1",
                                                    dayIsToday ? "bg-blue-100 dark:bg-blue-500/20" : "",
                                                    isHoliday ? "font-black" : ""
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 p-4 border-r border-slate-200 dark:border-zinc-800 font-medium text-slate-900 dark:text-white truncate">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div>{user.name}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{user.defaultShift?.name || 'Default'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {daysInMonth.map(day => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const assignment = rosters.find(r =>
                                            r.UserId === user.id &&
                                            dateStr >= r.startDate &&
                                            dateStr <= r.endDate
                                        );
                                        const shift = assignment?.Shift;
                                        const isHoliday = holidays.find(h => h.date === dateStr);

                                        return (
                                            <td
                                                key={day.toString()}
                                                className={clsx("p-1 border-r border-slate-100 dark:border-zinc-800 relative group cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800",
                                                    isHoliday ? "bg-red-50/10" : ""
                                                )}
                                                onClick={() => {
                                                    setAssignForm({
                                                        userId: user.id,
                                                        shiftId: shift?.id || '',
                                                        startDate: dateStr,
                                                        endDate: dateStr
                                                    });
                                                    setShowAssignModal(true);
                                                }}
                                            >
                                                {shift ? (
                                                    <div
                                                        className="w-full h-10 rounded-lg text-[10px] font-bold flex items-center justify-center shadow-sm text-white px-1 text-center leading-tight truncate transition-all hover:scale-105"
                                                        style={{ backgroundColor: shift.color }}
                                                        title={`${shift.name} (${shift.startTime} - ${shift.endTime})`}
                                                    >
                                                        {shift.startTime.substring(0, 5)}
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Plus size={14} className="text-slate-300" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                {shifts.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{s.name} ({s.startTime}-{s.endTime})</span>
                    </div>
                ))}
                <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-zinc-700">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200 dark:bg-red-900 dark:border-red-700" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Holiday</span>
                </div>
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CalendarIcon className="text-blue-500" /> Assign Shift
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignShift} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500">Staff Member</label>
                                <select
                                    className="input-field w-full"
                                    value={assignForm.userId}
                                    onChange={e => setAssignForm({ ...assignForm, userId: e.target.value })}
                                    disabled // Locked to the user clicked row for now
                                >
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-500">Start Date</label>
                                    <input
                                        type="date"
                                        className="input-field w-full"
                                        value={assignForm.startDate}
                                        onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-slate-500">End Date</label>
                                    <input
                                        type="date"
                                        className="input-field w-full"
                                        value={assignForm.endDate}
                                        onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-slate-500">Shift</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {shifts.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, shiftId: s.id })}
                                            className={clsx("flex items-center justify-between p-3 rounded-xl border transition-all",
                                                assignForm.shiftId == s.id
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white ring-2 ring-offset-2 ring-slate-900 dark:ring-white"
                                                    : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color }} />
                                                <div className="text-left">
                                                    <div className="font-bold text-sm">{s.name}</div>
                                                </div>
                                            </div>
                                            <div className="font-mono text-xs opacity-70">
                                                {s.startTime} - {s.endTime}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> Save Assignment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRoster;
