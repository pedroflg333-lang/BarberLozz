import { useState, useEffect } from 'react';
import { useServiceStore } from '../stores/serviceStore';
import { 
  Plus, 
  Clock, 
  Edit3, 
  Trash2, 
  X,
  Check
} from 'lucide-react';
import type { Service } from '../types';

const PRESET_COLORS = [
  '#D4AF37', // Elegant Gold
  '#4B5563', // Soft Charcoal
  '#10B981', // Emerald Mint
  '#3B82F6', // Royal Blue
  '#EF4444', // Coral Rose
  '#8B5CF6', // Lavender Purple
  '#F59E0B', // Sunset Amber
  '#EC4899'  // Pastel Pink
];

export const Services: React.FC = () => {
  const { services, fetchServices, addService, updateService, deleteService } = useServiceStore();

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Modals status
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState(15.00);
  const [duracion, setDuracion] = useState(30);
  const [color, setColor] = useState('#D4AF37');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || precio <= 0 || duracion <= 0) return;

    const res = await addService({
      nombre,
      precio: Number(precio),
      duracion: Number(duracion),
      color,
      descripcion: descripcion || null,
      is_active: true
    });

    if (res) {
      setNombre('');
      setPrecio(15.00);
      setDuracion(30);
      setColor('#D4AF37');
      setDescripcion('');
      setShowCreateModal(false);
    }
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !nombre || precio <= 0 || duracion <= 0) return;

    const success = await updateService(selectedService.id, {
      nombre,
      precio: Number(precio),
      duracion: Number(duracion),
      color,
      descripcion: descripcion || null
    });

    if (success) {
      setShowEditModal(false);
      setSelectedService(null);
    }
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
    if (confirm('¿Estás seguro de que quieres eliminar este servicio? Se borrará de tu catálogo.')) {
      await deleteService(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black m-0">Catálogo de Servicios</h1>
          <p className="text-neutral-500 m-0 mt-1">Define los servicios de peluquería, sus precios, colores y tiempos.</p>
        </div>
        <button
          onClick={() => {
            setNombre('');
            setPrecio(15.00);
            setDuracion(30);
            setColor('#D4AF37');
            setDescripcion('');
            setShowCreateModal(true);
          }}
          className="bg-black hover:bg-neutral-900 text-white font-black px-6 py-4 rounded-2xl text-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <Plus className="w-5 h-5" />
          Añadir Servicio
        </button>
      </div>

      {/* Services Grid list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-16 border border-neutral-200 text-center space-y-3">
            <h3 className="text-xl font-bold text-black m-0">No hay servicios definidos</h3>
            <p className="text-neutral-400 m-0">Crea tu primer servicio pulsando el botón superior.</p>
          </div>
        ) : (
          services.map(srv => (
            <div
              key={srv.id}
              className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 flex flex-col justify-between h-56 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div 
                className="absolute top-0 left-0 right-0 h-2.5" 
                style={{ backgroundColor: srv.color }}
              />

              <div className="space-y-2 mt-2">
                <h3 className="text-2xl font-extrabold text-black line-clamp-1">{srv.nombre}</h3>
                <p className="text-xs text-neutral-400 font-semibold line-clamp-2 min-h-[32px]">{srv.descripcion || 'Sin descripción.'}</p>
                
                <div className="flex flex-col gap-1 text-sm text-neutral-500 font-semibold">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    {srv.duracion} minutos de duración
                  </span>
                </div>
              </div>

              {/* Lower Section with Price and Actions */}
              <div className="border-t border-neutral-100 pt-4 mt-2 flex items-center justify-between">
                <span className="text-3xl font-black text-black">{srv.precio}€</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(srv)}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl text-neutral-600 transition-colors cursor-pointer"
                    title="Editar servicio"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(srv.id)}
                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                    title="Eliminar de catálogo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE SERVICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 border border-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-2xl font-black text-black m-0">Añadir Servicio</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-neutral-700">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Corte Degradado + Lavado"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-neutral-700">Precio (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-neutral-700">Duración (min) *</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={duracion}
                    onChange={(e) => setDuracion(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Descripción del Servicio</label>
                <textarea
                  placeholder="Ej: Lavado capilar con champú mentolado, corte con degradado y peinado final..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                />
              </div>

              {/* Presets color chips */}
              <div className="space-y-2">
                <label className="block text-base font-bold text-neutral-700 m-0">Color Visual en Agenda</label>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-10 h-10 rounded-full border-2 cursor-pointer transition-transform relative flex items-center justify-center hover:scale-110"
                      style={{ 
                        backgroundColor: c, 
                        borderColor: color === c ? '#000000' : 'transparent' 
                      }}
                    >
                      {color === c && (
                        <Check className="w-5 h-5 text-white stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
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

      {/* EDIT SERVICE MODAL */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 border border-neutral-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h2 className="text-2xl font-black text-black m-0">Editar Servicio</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-neutral-100 rounded-xl cursor-pointer text-neutral-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditService} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-neutral-700">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Corte Degradado"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-neutral-700">Precio (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-neutral-700">Duración (min) *</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={duracion}
                    onChange={(e) => setDuracion(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-neutral-700">Descripción del Servicio</label>
                <textarea
                  placeholder="Ej: Lavado capilar con champú mentolado, corte con degradado y peinado final..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-50 border border-neutral-200 text-base text-black focus:outline-none mt-1 focus-gold"
                />
              </div>

              {/* Presets color chips */}
              <div className="space-y-2">
                <label className="block text-base font-bold text-neutral-700 m-0">Color Visual en Agenda</label>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-10 h-10 rounded-full border-2 cursor-pointer transition-transform relative flex items-center justify-center hover:scale-110"
                      style={{ 
                        backgroundColor: c, 
                        borderColor: color === c ? '#000000' : 'transparent' 
                      }}
                    >
                      {color === c && (
                        <Check className="w-5 h-5 text-white stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>
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
    </div>
  );
};
