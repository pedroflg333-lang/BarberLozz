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
  MessageSquare
} from 'lucide-react';
import type { Customer } from '../types';

export const Customers: React.FC = () => {
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
  const { appointments, fetchAppointments } = useAppointmentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  
  // Modals status
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

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
      setNombre('');
      setPhone('');
      setEmail('');
      setNotes('');
      setShowCreateModal(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !nombre || !phone) return;

    const success = await updateCustomer(selectedCust.id, {
      nombre,
      telefono: phone,
      email: email || null,
      notas: notes || null
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
  };

  const openDetailsModal = (cust: Customer) => {
    setSelectedCust(cust);
    setShowDetailsModal(true);
  };

  const handleDeleteCustomer = async (id: string) => {
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
    <div className="space-y-6 animate-fade-in">
      {/* Header and Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black m-0">Directorio de Clientes</h1>
          <p className="text-neutral-500 m-0 mt-1">Gestiona los historiales, teléfonos y detalles de tus clientes.</p>
        </div>
        <button
          onClick={() => {
            setNombre('');
            setPhone('');
            setEmail('');
            setNotes('');
            setShowCreateModal(true);
          }}
          className="bg-black hover:bg-neutral-900 text-white font-black px-6 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <Plus className="w-5 h-5" />
          Añadir Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-6 h-6 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nombre o número de teléfono..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-neutral-200 text-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold text-black focus-gold shadow-sm font-semibold"
        />
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-16 border border-neutral-200 text-center space-y-3">
            <h3 className="text-xl font-bold text-black m-0">Ningún cliente coincide</h3>
            <p className="text-neutral-400 m-0">Intenta buscar por otro nombre o agrega un cliente nuevo.</p>
          </div>
        ) : (
          filteredCustomers.map(cust => {
            const lastVisitDisplay = cust.ultima_visita
              ? new Date(cust.ultima_visita).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Primera cita';

            return (
              <div
                key={cust.id}
                onClick={() => openDetailsModal(cust)}
                className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-52 hover:border-gold-dark"
              >
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-black m-0 truncate">
                    {cust.nombre}
                  </h3>
                  <p className="text-base text-neutral-500 font-semibold m-0 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gold-dark shrink-0" />
                    +{cust.telefono}
                  </p>
                </div>

                <div className="border-t border-neutral-100 pt-4 mt-2 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Última Visita</span>
                    <span className="text-sm font-bold text-neutral-800">{lastVisitDisplay}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Ingresos</span>
                    <span className="text-sm font-bold text-emerald-600 block">{cust.gasto_total}€</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE CLIENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 border border-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-2xl font-black text-black m-0">Nuevo Cliente</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-neutral-700">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Número de Teléfono (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 34600111222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  placeholder="Ej: carlos@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Notas Generales</label>
                <textarea
                  placeholder="Ej: Prefiere corte degradado con pomada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-4 py-3 rounded-xl text-base flex-1 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black hover:bg-neutral-900 text-white font-black px-4 py-3 rounded-xl text-base flex-1 transition-all cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {showEditModal && selectedCust && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 border border-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-2xl font-black text-black m-0">Editar Cliente</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-neutral-700">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Número de Teléfono *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 34600111222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej: carlos@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Notas Generales</label>
                <textarea
                  placeholder="Ej: Piel sensible..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold px-4 py-3 rounded-xl text-base flex-1 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gold hover:bg-gold-dark text-black font-black px-4 py-3 rounded-xl text-base flex-1 transition-all border border-gold cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED CLIENT PROFILE DIALOG */}
      {showDetailsModal && selectedCust && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 border border-neutral-100 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-2xl font-black text-black m-0">Perfil del Cliente</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center font-black text-2xl shrink-0">
                  {selectedCust.nombre.slice(0,1).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-black m-0">
                    {selectedCust.nombre}
                  </h3>
                  <div className="flex flex-col gap-1 mt-1 text-sm text-neutral-500 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-gold-dark" />
                      +{selectedCust.telefono}
                    </span>
                    {selectedCust.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-gold-dark" />
                        {selectedCust.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct message options */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`https://wa.me/${selectedCust.telefono.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-emerald-600 text-white font-bold p-3 rounded-xl transition-colors flex items-center gap-1.5 flex-1 sm:flex-initial justify-center shadow-sm"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => openEditModal(selectedCust)}
                  className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold p-3 rounded-xl transition-colors flex-1 sm:flex-initial"
                  title="Editar datos"
                >
                  <Edit3 className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => handleDeleteCustomer(selectedCust.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold p-3 rounded-xl transition-colors flex-1 sm:flex-initial"
                  title="Borrar de la base de datos"
                >
                  <Trash2 className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>

            {/* General metrics */}
            <div className="grid grid-cols-3 gap-4 border border-neutral-100 p-5 rounded-2xl bg-neutral-50/30">
              <div className="text-center border-r border-neutral-100">
                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Visitas</span>
                <span className="text-lg font-black text-neutral-900 block mt-1">{selectedCust.numero_visitas} veces</span>
              </div>
              
              <div className="text-center border-r border-neutral-100">
                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Total gastado</span>
                <span className="text-lg font-black text-emerald-600 block mt-1">{selectedCust.gasto_total}€</span>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-neutral-400 uppercase font-black tracking-wider block">Fecha de Alta</span>
                <span className="text-sm font-bold text-neutral-800 block mt-1 truncate">
                  {new Date(selectedCust.fecha_registro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <span className="text-base font-bold text-neutral-600 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-dark" />
                Observaciones generales
              </span>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-neutral-800 text-base">
                {selectedCust.notas || 'No se han registrado notas técnicas para este cliente.'}
              </div>
            </div>

            {/* Appointments History List */}
            <div className="space-y-3">
              <span className="text-base font-bold text-neutral-600 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gold-dark" />
                Historial de Citas
              </span>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {getCustomerAppointments(selectedCust.id).length === 0 ? (
                  <p className="text-neutral-400 text-center py-6 text-sm">Este cliente no tiene citas en el sistema.</p>
                ) : (
                  getCustomerAppointments(selectedCust.id)
                    .sort((a,b) => b.fecha.localeCompare(a.fecha))
                    .map(apt => (
                      <div key={apt.id} className="border border-neutral-100 rounded-2xl p-4 flex justify-between items-center gap-4 bg-white hover:bg-neutral-50">
                        <div>
                          <span className="text-sm font-semibold text-neutral-400">
                            {new Date(apt.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} a las {apt.hora}
                          </span>
                          <p className="text-base font-bold text-black m-0 mt-0.5">{apt.service?.nombre}</p>
                          {apt.notes && <p className="text-xs text-neutral-500 m-0 italic mt-1">"{apt.notes}"</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-black block">{apt.price_charged}€</span>
                          <span className={`text-xs font-bold capitalize mt-0.5 inline-block ${
                            apt.estado === 'completed' 
                              ? 'text-emerald-600' 
                              : apt.estado === 'cancelled' 
                                ? 'text-red-500' 
                                : 'text-amber-600'
                          }`}>
                            {apt.estado === 'completed' ? 'Realizada' : apt.estado === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full text-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3.5 px-4 rounded-xl text-base transition-colors cursor-pointer"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
