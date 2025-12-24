import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import { Edit2, X, Shield, User, Phone, Calendar, Search, Plus, Trash2, Mail, Lock } from 'lucide-react';

const AdminUsers = () => {
    const toast = useToast();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', birthDate: '', password: '', role: 'staff' });
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
        setFormData({ name: user.name, email: user.email, phone: user.phone, birthDate: user.birthDate || '', password: '', role: user.role });
    };

    const handleAddClick = () => {
        setFormData({ name: '', email: '', phone: '', birthDate: '', password: '', role: 'staff' });
        setShowAddModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/users/${editingUser.id}`, {
                name: formData.name,
                phone: formData.phone,
                birthDate: formData.birthDate,
                newPassword: formData.password
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
                    <h1 className="text-4xl font-black mb-2 text-white">User Management</h1>
                    <p className="text-zinc-400 font-medium">Control system access.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="input-field w-full pl-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={handleAddClick} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-lime-400 text-black hover:bg-lime-300 transition-all shrink-0">
                        <Plus size={20} /> Add User
                    </button>
                </div>
            </header>

            <div className="glass-card overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-bold">Name</th>
                            <th className="p-4 font-bold">Email</th>
                            <th className="p-4 font-bold">Phone</th>
                            <th className="p-4 font-bold">Birth Date</th>
                            <th className="p-4 font-bold">Role</th>
                            <th className="p-4 font-bold text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 font-bold text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-emerald-400 flex items-center justify-center text-black font-black text-xs">
                                        {user.name.charAt(0)}
                                    </div>
                                    {user.name}
                                </td>
                                <td className="p-4 text-zinc-400 font-medium">{user.email}</td>
                                <td className="p-4 text-zinc-400 font-medium">{user.phone}</td>
                                <td className="p-4 text-zinc-400 font-medium">{user.birthDate || '-'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider ${user.role === 'super_admin' ? 'bg-amber-500/20 text-amber-400' :
                                        user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                            'bg-zinc-800 text-zinc-400'
                                        }`}>
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => handleEditClick(user)} className="p-2 bg-zinc-800 hover:bg-white hover:text-black rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="p-2 bg-zinc-800 hover:bg-red-500 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100">
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-black text-white mb-6">Edit User</h2>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><User size={14} /> Full Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Phone size={14} /> Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field w-full" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Birth Date</label>
                                <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="input-field w-full" />
                            </div>

                            <div className="pt-4 border-t border-white/10 mt-4">
                                <h3 className="text-sm font-bold mb-2 text-red-400 flex items-center gap-2"><Shield size={14} /> Security</h3>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Password</label>
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-field w-full" placeholder="Leave blank to keep current" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl font-bold hover:bg-white/10 transition-colors text-zinc-400">Cancel</button>
                                <button type="submit" className="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200 border border-zinc-800">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-black text-white mb-6">Add New User</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><User size={14} /> Full Name</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field w-full" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Shield size={14} /> Role</label>
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
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Mail size={14} /> Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field w-full" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Phone size={14} /> Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field w-full" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Calendar size={14} /> Birth Date</label>
                                <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="input-field w-full" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2"><Lock size={14} /> Password</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-field w-full" required />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl font-bold hover:bg-white/10 transition-colors text-zinc-400">Cancel</button>
                                <button type="submit" className="btn-primary">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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
        </div>
    );
};

export default AdminUsers;
