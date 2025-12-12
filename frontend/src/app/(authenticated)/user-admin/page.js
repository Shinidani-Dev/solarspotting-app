'use client';

import { useState, useEffect } from 'react';
import { 
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit2,
  Trash2,
  Tag,
  Lock,
  Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/buttons/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import apiClient from '@/api/apiClient';

export default function UserAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ========================================
  // ACCESS CONTROL
  // ========================================
  
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // ========================================
  // STATE
  // ========================================

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New User Form - basierend auf UserCreate Schema
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    firstname: '',
    lastname: '',
    email: '',
    date_of_birth: '',
    gender: 'male',
    street: '',
    postal_code: '',
    city: '',
    country: 'CH',
    company: '',
    state: '',
    phone: '',
    mobile: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  // Edit User
  const [editingUser, setEditingUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // ========================================
  // LOAD USERS
  // ========================================

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/users/');
      setUsers(response.data || []);
    } catch (err) {
      setError(`Fehler beim Laden der Benutzer: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // CREATE USER
  // ========================================

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      // Prepare payload - remove empty optional fields
      const payload = { ...newUser };
      if (!payload.company) delete payload.company;
      if (!payload.state) delete payload.state;
      if (!payload.phone) delete payload.phone;
      if (!payload.mobile) delete payload.mobile;

      await apiClient.post('/users/', payload);
      setSuccessMessage(`Benutzer "${newUser.username}" erfolgreich erstellt!`);
      setShowNewUserForm(false);
      resetNewUserForm();
      loadUsers();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const messages = detail.map(d => d.msg).join(', ');
        setError(`Validierungsfehler: ${messages}`);
      } else {
        setError(`Fehler beim Erstellen: ${detail || err.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const resetNewUserForm = () => {
    setNewUser({
      username: '',
      password: '',
      firstname: '',
      lastname: '',
      email: '',
      date_of_birth: '',
      gender: 'male',
      street: '',
      postal_code: '',
      city: '',
      country: 'CH',
      company: '',
      state: '',
      phone: '',
      mobile: ''
    });
  };

  // ========================================
  // UPDATE USER (Admin fields)
  // ========================================

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    setIsUpdating(true);
    setError(null);

    try {
      // PUT /users/{user_id} erwartet AdminUserUpdate Schema
      // Felder: role, is_labeler, locked, active (nach Backend-Fix)
      await apiClient.put(`/users/${editingUser.id}`, {
        role: editingUser.role,
        is_labeler: editingUser.is_labeler,
        locked: editingUser.locked || false,
        active: editingUser.active
      });

      setSuccessMessage(`Benutzer "${editingUser.username}" aktualisiert!`);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(`Fehler beim Aktualisieren: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // ========================================
  // TOGGLE FLAGS (Quick Actions)
  // ========================================

  const toggleActive = async (userToUpdate) => {
    try {
      // PUT /users/{user_id} mit AdminUserUpdate Schema
      await apiClient.put(`/users/${userToUpdate.id}`, {
        active: !userToUpdate.active
      });
      setSuccessMessage(`${userToUpdate.username} ${!userToUpdate.active ? 'aktiviert' : 'deaktiviert'}`);
      loadUsers();
    } catch (err) {
      setError(`Fehler: ${err.response?.data?.detail || err.message}`);
    }
  };

  const toggleLabeler = async (userToUpdate) => {
    try {
      // PUT /users/{user_id} mit AdminUserUpdate Schema
      await apiClient.put(`/users/${userToUpdate.id}`, {
        is_labeler: !userToUpdate.is_labeler
      });
      setSuccessMessage(`Labeler-Status für ${userToUpdate.username} geändert`);
      loadUsers();
    } catch (err) {
      setError(`Fehler: ${err.response?.data?.detail || err.message}`);
    }
  };

  // ========================================
  // DELETE USER
  // ========================================

  const handleDeleteUser = async (userToDelete) => {
    if (userToDelete.id === user?.id) {
      setError("Sie können sich nicht selbst löschen!");
      return;
    }

    const confirmDelete = window.confirm(
      `Benutzer "${userToDelete.username}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/users/${userToDelete.id}`);
      setSuccessMessage(`Benutzer "${userToDelete.username}" gelöscht`);
      loadUsers();
    } catch (err) {
      setError(`Fehler beim Löschen: ${err.message}`);
    }
  };

  // ========================================
  // CLEAR MESSAGES
  // ========================================

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ========================================
  // RENDER - Access Control
  // ========================================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-400" size={40} />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Zugriff verweigert</h1>
          <p className="text-slate-400">Diese Seite ist nur für Administratoren zugänglich.</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER - Main Content
  // ========================================

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-3">
              <Users size={32} />
              Benutzerverwaltung
            </h1>
            <p className="text-slate-400 mt-1">
              Benutzer verwalten, erstellen und Berechtigungen setzen
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={loadUsers}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Aktualisieren
            </Button>
            
            <Button
              variant="primary"
              onClick={() => setShowNewUserForm(true)}
              className="flex items-center gap-2"
            >
              <UserPlus size={18} />
              Neuer Benutzer
            </Button>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-3">
            <CheckCircle size={20} />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* New User Form */}
        {showNewUserForm && (
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <UserPlus size={24} className="text-amber-400" />
              Neuen Benutzer erstellen
            </h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Login-Daten */}
              <div className="border-b border-slate-700 pb-4 mb-4">
                <h3 className="text-sm font-medium text-amber-400 mb-3">Login-Daten</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Benutzername *</label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={64}
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      className="form-input w-full"
                      placeholder="max.muster"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">E-Mail *</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      className="form-input w-full"
                      placeholder="max@beispiel.ch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Passwort *</label>
                    <input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Min. 8 Zeichen"
                      minLength={8}
                    />
                    <p className="text-xs text-slate-500 mt-1">Gross-/Kleinbuchstaben, Zahl, Sonderzeichen</p>
                  </div>
                </div>
              </div>

              {/* Persönliche Daten */}
              <div className="border-b border-slate-700 pb-4 mb-4">
                <h3 className="text-sm font-medium text-amber-400 mb-3">Persönliche Daten</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Vorname *</label>
                    <input
                      type="text"
                      required
                      value={newUser.firstname}
                      onChange={(e) => setNewUser(prev => ({ ...prev, firstname: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Nachname *</label>
                    <input
                      type="text"
                      required
                      value={newUser.lastname}
                      onChange={(e) => setNewUser(prev => ({ ...prev, lastname: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Muster"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Geburtsdatum *</label>
                    <input
                      type="date"
                      required
                      value={newUser.date_of_birth}
                      onChange={(e) => setNewUser(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Geschlecht *</label>
                    <select
                      required
                      value={newUser.gender}
                      onChange={(e) => setNewUser(prev => ({ ...prev, gender: e.target.value }))}
                      className="form-input w-full"
                    >
                      <option value="male">Männlich</option>
                      <option value="female">Weiblich</option>
                      <option value="other">Andere</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="border-b border-slate-700 pb-4 mb-4">
                <h3 className="text-sm font-medium text-amber-400 mb-3">Adresse</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Strasse *</label>
                    <input
                      type="text"
                      required
                      value={newUser.street}
                      onChange={(e) => setNewUser(prev => ({ ...prev, street: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Musterstrasse 123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">PLZ *</label>
                    <input
                      type="text"
                      required
                      value={newUser.postal_code}
                      onChange={(e) => setNewUser(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="form-input w-full"
                      placeholder="3000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Ort *</label>
                    <input
                      type="text"
                      required
                      value={newUser.city}
                      onChange={(e) => setNewUser(prev => ({ ...prev, city: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Bern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Kanton</label>
                    <input
                      type="text"
                      value={newUser.state}
                      onChange={(e) => setNewUser(prev => ({ ...prev, state: e.target.value }))}
                      className="form-input w-full"
                      placeholder="BE"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Land * (2-Buchstaben)</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={newUser.country}
                      onChange={(e) => setNewUser(prev => ({ ...prev, country: e.target.value.toUpperCase() }))}
                      className="form-input w-full"
                      placeholder="CH"
                    />
                  </div>
                </div>
              </div>

              {/* Kontakt (Optional) */}
              <div className="border-b border-slate-700 pb-4 mb-4">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Kontakt (optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Firma</label>
                    <input
                      type="text"
                      value={newUser.company}
                      onChange={(e) => setNewUser(prev => ({ ...prev, company: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Firma AG"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                      className="form-input w-full"
                      placeholder="+41 31 123 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={newUser.mobile}
                      onChange={(e) => setNewUser(prev => ({ ...prev, mobile: e.target.value }))}
                      className="form-input w-full"
                      placeholder="+41 79 123 45 67"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreating}
                  className="flex items-center gap-2"
                >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {isCreating ? 'Erstelle...' : 'Benutzer erstellen'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowNewUserForm(false); resetNewUserForm(); }}
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="card overflow-hidden">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">
            Benutzer ({users.length})
          </h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-amber-400" size={32} />
            </div>
          ) : users.length === 0 ? (
            <p className="text-slate-500 text-center py-10">Keine Benutzer gefunden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="pb-3 pl-4">Benutzer</th>
                    <th className="pb-3">Rolle</th>
                    <th className="pb-3">Labeler</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-4 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                      <td className="py-3 pl-4">
                        <div>
                          <p className="text-slate-200 font-medium">
                            {u.firstname} {u.lastname}
                            {u.id === user?.id && (
                              <span className="ml-2 text-xs text-amber-400">(Du)</span>
                            )}
                          </p>
                          <p className="text-slate-500 text-xs">@{u.username} • {u.email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {u.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => toggleLabeler(u)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            u.is_labeler
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                          }`}
                          title="Klicken um zu ändern"
                        >
                          <Tag size={12} />
                          {u.is_labeler ? 'Ja' : 'Nein'}
                        </button>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={u.id === user?.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            u.active
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          } ${u.id === user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={u.id === user?.id ? 'Kann sich selbst nicht deaktivieren' : 'Klicken um zu ändern'}
                        >
                          {u.active ? <Check size={12} /> : <X size={12} />}
                          {u.active ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingUser({ ...u })}
                            className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === user?.id}
                            className={`p-1.5 text-slate-400 hover:text-red-400 transition-colors ${
                              u.id === user?.id ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title={u.id === user?.id ? 'Kann sich selbst nicht löschen' : 'Löschen'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Edit2 size={24} className="text-amber-400" />
                Benutzer bearbeiten
              </h2>
              
              {/* User Info (read-only) */}
              <div className="mb-4 p-3 bg-slate-800 rounded-lg">
                <p className="text-slate-200 font-medium">{editingUser.firstname} {editingUser.lastname}</p>
                <p className="text-slate-400 text-sm">@{editingUser.username}</p>
                <p className="text-slate-500 text-xs">{editingUser.email}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rolle</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                    className="form-input w-full"
                    disabled={editingUser.id === user?.id}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {editingUser.id === user?.id && (
                    <p className="text-slate-500 text-xs mt-1">Eigene Rolle kann nicht geändert werden</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={editingUser.is_labeler}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, is_labeler: e.target.checked }))}
                      className="form-checkbox"
                    />
                    <span className="text-slate-300 flex-1">Labeler-Berechtigung</span>
                    <Tag size={16} className={editingUser.is_labeler ? 'text-amber-400' : 'text-slate-500'} />
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-800 ${editingUser.id === user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={editingUser.active}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, active: e.target.checked }))}
                      className="form-checkbox"
                      disabled={editingUser.id === user?.id}
                    />
                    <span className="text-slate-300 flex-1">Benutzer aktiv</span>
                    {editingUser.active ? (
                      <CheckCircle size={16} className="text-green-400" />
                    ) : (
                      <X size={16} className="text-red-400" />
                    )}
                  </label>

                  <label className={`flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-800 ${editingUser.id === user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={editingUser.locked || false}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, locked: e.target.checked }))}
                      className="form-checkbox"
                      disabled={editingUser.id === user?.id}
                    />
                    <span className="text-slate-300 flex-1">Benutzer gesperrt</span>
                    {editingUser.locked ? (
                      <Lock size={16} className="text-red-400" />
                    ) : (
                      <Unlock size={16} className="text-slate-500" />
                    )}
                  </label>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="primary"
                  onClick={handleUpdateUser}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {isUpdating ? 'Speichere...' : 'Speichern'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}