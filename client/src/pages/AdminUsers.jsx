import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import { Edit2, X, Shield, User, Phone, Calendar, Search, Plus, Trash2, Mail, Lock, Palmtree, MapPin } from 'lucide-react';
import clsx from 'clsx';

const AdminUsers = () => {
    const toast = useToast();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', role: 'staff', leaveQuota: 12, can_attendance: false });
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            birthDate: user.birthDate || '',
            password: '',
            role: user.role,
            leaveQuota: user.leaveQuota !== undefined ? user.leaveQuota : 12,
            can_attendance: user.can_attendance || false
        });
    };

    const handleAddClick = () => {
        setFormData({ name: '', email: '', phone: '', birthDate: '', password: '', role: 'staff', leaveQuota: 12 });
        setShowAddModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/users/${editingUser.id}`, {
                name: formData.name,
                phone: formData.phone,
                birthDate: formData.birthDate,
                newPassword: formData.password,
                leaveQuota: formData.leaveQuota,
                can_attendance: formData.can_attendance
            });
            setEditingUser(null);
            fetchUsers();
            setEditingUser(null);
            fetchUsers();
            toast.success('User updated successfully');
        } catch (error) {
            toast.error('Update failed');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/users', formData);
            setShowAddModal(false);
            fetchUsers();
            setShowAddModal(false);
            fetchUsers();
            toast.success('User created successfully');
        } catch (error) {
            toast.error('Creation failed: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/admin/users/${confirmModal.id}`);
            fetchUsers();
            toast.success('User deleted successfully');
        } catch (error) {
            toast.error('Delete failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setConfirmModal({ isOpen: false, id: null });
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black mb-2 text-foreground">User Management</h1>
                    <p className="text-muted-foreground font-medium">Control system access.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full bg-background border border-input rounded-xl px-4 py-2 pl-10 focus:ring-2 focus:ring-primary outline-none text-foreground placeholder-muted-foreground transition-all text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0">
                        <Plus size={20} /> Add User
                    </button>
                </div>
            </header>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                        <tr>
                            <th className="p-4 font-bold">Name</th>
                            <th className="p-4 font-bold">Email</th>
                            <th className="p-4 font-bold">Phone</th>
                            <th className="p-4 font-bold">Birth Date</th>
                            <th className="p-4 font-bold">Leave Quota</th>
                            <th className="p-4 font-bold">Role</th>
                            <th className="p-4 font-bold text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="p-4 font-bold text-foreground flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                        {user.name.charAt(0)}
                                    </div>
                                    {user.name}
                                </td>
                                <td className="p-4 text-muted-foreground font-medium">{user.email}</td>
                                <td className="p-4 text-muted-foreground font-medium">{user.phone}</td>
                                <td className="p-4 text-muted-foreground font-medium">{user.birthDate || '-'}</td>
                                <td className="p-4">
                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-lg font-bold text-xs">
                                        {user.leaveQuota} Days
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={clsx("px-2 py-1 rounded text-xs uppercase font-bold tracking-wider",
                                        user.role === 'super_admin' ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                                            user.role === 'admin' ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" :
                                                "bg-muted text-muted-foreground"
                                    )}>
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEditClick(user)} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="p-2 text-muted-foreground hover:bg-red-500 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card text-card-foreground w-full max-w-5xl p-0 relative animate-in fade-in zoom-in duration-200 border border-border rounded-xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <div>
                                <h2 className="text-2xl font-black text-foreground">Edit User</h2>
                                <p className="text-muted-foreground text-sm">Manage profile and security settings.</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-6">
                            <form onSubmit={handleUpdate} className="flex flex-col md:grid md:grid-cols-12 gap-6">
                                {/* LEFT COLUMN - PROFILE (Span 7) */}
                                <div className="md:col-span-7 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shadow-lg shadow-primary/20">
                                                {formData.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground">{formData.name}</h3>
                                                <p className="text-muted-foreground text-sm">{formData.email}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Mail size={14} /> Email</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    readOnly
                                                    className="input-field w-full opacity-60 cursor-not-allowed bg-muted"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><User size={14} /> Full Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="input-field w-full"
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Phone size={14} /> Phone</label>
                                                <input
                                                    type="text"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="input-field w-full"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Shield size={14} /> Role</label>
                                                    <select
                                                        value={formData.role}
                                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                                        className="input-field w-full"
                                                        disabled={currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin'}
                                                    >
                                                        <option value="staff">Staff</option>
                                                        <option value="admin">Admin</option>
                                                        {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Birth Date</label>
                                                    <input
                                                        type="date"
                                                        value={formData.birthDate}
                                                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                                        className="input-field w-full"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Palmtree size={14} /> Leave Quota</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        value={formData.leaveQuota}
                                                        onChange={e => setFormData({ ...formData, leaveQuota: parseInt(e.target.value) || 0 })}
                                                        className="input-field w-full"
                                                    />
                                                    <span className="text-muted-foreground text-sm whitespace-nowrap">Days / Year</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-6 border-t border-border">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3"><MapPin size={14} /> GPS Presence Feature</label>
                                                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
                                                    <div className="flex-1">
                                                        <span className="text-sm font-bold text-foreground block">Enable Attendance</span>
                                                        <span className="text-xs text-muted-foreground">Allow user to clock in/out via GPS</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, can_attendance: !formData.can_attendance })}
                                                        className={clsx("w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                                                            formData.can_attendance ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                                                        )}
                                                    >
                                                        <div className={clsx("w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
                                                            formData.can_attendance ? "translate-x-6" : "translate-x-0"
                                                        )} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border flex justify-end">
                                        <button type="submit" className="btn-primary w-full md:w-auto">
                                            Save Profile Changes
                                        </button>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN - SECURITY & DANGER (Span 5) */}
                                <div className="md:col-span-5 space-y-6">
                                    {/* Security Zone */}
                                    <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4">
                                        <div className="flex items-center gap-2 text-red-500 dark:text-red-400 mb-2">
                                            <div className="p-2 bg-red-500/10 rounded-lg">
                                                <Lock size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">Security Zone</h3>
                                                <p className="text-xs text-red-500/70 dark:text-red-400/70">Update user password</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className="input-field w-full border-red-500/20 focus:border-red-500/50 focus:ring-red-500/50"
                                                    placeholder="New password"
                                                />
                                            </div>
                                            {/* Confirm password could go here if state supported it */}

                                            <button
                                                type="submit"
                                                className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-500 dark:text-red-400 hover:text-white rounded-xl font-bold text-sm transition-all border border-red-500/20"
                                            >
                                                Update Password
                                            </button>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
                                        <h3 className="font-bold text-sm text-muted-foreground">Danger Zone</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Once you delete a user, there is no going back. Please be certain.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingUser(null);
                                                handleDelete(editingUser.id);
                                            }}
                                            className="w-full py-2 bg-muted hover:bg-red-600 hover:text-white text-muted-foreground rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={16} /> Delete User
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            )}

            {/* Add User Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card text-card-foreground w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200 border border-border rounded-xl shadow-2xl">
                            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X /></button>
                            <h2 className="text-2xl font-black text-foreground mb-6">Add New User</h2>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><User size={14} /> Full Name</label>
                                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Shield size={14} /> Role</label>
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field w-full">
                                            <option value="staff">Staff</option>
                                            {(currentUser?.role === 'super_admin') && (
                                                <>
                                                    <option value="admin">Admin</option>
                                                    <option value="super_admin">Super Admin</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Mail size={14} /> Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field w-full" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Phone size={14} /> Phone</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field w-full" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Birth Date</label>
                                    <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="input-field w-full" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Palmtree size={14} /> Initial Leave Quota</label>
                                    <input
                                        type="number"
                                        value={formData.leaveQuota}
                                        onChange={e => setFormData({ ...formData, leaveQuota: parseInt(e.target.value) || 0 })}
                                        className="input-field w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><Lock size={14} /> Password</label>
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-field w-full" required />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl font-bold hover:bg-muted transition-colors text-muted-foreground">Cancel</button>
                                    <button type="submit" className="btn-primary">Create User</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete User?"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Delete User"
                isDanger={true}
            />
        </div >
    );
};

export default AdminUsers;
