import { useState, useEffect } from 'react';
import { useCustomerStore } from '../stores/customerStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import {
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Calendar as CalendarIcon,
  Edit3,
  Trash2,
  X,
  MessageSquare,
  MoreVertical
} from 'lucide-react';
import type { Customer } from '../types';

export const Customers: React.FC = () => {
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
  const { appointments, fetchAppointments } = useAppointmentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [nombre, setNombre] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchAppointments();
  }, [fetchCustomers, fetchAppointments]);

  const filteredCustomers = customers.filter(c => {
    const term = `${c.nombre} ${c.telefono}`.toLowerCase();
    return term.includes(searchQuery.toLowerCase());
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !phone) return;
    const res = await addCustomer({
      nombre,
      telefono: phone,
      email: email || null,
      notas: notes || null
    });
    if (res) {
      setNombre(''); setPhone(''); setEmail(''); setNotes('');
      setShowCreateModal(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !nombre || !phone) return;
    const success = await updateCustomer(selectedCust.id, {
      nombre, telefono: phone, email: email || null, notas: notes || null
    });
    if (success) {
      setShowEditModal(false);
      setSelectedCust(null);
    }
  };

  const openEditModal = (cust: Customer) => {
    setSelectedCust(cust);
    setNombre(cust.nombre);
    setPhone(cust.telefono);
    setEmail(cust.email || '');
    setNotes(cust.notas || '');
    setShowEditModal(true);
    setShowDetailsModal(false);
    setMenuOpen(null);
  };

  const openDetailsModal = (cust: Customer) => {
    setSelectedCust(cust);
    setShowDetailsModal(true);
    setMenuOpen(null);
  };

  const handleDeleteCustomer = async (id: string) => {
    setMenuOpen(null);
    if (confirm('¿Estás seguro de que quieres eliminar este cliente? Se borrará todo su historial.')) {
      const res = await deleteCustomer(id);
      if (res) {
        setShowDetailsModal(false);
        setSelectedCust(null);
      }
    }
  };

  const getCustomerAppointments = (custId: string) => {
    return appointments.filter(apt => apt.customer_id === custId);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black m-0">Clientes</h1>
          <p className="text-neutral-500 m-0 mt-0.5 text-xs md:text-sm">Directorio e historial.</p>
        </div>
        <button onClick={() => { setNombre(''); setPhone(''); setEmail(''); setNotes(''); setShowCreateModal(true); }}
          className="bg-black hover:bg-neutral-900 text-white font-black px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg flex items-center gap-2 cursor-pointer shadow-md"
        ><Plus className="w-4 h-5" /><span className="hidden md:inline">Añadir Cliente</span><span className="md:hidden">Nuevo</span></button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Buscar por nombre o teléfono..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white border border-neutral-200 text-sm md:text-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold text-black font-semibold" />
      </div>

      <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
        {filteredCustomers.length === 0 ? (
          <div className="md:col-span-full bg-white rounded-2xl md:rounded-3xl p-8 border border-neutral-200 text-center">
            <h3 className="text-base font-bold text-black m-0">Ningún cliente coincide</h3>
            <p className="text-sm text-neutral-400 m-0 mt-1">Intenta buscar por otro nombre.</p>
          </div>
        ) : (
          filteredCustomers.map(cust => {
            const lastVisitDisplay = cust.ultima_visita
              ? new Date(cust.ultima_visita).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Primera cita';
            return (
              <div key={cust.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-6 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1" onClick={() => openDetailsModal(cust)}>
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center font-black text-base md:text-2xl shrink-0">
                      {cust.nombre.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base md:text-xl font-bold text-black truncate m-0">{cust.nombre}</h3>
                      <p className="text-xs md:text-sm text-neutral-500 font-semibold m-0 flex items-center gap-1"><Phone className="w-3 h-3" />+{cust.telefono}</p>
                    </div>
                  </div>
                  <div className="relative shrink-0 ml-2">
                    <button onClick={() => setMenuOpen(menuOpen === cust.id ? null : cust.id)} className="p-2 hover:bg-neutral-100 rounded-lg cursor-pointer">
                      <MoreVertical className="w-5 h-5 text-neutral-400" />
                    </button>
                    {menuOpen === cust.id && (
                      <div className="absolute right-0 top-10 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 w-36 overflow-hidden">
                        <button onClick={() => openEditModal(cust)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"><Edit3 className="w-4 h-4" />Editar</button>
                        <button onClick={() => handleDeleteCustomer(cust.id)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" />Eliminar</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-neutral-100 pt-3 mt-3 flex items-center justify-between text-xs md:text-sm">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Última Visita</span>
                    <span className="text-xs md:text-sm font-bold text-neutral-800">{lastVisitDisplay}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Ingresos</span>
                    <span className="text-xs md:text-sm font-bold text-emerald-600 block">{cust.gasto_total}€</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      <CustomerSheet show={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Cliente">
        <form onSubmit={handleCreateCustomer} className="space-y-4 py-4">
          <Field label="Nombre" required>
            <input type="text" required placeholder="Ej: Carlos" value={nombre} onChange={e => setNombre(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </Field>
          <Field label="Teléfono (WhatsApp)" required>
            <input type="tel" required placeholder="Ej: 34600111222" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </Field>
          <Field label="Correo Electrónico">
            <input type="email" placeholder="Ej: carlos@example.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </Field>
          <Field label="Notas">
            <textarea placeholder="Ej: Prefiere corte degradado con pomada..." value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </Field>
          <div className="flex gap-3 px-4 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 bg-black hover:bg-neutral-900 text-white font-black py-3 rounded-xl text-sm transition-all cursor-pointer">Guardar</button>
          </div>
        </form>
      </CustomerSheet>

      {/* EDIT MODAL */}
      <CustomerSheet show={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Cliente">
        {selectedCust && (
          <form onSubmit={handleEditCustomer} className="space-y-4 py-4">
            <Field label="Nombre" required>
              <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
            </Field>
            <Field label="Teléfono" required>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
            </Field>
            <Field label="Correo Electrónico">
              <input type="email" placeholder="Ej: carlos@example.com" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
            </Field>
            <Field label="Notas">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
            </Field>
            <div className="flex gap-3 px-4 pt-2">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" className="flex-1 bg-black hover:bg-neutral-900 text-white font-black py-3 rounded-xl text-sm transition-all cursor-pointer">Guardar</button>
            </div>
          </form>
        )}
      </CustomerSheet>

      {/* DETAIL MODAL */}
      <CustomerSheet show={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Perfil del Cliente">
        {selectedCust && (
          <div className="space-y-4 py-4">
            <div className="mx-4 flex items-center gap-4 bg-neutral-50 p-4 md:p-6 rounded-2xl border border-neutral-100">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center font-black text-xl md:text-2xl shrink-0">
                {selectedCust.nombre.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-2xl font-bold text-black m-0 truncate">{selectedCust.nombre}</h3>
                <div className="flex flex-col gap-0.5 mt-1 text-xs md:text-sm text-neutral-500 font-semibold">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gold-dark" />+{selectedCust.telefono}</span>
                  {selectedCust.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gold-dark" />{selectedCust.email}</span>}
                </div>
              </div>
            </div>

            <div className="mx-4 flex gap-2">
              <a href={`https://wa.me/${selectedCust.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-[#25D366] hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
              <button onClick={() => openEditModal(selectedCust)}
                className="px-4 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold rounded-xl cursor-pointer"><Edit3 className="w-5 h-5" /></button>
              <button onClick={() => handleDeleteCustomer(selectedCust.id)}
                className="px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl cursor-pointer"><Trash2 className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-3 gap-2 mx-4 border border-neutral-100 p-4 rounded-2xl bg-neutral-50/30">
              <div className="text-center border-r border-neutral-100">
                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Visitas</span>
                <span className="text-base font-black text-neutral-900 block mt-1">{selectedCust.numero_visitas}</span>
              </div>
              <div className="text-center border-r border-neutral-100">
                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Gasto</span>
                <span className="text-base font-black text-emerald-600 block mt-1">{selectedCust.gasto_total}€</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Alta</span>
                <span className="text-xs font-bold text-neutral-800 block mt-1 truncate">{new Date(selectedCust.fecha_registro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
              </div>
            </div>

            <div className="mx-4 space-y-2">
              <span className="text-sm font-bold text-neutral-600 flex items-center gap-2"><FileText className="w-4 h-4 text-gold-dark" />Observaciones</span>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-neutral-800 text-sm">{selectedCust.notas || 'Sin notas registradas.'}</div>
            </div>

            <div className="mx-4 space-y-3">
              <span className="text-sm font-bold text-neutral-600 flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gold-dark" />Historial de Citas</span>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {getCustomerAppointments(selectedCust.id).length === 0 ? (
                  <p className="text-neutral-400 text-center py-6 text-sm">Sin citas registradas.</p>
                ) : (
                  getCustomerAppointments(selectedCust.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).map(apt => (
                    <div key={apt.id} className="border border-neutral-100 rounded-2xl p-3 md:p-4 flex justify-between items-center gap-4 bg-white">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-neutral-400">{new Date(apt.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} a las {apt.hora}</span>
                        <p className="text-sm md:text-base font-bold text-black m-0 mt-0.5 truncate">{apt.service?.nombre}</p>
                        {apt.notes && <p className="text-xs text-neutral-500 m-0 italic mt-1 truncate">"{apt.notes}"</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-black block">{apt.price_charged}€</span>
                        <span className={`text-xs font-bold capitalize mt-0.5 inline-block ${apt.estado === 'completed' ? 'text-emerald-600' : apt.estado === 'cancelled' ? 'text-red-500' : 'text-amber-600'}`}>
                          {apt.estado === 'completed' ? 'Realizada' : apt.estado === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-4 pb-2">
              <button onClick={() => setShowDetailsModal(false)} className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer">Cerrar</button>
            </div>
          </div>
        )}
      </CustomerSheet>
    </div>
  );
};

function CustomerSheet({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center animate-fade-in">
      <div className="bg-white w-full md:max-w-lg md:rounded-3xl md:m-4 rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-neutral-100 rounded-t-3xl">
          <h2 className="text-lg font-black text-black m-0">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="px-4">
      <label className="block text-xs font-bold text-neutral-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
