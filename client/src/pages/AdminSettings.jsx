import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Mail, Save, Server, Shield, Globe, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

const AdminSettings = () => {
    const { user } = useAuth();
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
        fromName: 'WERK OS'
    });

    const [testEmail, setTestEmail] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

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
                    fromName: data.fromName || 'WERK OS'
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
            <header>
                <h1 className="text-3xl font-black text-white mb-1">System Settings</h1>
                <p className="text-zinc-400 text-sm">Configure global system parameters and integrations.</p>
            </header>

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
    );
};

export default AdminSettings;
