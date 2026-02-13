import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import clsx from 'clsx';
import { Mail, Save, Server, Shield, Globe, Send, CheckCircle, AlertTriangle, Zap, Monitor, Moon, Sun } from 'lucide-react';

const ServiceToggle = ({ label, description, isOn, onToggle }) => {
    return (
        <div className="bg-zinc-900 rounded-xl p-4 flex items-center justify-between border border-zinc-800">
            <div>
                <h3 className="font-bold text-white">{label}</h3>
                <p className="text-zinc-400 text-sm mt-1">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={`w-12 h-6 rounded-full p-1 transition-all ${isOn ? 'bg-lime-400' : 'bg-zinc-700'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-md ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
};

const AdminSettings = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);

    // Only Super Admin should see this probably, but Layout handles general access
    // We can disable fields if not super admin if we want, or rely on API.

    const [smtpConfig, setSmtpConfig] = useState({
        host: '',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        fromEmail: '',
        fromName: 'WERK IDE'
    });

    const [testEmail, setTestEmail] = useState('');
    const [services, setServices] = useState({});

    // New Settings State
    const [activeTab, setActiveTab] = useState('system'); // 'system', 'shifts', 'holidays'
    const [shifts, setShifts] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [newShift, setNewShift] = useState({ name: '', startTime: '09:00', endTime: '18:00', color: '#FACC15', lateTolerance: 15 });
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'National', isRecurring: true });

    useEffect(() => {
        fetchConfig();
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data } = await api.get('/admin/services');
            setServices(data || {});

            // Also fetch shifts and holidays
            const [shiftRes, holidayRes] = await Promise.all([
                api.get('/admin/shifts'),
                api.get('/holidays')
            ]);
            setShifts(shiftRes.data);
            setHolidays(holidayRes.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateShift = async () => {
        try {
            const { data } = await api.post('/admin/shifts', newShift);
            setShifts([...shifts, data]);
            toast.success('Shift created');
            setNewShift({ name: '', startTime: '09:00', endTime: '18:00', color: '#FACC15', lateTolerance: 15 });
        } catch (e) { toast.error('Failed to create shift'); }
    };

    const handleCreateHoliday = async () => {
        try {
            const { data } = await api.post('/admin/holidays', newHoliday);
            setHolidays([...holidays, data]);
            toast.success('Holiday added');
            setNewHoliday({ name: '', date: '', type: 'National', isRecurring: true });
        } catch (e) { toast.error('Failed to add holiday'); }
    };

    const handleDeleteHoliday = async (id) => {
        try {
            await api.delete(`/admin/holidays/${id}`);
            setHolidays(holidays.filter(h => h.id !== id));
            toast.success('Holiday removed');
        } catch (e) { toast.error('Failed to remove holiday'); }
    };

    const toggleService = async (key) => {
        try {
            const newValue = !services[key];
            await api.put('/admin/services', { key, value: newValue });
            setServices(prev => ({ ...prev, [key]: newValue }));
            toast.success(`Service ${newValue ? 'Enabled' : 'Disabled'}`);
        } catch (err) {
            toast.error('Failed to update service');
        }
    };

    const fetchConfig = async () => {
        try {
            const { data } = await api.get('/admin/config/smtp');
            if (data) {
                setSmtpConfig({
                    host: data.host || '',
                    port: data.port || 587,
                    secure: data.secure || false,
                    user: data.user || '',
                    pass: data.pass || '', // Typically we might not send pass back for security, but for editing we might need to know it's set.
                    fromEmail: data.fromEmail || '',
                    fromName: data.fromName || 'WERK IDE'
                });
            }
        } catch (error) {
            console.error("Failed to fetch SMTP config", error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSmtpConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/admin/config/smtp', smtpConfig);
            toast.success('SMTP Settings saved successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error('Please enter a test email address');
            return;
        }
        setTestLoading(true);
        try {
            await api.post('/admin/config/smtp/test', { email: testEmail });
            toast.success('Test email sent successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Test email failed');
        } finally {
            setTestLoading(false);
        }
    };

    if (user.role !== 'super_admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <Shield size={64} className="text-zinc-700 mb-4" />
                <h2 className="text-2xl font-black text-white">Restricted Access</h2>
                <p className="text-zinc-500 mt-2">Only Super Admins can configure system settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">System Settings</h1>
                    <p className="text-zinc-400 text-sm">Configure global system parameters and integrations.</p>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2">
                <button
                    onClick={() => setActiveTab('system')}
                    className={clsx("px-4 py-2 font-bold text-sm transition-colors rounded-lg", activeTab === 'system' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
                >
                    System & SMTP
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={clsx("px-4 py-2 font-bold text-sm transition-colors rounded-lg", activeTab === 'shifts' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
                >
                    Shifts & Rosters
                </button>
                <button
                    onClick={() => setActiveTab('holidays')}
                    className={clsx("px-4 py-2 font-bold text-sm transition-colors rounded-lg", activeTab === 'holidays' ? "bg-white text-black" : "text-zinc-500 hover:text-white")}
                >
                    Holidays
                </button>
            </div>

            {/* SYSTEM TAB CONTENT */}
            {activeTab === 'system' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

                    {/* System Services Control */}
                    <div className="glass-card p-6 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-6">
                            <Zap className="text-yellow-400" />
                            <h2 className="text-xl font-bold text-white">System Services</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ServiceToggle
                                label="Daily Morning Brief"
                                description="Automated email summary at 08:00 AM"
                                isOn={services['daily_email']}
                                onToggle={() => toggleService('daily_email')}
                            />
                            <ServiceToggle
                                label="Monthly Payday Invoice"
                                description="Automated invoice email on the 28th"
                                isOn={services['monthly_email']}
                                onToggle={() => toggleService('monthly_email')}
                            />
                        </div>
                    </div>


                    {/* Appearance Settings */}
                    <div className="glass-card p-6 border border-zinc-800">
                        <div className="flex items-center gap-2 mb-6">
                            <Monitor className="text-blue-400" />
                            <h2 className="text-xl font-bold text-white">Appearance</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setTheme('system')}
                                className={clsx("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                    theme === 'system'
                                        ? "bg-white text-black border-white shadow-lg shadow-white/10 ring-2 ring-white/50"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                )}
                            >
                                <Monitor size={24} />
                                <span className="text-xs font-bold uppercase tracking-wider">System</span>
                            </button>
                            <button
                                onClick={() => setTheme('light')}
                                className={clsx("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                    theme === 'light'
                                        ? "bg-white text-black border-white shadow-lg shadow-white/10 ring-2 ring-white/50"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                )}
                            >
                                <Sun size={24} />
                                <span className="text-xs font-bold uppercase tracking-wider">Light</span>
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={clsx("flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                    theme === 'dark'
                                        ? "bg-white text-black border-white shadow-lg shadow-white/10 ring-2 ring-white/50"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                )}
                            >
                                <Moon size={24} />
                                <span className="text-xs font-bold uppercase tracking-wider">Dark</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* SMTP Configuration Card */}
                        <div className="lg:col-span-2 glass-card p-6 border border-zinc-800">
                            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                <div className="w-10 h-10 rounded-full bg-lime-400/10 flex items-center justify-center text-lime-400">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">SMTP Configuration</h2>
                                    <p className="text-xs text-zinc-500">Manage email sending services for notifications.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">SMTP Host</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                            <input
                                                type="text"
                                                name="host"
                                                value={smtpConfig.host}
                                                onChange={handleChange}
                                                placeholder="smtp.example.com"
                                                className="input-field pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Port</label>
                                        <div className="relative">
                                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                            <input
                                                type="number"
                                                name="port"
                                                value={smtpConfig.port}
                                                onChange={handleChange}
                                                placeholder="587"
                                                className="input-field pl-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                                        <input
                                            type="text"
                                            name="user"
                                            value={smtpConfig.user}
                                            onChange={handleChange}
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                                        <input
                                            type="password"
                                            name="pass"
                                            value={smtpConfig.pass}
                                            onChange={handleChange}
                                            className="input-field"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">From Email</label>
                                        <input
                                            type="email"
                                            name="fromEmail"
                                            value={smtpConfig.fromEmail}
                                            onChange={handleChange}
                                            className="input-field"
                                            placeholder="noreply@werk.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">From Name</label>
                                        <input
                                            type="text"
                                            name="fromName"
                                            value={smtpConfig.fromName}
                                            onChange={handleChange}
                                            className="input-field"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="secure"
                                        name="secure"
                                        checked={smtpConfig.secure}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-lime-400 focus:ring-lime-400"
                                    />
                                    <label htmlFor="secure" className="text-sm font-medium text-zinc-300 select-none">Use Secure Connection (SSL/TLS)</label>
                                </div>

                                <div className="pt-4 border-t border-white/5 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {loading ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Testing Panel */}
                        <div className="space-y-6">
                            <div className="glass-card p-6 border border-zinc-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <Send size={16} />
                                    </div>
                                    <h3 className="font-bold text-white">Test Configuration</h3>
                                </div>
                                <p className="text-xs text-zinc-500 mb-4">Send a test email to verify your SMTP settings are working correctly.</p>

                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        className="input-field"
                                        placeholder="Enter receipt email..."
                                    />
                                    <button
                                        onClick={handleTestEmail}
                                        disabled={testLoading || !smtpConfig.host}
                                        className="btn-secondary w-full flex items-center justify-center gap-2"
                                    >
                                        {testLoading ? 'Sending...' : 'Send Test Email'}
                                    </button>
                                </div>
                            </div>

                            <div className="glass-card p-6 border border-yellow-500/20 bg-yellow-500/5">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={20} />
                                    <div>
                                        <h4 className="font-bold text-yellow-500 text-sm">Security Note</h4>
                                        <p className="text-xs text-yellow-500/80 mt-1 leading-relaxed">
                                            SMTP passwords are stored securely. Ensure your SMTP provider allows access from this server IP.
                                            For Gmail, use App Passwords.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SHIFTS TAB CONTENT */}
            {activeTab === 'shifts' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-card p-6 border border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="text-yellow-400" /> Mastery of Time (Shifts)
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Create New Shift */}
                            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
                                <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-wider">Create New Shift</h3>
                                <input type="text" placeholder="Shift Name (e.g. Night Shift)" className="input-field w-full" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="time" className="input-field w-full" value={newShift.startTime} onChange={e => setNewShift({ ...newShift, startTime: e.target.value })} />
                                    <input type="time" className="input-field w-full" value={newShift.endTime} onChange={e => setNewShift({ ...newShift, endTime: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Tolerance (min)" className="input-field w-full" value={newShift.lateTolerance} onChange={e => setNewShift({ ...newShift, lateTolerance: parseInt(e.target.value) })} />
                                    <input type="color" className="input-field w-full h-[42px] p-1" value={newShift.color} onChange={e => setNewShift({ ...newShift, color: e.target.value })} />
                                </div>
                                <button onClick={handleCreateShift} className="btn-primary w-full shadow-lg shadow-yellow-500/20">Create Shift</button>
                            </div>

                            {/* List Shifts */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-wider">Active Shift Definitions</h3>
                                {shifts.map(shift => (
                                    <div key={shift.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full shadow-sm ring-2 ring-zinc-800" style={{ backgroundColor: shift.color }} />
                                            <div>
                                                <div className="font-bold text-white">{shift.name}</div>
                                                <div className="text-xs text-zinc-500 font-mono">{shift.startTime} - {shift.endTime} • {shift.lateTolerance}m tol</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HOLIDAYS TAB CONTENT */}
            {activeTab === 'holidays' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass-card p-6 border border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Palmtree className="text-red-400" /> Public Holidays (Tanggal Merah)
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Create Holiday */}
                            <div className="md:col-span-1 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4 h-fit">
                                <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-wider">Add Holiday</h3>
                                <input type="date" className="input-field w-full" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                                <input type="text" placeholder="Holiday Name" className="input-field w-full" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                                <select className="input-field w-full" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })}>
                                    <option value="National">National Holiday</option>
                                    <option value="Cuti Bersama">Cuti Bersama</option>
                                </select>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={newHoliday.isRecurring} onChange={e => setNewHoliday({ ...newHoliday, isRecurring: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500" />
                                    <label className="text-sm font-medium text-zinc-300">Recurring (Yearly)</label>
                                </div>
                                <button onClick={handleCreateHoliday} className="w-full bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">Add Holiday</button>
                            </div>

                            {/* List Holidays */}
                            <div className="md:col-span-2 space-y-3">
                                <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-wider">Upcoming Holidays</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {holidays.map(holiday => (
                                        <div key={holiday.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between group hover:border-red-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex flex-col items-center justify-center text-red-500 border border-red-500/20">
                                                    <span className="text-[10px] font-bold uppercase">{new Date(holiday.date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-lg font-black leading-none">{new Date(holiday.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-sm">{holiday.name}</div>
                                                    <div className="text-xs text-zinc-500">{holiday.type} • {new Date(holiday.date).getFullYear()}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteHoliday(holiday.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminSettings;
