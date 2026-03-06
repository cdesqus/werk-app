import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { Search, Edit, DollarSign, Plus, Trash2, Save, X, CreditCard } from 'lucide-react';
import clsx from 'clsx';

export default function AdminSalaryMaster() {
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ baseSalary: 0, bankDetails: '', allowances: [] });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/salary');
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch salary master", error);
            toast.error("Failed to fetch data");
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            baseSalary: user.baseSalary || 0,
            bankDetails: user.bankDetails || '',
            allowances: user.allowances ? [...user.allowances] : []
        });
    };

    const handleAddAllowance = () => {
        setFormData({
            ...formData,
            allowances: [...formData.allowances, { id: Date.now().toString(), name: '', amount: 0, type: 'monthly' }]
        });
    };

    const handleUpdateAllowance = (index, field, value) => {
        const newAllowances = [...formData.allowances];
        newAllowances[index][field] = value;
        setFormData({ ...formData, allowances: newAllowances });
    };

    const handleRemoveAllowance = (index) => {
        const newAllowances = [...formData.allowances];
        newAllowances.splice(index, 1);
        setFormData({ ...formData, allowances: newAllowances });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/salary/${editingUser.id}`, {
                baseSalary: formData.baseSalary,
                bankDetails: formData.bankDetails,
                allowances: formData.allowances.filter(a => a.name.trim() !== '' && a.amount > 0)
            });
            toast.success('Salary Master updated!');
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update user');
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.staffId && user.staffId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Salary Master</h1>
                    <p className="text-muted-foreground">Manage base salaries and custom allowances (monthly/yearly) for your staff.</p>
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Search staff members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10 w-full"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Staff Details</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Base Salary</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Bank Details</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Allowances (Total/Mo)</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.map((user) => {
                                const activeMonthlyAllowances = (user.allowances || []).filter(a => a.type === 'monthly');
                                const totalMonthly = activeMonthlyAllowances.reduce((s, a) => s + (parseInt(a.amount) || 0), 0) + (user.fixedAllowance || 0);

                                return (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground">{user.name}</div>
                                                    <div className="text-xs text-muted-foreground">{user.staffId || user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            Rp {(user.baseSalary || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs">
                                            {user.bankDetails ? user.bankDetails : <span className="opacity-50 italic">Not set</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {totalMonthly > 0 ? (
                                                <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                                    + Rp {totalMonthly.toLocaleString('id-ID')}
                                                </div>
                                            ) : <span className="text-muted-foreground opacity-50">-</span>}
                                            {user.allowances && user.allowances.some(a => a.type === 'yearly') && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase font-bold mt-1 inline-block">Has Yearly</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="p-2 text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 rounded-lg transition-colors inline-block"
                                                title="Edit Salary Details"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                                        No staff members found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Salary Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Edit Salary Master</h3>
                                <p className="text-sm text-muted-foreground">Managing compensation for <span className="font-bold text-foreground">{editingUser.name}</span></p>
                            </div>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="salaryForm" onSubmit={handleUpdate} className="space-y-6">

                                {/* Base Rate */}
                                <div className="space-y-4">
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Base Compensation</div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <DollarSign size={14} /> Base Salary (IDR)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold bg-muted/50 px-2 py-0.5 rounded text-xs pointer-events-none">Rp</span>
                                                <input
                                                    type="text"
                                                    value={formData.baseSalary === 0 ? '' : formData.baseSalary}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setFormData({ ...formData, baseSalary: val ? parseInt(val) : '' });
                                                    }}
                                                    className="input-field w-full !pl-12 font-mono text-lg font-bold"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <CreditCard size={14} /> Bank Details
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.bankDetails}
                                                onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                                                className="input-field w-full h-10"
                                                placeholder="BCA - 123456789 (John Doe)"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Allowances */}
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Custom Allowances</div>
                                        <button
                                            type="button"
                                            onClick={handleAddAllowance}
                                            className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg flex items-center gap-1.5 transition-colors"
                                        >
                                            <Plus size={14} /> Add Allowance
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {formData.allowances.length === 0 ? (
                                            <div className="text-center p-6 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                                                No specific allowances configured for this user.
                                            </div>
                                        ) : (
                                            formData.allowances.map((allowance, idx) => (
                                                <div key={allowance.id} className="flex gap-3 items-end p-3 bg-muted/30 border border-border rounded-xl">
                                                    <div className="flex-1 space-y-1.5">
                                                        <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Allowance Name</label>
                                                        <input
                                                            type="text"
                                                            value={allowance.name}
                                                            onChange={e => handleUpdateAllowance(idx, 'name', e.target.value)}
                                                            placeholder="e.g. Transport, THR"
                                                            className="input-field w-full"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="w-32 space-y-1.5">
                                                        <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Type</label>
                                                        <select
                                                            value={allowance.type}
                                                            onChange={e => handleUpdateAllowance(idx, 'type', e.target.value)}
                                                            className="input-field w-full"
                                                        >
                                                            <option value="monthly">Monthly</option>
                                                            <option value="yearly">Yearly</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-40 space-y-1.5">
                                                        <label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Amount (IDR)</label>
                                                        <input
                                                            type="text"
                                                            value={allowance.amount === 0 ? '' : allowance.amount}
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/\D/g, '');
                                                                handleUpdateAllowance(idx, 'amount', val ? parseInt(val) : 0);
                                                            }}
                                                            placeholder="0"
                                                            className="input-field w-full font-mono"
                                                            required
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAllowance(idx)}
                                                        className="h-9 w-9 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        <strong className="text-foreground">Monthly:</strong> Automatically pushed to payroll calculations every month. <br />
                                        <strong className="text-foreground">Yearly:</strong> Stored separately (e.g. THR, Bonus). Must be triggered or included manually when generating payslip amounts.
                                    </p>
                                </div>

                            </form>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="salaryForm"
                                className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <Save size={16} /> Save Salary Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
