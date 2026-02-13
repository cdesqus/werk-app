import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Calendar as CalendarIcon, Clock, Plus, Save, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, isSunday } from 'date-fns';
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
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ userId: '', shiftId: '', startDate: '', endDate: '' });

    // Hover State for Tooltip
    const [hoveredHoliday, setHoveredHoliday] = useState({ visible: false, x: 0, y: 0, name: '' });

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

    // Helper: Shift Colors
    const getShiftStyle = (name) => {
        const n = name?.toUpperCase() || '';
        if (n.includes('PAGI')) return 'bg-lime-900/20 text-lime-400 border-lime-500/20';
        if (n.includes('SIANG')) return 'bg-blue-900/20 text-blue-400 border-blue-500/20';
        if (n.includes('MALAM')) return 'bg-purple-900/20 text-purple-400 border-purple-500/20';
        if (n.includes('OFF')) return 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50';
        return 'bg-zinc-800 text-zinc-300 border-zinc-700'; // Default
    };

    // Calendar Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="h-full flex flex-col bg-[#09090b] text-zinc-300 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-6 shrink-0 border-b border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Roster Management</h1>
                    <p className="text-zinc-500 text-sm">Schedule staff shifts & manage coverage.</p>
                </div>
                <div className="flex items-center gap-3 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="w-40 text-center font-bold text-white">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-auto relative custom-scrollbar bg-[#09090b]">
                <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-40 bg-[#09090b]">
                        <tr>
                            <th className="sticky left-0 z-50 bg-[#09090b] p-4 text-left border-b border-r border-zinc-800 min-w-[220px] shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Staff Member</span>
                            </th>
                            {daysInMonth.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const holiday = holidays.find(h => h.date === dateStr);
                                const isSun = isSunday(day);
                                const isTodayDate = isToday(day);
                                const isRed = holiday || isSun;

                                return (
                                    <th
                                        key={day.toString()}
                                        className={clsx(
                                            "p-3 min-w-[60px] text-center border-b border-r border-zinc-800/50 transition-colors relative group",
                                            isRed ? "bg-red-950/30" : "bg-[#09090b]",
                                            isTodayDate ? "bg-zinc-800" : ""
                                        )}
                                        onMouseEnter={(e) => {
                                            if (holiday) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredHoliday({ visible: true, x: rect.left + rect.width / 2, y: rect.bottom + 5, name: holiday.name });
                                            }
                                        }}
                                        onMouseLeave={() => setHoveredHoliday({ ...hoveredHoliday, visible: false })}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={clsx("text-[10px] font-bold uppercase tracking-wider", isRed ? "text-red-400" : "text-zinc-500")}>
                                                {format(day, 'EEE')}
                                            </span>
                                            <span className={clsx(
                                                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold",
                                                isTodayDate ? "bg-lime-400 text-black" : isRed ? "text-red-400" : "text-zinc-300"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="sticky left-0 z-30 bg-[#09090b] p-3 border-b border-r border-zinc-800 shadow-[4px_0_24px_rgba(0,0,0,0.5)] group-hover:bg-[#09090b]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-zinc-200 truncate">{user.name}</div>
                                            <div className="text-[10px] text-zinc-500 truncate">{user.defaultShift?.name || 'Default'}</div>
                                        </div>
                                    </div>
                                </td>
                                {daysInMonth.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const assignment = rosters.find(r => r.UserId === user.id && dateStr >= r.startDate && dateStr <= r.endDate);
                                    const shift = assignment?.Shift;
                                    const holiday = holidays.find(h => h.date === dateStr);
                                    const isSun = isSunday(day);
                                    const isRed = holiday || isSun;

                                    return (
                                        <td
                                            key={day.toString()}
                                            className={clsx(
                                                "p-1 border-b border-r border-zinc-800/50 cursor-pointer transition-all hover:bg-zinc-800/50",
                                                isRed ? "bg-red-950/10" : ""
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
                                                    className={clsx(
                                                        "w-full h-12 rounded-md flex flex-col items-center justify-center border text-[10px] font-bold leading-none shadow-sm transition-transform active:scale-95",
                                                        getShiftStyle(shift.name)
                                                    )}
                                                >
                                                    <span>{shift.name}</span>
                                                    <span className="opacity-60 text-[9px] mt-0.5 font-normal">{shift.startTime.slice(0, 5)}</span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-12 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-all">
                                                    <Plus size={14} className="text-zinc-600" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {/* Empty spacer row for bottom scrolling comfort */}
                        <tr><td className="h-20 bg-[#09090b]"></td></tr>
                    </tbody>
                </table>
            </div>

            {/* Footer Legend */}
            <div className="shrink-0 p-4 border-t border-zinc-800 bg-[#09090b] flex flex-wrap items-center gap-6 text-xs text-zinc-500 overflow-x-auto">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                    <span className="font-bold text-zinc-400">Public Holiday / Sunday (Red Column)</span>
                </div>
                {shifts.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                        <div className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border", getShiftStyle(s.name))}>
                            {s.name}
                        </div>
                    </div>
                ))}
            </div>

            {/* Holiday Tooltip */}
            {hoveredHoliday.visible && (
                <div
                    className="fixed z-[60] px-3 py-1.5 bg-black/90 text-white text-xs font-medium rounded-lg shadow-xl border border-zinc-800 pointer-events-none transform -translate-x-1/2 animate-in fade-in zoom-in duration-200"
                    style={{ left: hoveredHoliday.x, top: hoveredHoliday.y }}
                >
                    🎉 {hoveredHoliday.name}
                </div>
            )}

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#09090b] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-zinc-800 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CalendarIcon className="text-lime-400" /> Assign Shift
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignShift} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-lime-500/50 outline-none transition-all"
                                        value={assignForm.startDate}
                                        onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-lime-500/50 outline-none transition-all"
                                        value={assignForm.endDate}
                                        onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Select Shift</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {shifts.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, shiftId: s.id })}
                                            className={clsx(
                                                "flex flex-col items-start p-3 rounded-xl border transition-all duration-200",
                                                assignForm.shiftId == s.id
                                                    ? "bg-lime-900/20 border-lime-500/50 ring-1 ring-lime-500/50 shadow-[0_0_15px_rgba(132,204,22,0.15)]"
                                                    : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                                            )}
                                        >
                                            <span className={clsx("font-bold text-sm", assignForm.shiftId == s.id ? "text-lime-400" : "text-zinc-300")}>{s.name}</span>
                                            <span className="text-xs text-zinc-500 mt-1 font-mono">{s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-lime-400 hover:bg-lime-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-lime-900/20 active:scale-[0.98] mt-2">
                                Save Assignments
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRoster;
