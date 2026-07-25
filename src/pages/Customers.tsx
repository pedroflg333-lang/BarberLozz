import { useState, useEffect } from 'react';
import { useCustomerStore } from '../stores/customerStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { Card, Button, Modal, Input, Badge, EmptyState, MenuDropdown } from '../ui';
import {
  Plus, Search, Phone, Mail, FileText, Calendar as CalendarIcon,
  Edit3, Trash2, MessageSquare
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

  useEffect(() => { fetchCustomers(); fetchAppointments(); }, [fetchCustomers, fetchAppointments]);

  const filteredCustomers = customers.filter(c => {
    const term = `${c.nombre} ${c.telefono}`.toLowerCase();
    return term.includes(searchQuery.toLowerCase());
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !phone) return;
    const res = await addCustomer({ nombre, telefono: phone, email: email || null, notas: notes || null });
    if (res) { setNombre(''); setPhone(''); setEmail(''); setNotes(''); setShowCreateModal(false); }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !nombre || !phone) return;
    const success = await updateCustomer(selectedCust.id, { nombre, telefono: phone, email: email || null, notas: notes || null });
    if (success) { setShowEditModal(false); setSelectedCust(null); }
  };

  const openEditModal = (cust: Customer) => {
    setSelectedCust(cust); setNombre(cust.nombre); setPhone(cust.telefono);
    setEmail(cust.email || ''); setNotes(cust.notas || ''); setShowEditModal(true); setShowDetailsModal(false);
  };

  const openDetailsModal = (cust: Customer) => { setSelectedCust(cust); setShowDetailsModal(true); };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente? Se borrará todo su historial.')) {
      const res = await deleteCustomer(id);
      if (res) { setShowDetailsModal(false); setSelectedCust(null); }
    }
  };

  const getCustomerAppointments = (custId: string) => appointments.filter(apt => apt.customer_id === custId);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-text-primary m-0">Clientes</h1>
          <p className="text-text-secondary m-0 mt-0.5 text-xs md:text-sm">Directorio e historial.</p>
        </div>
        <Button variant="primary" size="lg" icon={<Plus className="w-4 h-5" />} onClick={() => { setNombre(''); setPhone(''); setEmail(''); setNotes(''); setShowCreateModal(true); }}>
          <span className="hidden md:inline">Añadir Cliente</span><span className="md:hidden">Nuevo</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 text-text-tertiary absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="Buscar por nombre o teléfono..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 md:py-4 rounded-btn bg-surface border border-border text-sm md:text-lg placeholder:text-text-tertiary focus-ring outline-none text-text-primary font-semibold" />
      </div>

      <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
        {filteredCustomers.length === 0 ? (
          <div className="md:col-span-full"><EmptyState title="Ningún cliente coincide" description="Intenta buscar por otro nombre." /></div>
        ) : filteredCustomers.map(cust => {
          const lastVisitDisplay = cust.ultima_visita
            ? new Date(cust.ultima_visita).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Primera cita';
          return (
            <Card key={cust.id} className="relative overflow-hidden cursor-pointer" onClick={() => openDetailsModal(cust)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center font-black text-base md:text-2xl shrink-0">
                    {cust.nombre.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-xl font-bold text-text-primary truncate m-0">{cust.nombre}</h3>
                    <p className="text-xs md:text-sm text-text-secondary font-semibold m-0 flex items-center gap-1"><Phone className="w-3 h-3" />+{cust.telefono}</p>
                  </div>
                </div>
                <div className="shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  <MenuDropdown items={[
                    { label: 'Editar', onClick: () => openEditModal(cust), icon: <Edit3 className="w-4 h-4" /> },
                    { label: 'Eliminar', onClick: () => handleDeleteCustomer(cust.id), danger: true, icon: <Trash2 className="w-4 h-4" /> },
                  ]} />
                </div>
              </div>
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between text-xs md:text-sm">
                <div>
                  <span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Última Visita</span>
                  <span className="text-xs md:text-sm font-bold text-text-primary">{lastVisitDisplay}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Ingresos</span>
                  <span className="text-xs md:text-sm font-bold text-success block">{cust.gasto_total}€</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Cliente">
        <form onSubmit={handleCreateCustomer} className="space-y-4 py-2">
          <Input label="Nombre" required placeholder="Ej: Carlos" value={nombre} onChange={e => setNombre(e.target.value)} />
          <Input label="Teléfono (WhatsApp)" required type="tel" placeholder="Ej: 34600111222" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} />
          <Input label="Correo Electrónico" type="email" placeholder="Ej: carlos@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Notas" placeholder="Ej: Prefiere corte degradado con pomada..." value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Cliente">
        {selectedCust && (
          <form onSubmit={handleEditCustomer} className="space-y-4 py-2">
            <Input label="Nombre" required value={nombre} onChange={e => setNombre(e.target.value)} />
            <Input label="Teléfono" required type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} />
            <Input label="Correo Electrónico" type="email" placeholder="Ej: carlos@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Notas" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">Guardar</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Perfil del Cliente">
        {selectedCust && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-neutral-50 p-4 md:p-6 rounded-card border border-border">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center font-black text-xl md:text-2xl shrink-0">
                {selectedCust.nombre.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-2xl font-bold text-text-primary m-0 truncate">{selectedCust.nombre}</h3>
                <div className="flex flex-col gap-0.5 mt-1 text-xs md:text-sm text-text-secondary font-semibold">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gold-dark" />+{selectedCust.telefono}</span>
                  {selectedCust.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gold-dark" />{selectedCust.email}</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <a href={`https://wa.me/${selectedCust.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-[#25D366] hover:bg-emerald-600 text-white font-bold py-3 rounded-btn text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
              <Button variant="ghost" icon={<Edit3 className="w-4 h-5" />} onClick={() => openEditModal(selectedCust)} className="px-4" />
              <Button variant="ghost" icon={<Trash2 className="w-4 h-5" />} onClick={() => handleDeleteCustomer(selectedCust.id)} className="px-4 text-red-600 hover:bg-red-50" />
            </div>

            <div className="grid grid-cols-3 gap-2 border border-border p-4 rounded-card bg-neutral-50/30">
              <div className="text-center border-r border-border">
                <span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Visitas</span>
                <span className="text-base font-black text-text-primary block mt-1">{selectedCust.numero_visitas}</span>
              </div>
              <div className="text-center border-r border-border">
                <span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Gasto</span>
                <span className="text-base font-black text-success block mt-1">{selectedCust.gasto_total}€</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Alta</span>
                <span className="text-xs font-bold text-text-primary block mt-1 truncate">{new Date(selectedCust.fecha_registro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-bold text-text-secondary flex items-center gap-2"><FileText className="w-4 h-4 text-gold-dark" />Observaciones</span>
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-card text-text-primary text-sm">{selectedCust.notas || 'Sin notas registradas.'}</div>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-bold text-text-secondary flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-gold-dark" />Historial de Citas</span>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {getCustomerAppointments(selectedCust.id).length === 0 ? (
                  <p className="text-text-tertiary text-center py-6 text-sm">Sin citas registradas.</p>
                ) : (
                  getCustomerAppointments(selectedCust.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).map(apt => (
                    <div key={apt.id} className="border border-border rounded-card p-3 md:p-4 flex justify-between items-center gap-4 bg-surface">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-text-tertiary">{new Date(apt.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} a las {apt.hora}</span>
                        <p className="text-sm md:text-base font-bold text-text-primary m-0 mt-0.5 truncate">{apt.service?.nombre}</p>
                        {apt.notes && <p className="text-xs text-text-secondary m-0 italic mt-1 truncate">"{apt.notes}"</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-text-primary block">{apt.price_charged}€</span>
                        <Badge variant={apt.estado === 'completed' ? 'success' : apt.estado === 'cancelled' ? 'error' : 'warning'} size="sm">
                          {apt.estado === 'completed' ? 'Realizada' : apt.estado === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button variant="ghost" onClick={() => setShowDetailsModal(false)} className="w-full">Cerrar</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
