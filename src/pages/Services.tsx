import { useState, useEffect } from 'react';
import { useServiceStore } from '../stores/serviceStore';
import { Plus, Clock, Edit3, Trash2, X, Check, MoreVertical } from 'lucide-react';
import type { Service } from '../types';

const PRESET_COLORS = [
  '#D4AF37', '#4B5563', '#10B981', '#3B82F6',
  '#EF4444', '#8B5CF6', '#F59E0B', '#EC4899'
];

const ServiceModal = ({ show, onClose, title, onSubmit, error, children }: any) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md md:rounded-3xl md:m-4 rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-neutral-100 rounded-t-3xl">
          <h2 className="text-lg font-black text-black m-0">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">{error}</div>}
          {children}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 bg-black hover:bg-neutral-900 text-white font-black py-3 rounded-xl text-sm transition-all cursor-pointer">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Services: React.FC = () => {
  const { services, fetchServices, addService, updateService, deleteService } = useServiceStore();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
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
    setMenuOpen(null);
  };

  const handleDeleteService = async (id: string) => {
    setMenuOpen(null);
    if (confirm('¿Eliminar este servicio?')) await deleteService(id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-black m-0">Servicios</h1>
          <p className="text-neutral-500 m-0 mt-0.5 text-xs md:text-sm">Precios, duración y colores.</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="bg-black hover:bg-neutral-900 text-white font-black px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg flex items-center gap-2 cursor-pointer shadow-md"
        ><Plus className="w-4 h-5" /><span className="hidden md:inline">Añadir Servicio</span><span className="md:hidden">Nuevo</span></button>
      </div>

      <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
        {services.length === 0 ? (
          <div className="md:col-span-full bg-white rounded-2xl md:rounded-3xl p-8 border border-neutral-200 text-center">
            <h3 className="text-base font-bold text-black m-0">No hay servicios</h3>
            <p className="text-sm text-neutral-400 m-0 mt-1">Crea tu primer servicio.</p>
          </div>
        ) : services.map(srv => (
          <div key={srv.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: srv.color }} />
            <div className="flex items-start justify-between mt-1">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-2xl font-extrabold text-black truncate">{srv.nombre}</h3>
                <p className="text-xs text-neutral-400 font-semibold line-clamp-2 mt-0.5">{srv.descripcion || 'Sin descripción.'}</p>
              </div>
              <div className="relative shrink-0 ml-2">
                <button onClick={() => setMenuOpen(menuOpen === srv.id ? null : srv.id)} className="p-2 hover:bg-neutral-100 rounded-lg cursor-pointer">
                  <MoreVertical className="w-5 h-5 text-neutral-400" />
                </button>
                {menuOpen === srv.id && (
                  <div className="absolute right-0 top-10 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 w-36 overflow-hidden">
                    <button onClick={() => openEditModal(srv)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"><Edit3 className="w-4 h-4" />Editar</button>
                    <button onClick={() => handleDeleteService(srv.id)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" />Eliminar</button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-semibold mt-2">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />{srv.duracion} min
            </div>
            <div className="border-t border-neutral-100 pt-3 mt-3 flex items-center justify-between">
              <span className="text-2xl md:text-3xl font-black text-black">{srv.precio}€</span>
            </div>
          </div>
        ))}
      </div>

      <ServiceModal show={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Servicio" onSubmit={handleCreateService} error={createError}>
        <div>
          <label className="block text-sm font-bold text-neutral-700">Nombre *</label>
          <input type="text" required placeholder="Ej: Corte Degradado" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700">Precio (€) *</label>
            <input type="number" step="0.01" min="1" required value={precio} onChange={e => setPrecio(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700">Duración (min) *</label>
            <input type="number" min="5" step="5" required value={duracion} onChange={e => setDuracion(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700">Descripción</label>
          <textarea placeholder="Descripción del servicio..." value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: c, borderColor: color === c ? '#000' : 'transparent' }}
              >{color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}</button>
            ))}
          </div>
        </div>
      </ServiceModal>

      <ServiceModal show={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Servicio" onSubmit={handleEditService} error={editError}>
        <div>
          <label className="block text-sm font-bold text-neutral-700">Nombre *</label>
          <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700">Precio (€) *</label>
            <input type="number" step="0.01" min="1" required value={precio} onChange={e => setPrecio(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700">Duración (min) *</label>
            <input type="number" min="5" step="5" required value={duracion} onChange={e => setDuracion(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700">Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-gold" />
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: c, borderColor: color === c ? '#000' : 'transparent' }}
              >{color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}</button>
            ))}
          </div>
        </div>
      </ServiceModal>
    </div>
  );
};
