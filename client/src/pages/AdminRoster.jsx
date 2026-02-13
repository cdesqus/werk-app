
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

    // Helper: Shift Colors (Clean/Light Theme)
    const getShiftStyle = (name) => {
        const n = name?.toUpperCase() || '';
        if (n.includes('PAGI')) return 'bg-lime-100 text-lime-700 border-lime-200';
        if (n.includes('SIANG')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (n.includes('MALAM')) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (n.includes('OFF')) return 'bg-slate-100 text-slate-500 border-slate-200';
        return 'bg-gray-100 text-gray-700 border-gray-200'; // Default
    };

    // Calendar Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="h-full flex flex-col bg-white text-slate-900 overflow-hidden font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-6 shrink-0 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Roster Management</h1>
                    <p className="text-slate-500 text-sm">Schedule staff shifts & manage coverage.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-900 transition-all">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="w-40 text-center font-bold text-slate-900">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-900 transition-all">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-auto relative custom-scrollbar bg-white">
                <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-40 bg-white">
                        <tr>
                            <th className="sticky left-0 z-50 bg-white p-4 text-left border-b border-r border-slate-200 min-w-[220px] shadow-[4px_0_12px_rgba(0,0,0,0.05)]">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Member</span>
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
                                            "p-3 min-w-[60px] text-center border-b border-r border-slate-100 transition-colors relative group",
                                            isRed ? "bg-red-50/70" : "bg-white",
                                            isTodayDate ? "bg-slate-50" : ""
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
                                            <span className={clsx("text-[10px] font-bold uppercase tracking-wider", isRed ? "text-red-500" : "text-slate-400")}>
                                                {format(day, 'EEE')}
                                            </span>
                                            <span className={clsx(
                                                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold",
                                                isTodayDate ? "bg-slate-900 text-white shadow-md" : isRed ? "text-red-500" : "text-slate-600"
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
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="sticky left-0 z-30 bg-white p-3 border-b border-r border-slate-200 shadow-[4px_0_12px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-700 truncate">{user.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{user.defaultShift?.name || 'Default'}</div>
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
                                                "p-1 border-b border-r border-slate-100 cursor-pointer transition-all hover:bg-slate-100",
                                                isRed ? "bg-red-50/30" : ""
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
                                                    <span className="opacity-75 text-[9px] mt-0.5 font-normal">{shift.startTime.slice(0, 5)}</span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-12 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-200/50 transition-all">
                                                    <Plus size={14} className="text-slate-300" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {/* Empty spacer row for bottom scrolling comfort */}
                        <tr><td className="h-20 bg-white"></td></tr>
                    </tbody>
                </table>
            </div>

            {/* Footer Legend */}
            <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-6 text-xs text-slate-500 overflow-x-auto">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="font-bold text-slate-600">Public Holiday / Sunday (Red Column)</span>
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
                    className="fixed z-[60] px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl shadow-slate-200/50 pointer-events-none transform -translate-x-1/2 animate-in fade-in zoom-in duration-200"
                    style={{ left: hoveredHoliday.x, top: hoveredHoliday.y }}
                >
                    🎉 {hoveredHoliday.name}
                </div>
            )}

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <CalendarIcon className="text-slate-900" /> Assign Shift
                            </h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAssignShift} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                                        value={assignForm.startDate}
                                        onChange={e => setAssignForm({ ...assignForm, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                                        value={assignForm.endDate}
                                        onChange={e => setAssignForm({ ...assignForm, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Shift</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {shifts.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setAssignForm({ ...assignForm, shiftId: s.id })}
                                            className={clsx(
                                                "flex flex-col items-start p-3 rounded-xl border transition-all duration-200",
                                                assignForm.shiftId == s.id
                                                    ? "bg-slate-900 text-white shadow-lg border-slate-900 ring-2 ring-slate-900/20"
                                                    : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                            )}
                                        >
                                            <span className={clsx("font-bold text-sm", assignForm.shiftId == s.id ? "text-white" : "text-slate-700")}>{s.name}</span>
                                            <span className={clsx("text-xs mt-1 font-mono", assignForm.shiftId == s.id ? "text-slate-300" : "text-slate-400")}>{s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] mt-2">
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
