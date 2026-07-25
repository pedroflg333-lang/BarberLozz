import { useState, useEffect } from 'react';
import { useServiceStore } from '../stores/serviceStore';
import { Card, Button, Modal, Input, EmptyState, MenuDropdown } from '../ui';
import { Plus, Clock, Edit3, Trash2, Check } from 'lucide-react';
import type { Service } from '../types';

const PRESET_COLORS = [
  '#D4AF37', '#4B5563', '#10B981', '#3B82F6',
  '#EF4444', '#8B5CF6', '#F59E0B', '#EC4899'
];

export const Services: React.FC = () => {
  const { services, fetchServices, addService, updateService, deleteService } = useServiceStore();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(15.00);
  const [duracion, setDuracion] = useState(30);
  const [color, setColor] = useState('#D4AF37');
  const [descripcion, setDescripcion] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const resetForm = () => { setNombre(''); setPrecio(15); setDuracion(30); setColor('#D4AF37'); setDescripcion(''); };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || precio <= 0 || duracion <= 0) return;
    const res = await addService({ nombre, precio: Number(precio), duracion: Number(duracion), color, descripcion: descripcion || null, is_active: true });
    if (res) { resetForm(); setShowCreateModal(false); setCreateError(null); }
    else setCreateError(useServiceStore.getState().error || 'Error al crear.');
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !nombre || precio <= 0 || duracion <= 0) return;
    const success = await updateService(selectedService.id, { nombre, precio: Number(precio), duracion: Number(duracion), color, descripcion: descripcion || null });
    if (success) { setShowEditModal(false); setSelectedService(null); setEditError(null); }
    else setEditError(useServiceStore.getState().error || 'Error al guardar.');
  };

  const openEditModal = (srv: Service) => {
    setSelectedService(srv);
    setNombre(srv.nombre);
    setPrecio(srv.precio);
    setDuracion(srv.duracion);
    setColor(srv.color);
    setDescripcion(srv.descripcion || '');
    setShowEditModal(true);
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('¿Eliminar este servicio?')) await deleteService(id);
  };

  const serviceForm = (editing: boolean) => (
    <>
      <Input label="Nombre *" required placeholder="Ej: Corte Degradado" value={nombre} onChange={e => setNombre(e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Precio (€) *" type="number" step="0.01" min="1" required value={precio} onChange={e => setPrecio(Number(e.target.value))} />
        <Input label="Duración (min) *" type="number" min="5" step="5" required value={duracion} onChange={e => setDuracion(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-sm font-bold text-neutral-700 mb-2">Descripción</label>
        <textarea placeholder="Descripción del servicio..." value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
          className="w-full px-4 py-3 rounded-btn bg-white border border-border text-sm mt-1 focus-ring outline-none transition-btn" />
      </div>
      <div>
        <label className="block text-sm font-bold text-neutral-700 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-9 h-9 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center focus-ring"
              style={{ backgroundColor: c, borderColor: color === c ? '#000' : 'transparent' }}
              aria-label={`Color ${c}`} aria-pressed={color === c}
            >{color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}</button>
          ))}
        </div>
      </div>
      {editing && editError && <div className="bg-error-bg border border-error-border text-error px-4 py-3 rounded-xl text-sm font-semibold">{editError}</div>}
    </>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-text-primary m-0">Servicios</h1>
          <p className="text-text-secondary m-0 mt-0.5 text-xs md:text-sm">Precios, duración y colores.</p>
        </div>
        <Button variant="primary" size="lg" icon={<Plus className="w-4 h-5" />} onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <span className="hidden md:inline">Añadir Servicio</span><span className="md:hidden">Nuevo</span>
        </Button>
      </div>

      <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
        {services.length === 0 ? (
          <div className="md:col-span-full">
            <EmptyState title="No hay servicios" description="Crea tu primer servicio." />
          </div>
        ) : services.map(srv => (
          <Card key={srv.id} className="relative overflow-hidden" style={{ paddingTop: '0.5rem' }}>
            <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: srv.color }} />
            <div className="flex items-start justify-between mt-1">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-2xl font-extrabold text-text-primary truncate m-0">{srv.nombre}</h3>
                <p className="text-xs text-text-tertiary font-semibold line-clamp-2 mt-0.5 m-0">{srv.descripcion || 'Sin descripción.'}</p>
              </div>
              <div className="shrink-0 ml-2">
                <MenuDropdown items={[
                  { label: 'Editar', onClick: () => openEditModal(srv), icon: <Edit3 className="w-4 h-4" /> },
                  { label: 'Eliminar', onClick: () => handleDeleteService(srv.id), danger: true, icon: <Trash2 className="w-4 h-4" /> },
                ]} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary font-semibold mt-2">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />{srv.duracion} min
            </div>
            <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
              <span className="text-2xl md:text-3xl font-black text-text-primary">{srv.precio}€</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Servicio">
        <form onSubmit={handleCreateService} className="space-y-4">
          {createError && <div className="bg-error-bg border border-error-border text-error px-4 py-3 rounded-xl text-sm font-semibold">{createError}</div>}
          {serviceForm(false)}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Servicio">
        <form onSubmit={handleEditService} className="space-y-4">
          {editError && <div className="bg-error-bg border border-error-border text-error px-4 py-3 rounded-xl text-sm font-semibold">{editError}</div>}
          {serviceForm(true)}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
