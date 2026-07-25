import { motion } from 'framer-motion';
import { Clock, Check } from 'lucide-react';

interface Service {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
  color: string;
  descripcion: string | null;
}

interface Props {
  service: Service;
  isSelected: boolean;
  onSelect: (s: Service) => void;
}

export const ServiceCard = ({ service, isSelected, onSelect }: Props) => (
  <motion.button
    layout
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    onClick={() => onSelect(service)}
    whileTap={{ scale: 0.98 }}
    className={`w-full text-left bg-white rounded-2xl border-2 p-5 transition-all cursor-pointer shadow-sm ${
      isSelected
        ? 'border-black shadow-md shadow-black/5'
        : 'border-neutral-100 hover:border-neutral-300 hover:shadow-md'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: service.color }}
          />
          <h3 className="text-lg md:text-xl font-bold text-black m-0 leading-tight">
            {service.nombre}
          </h3>
        </div>
        {service.descripcion && (
          <p className="text-sm text-neutral-400 font-medium m-0 mt-1.5 leading-relaxed">
            {service.descripcion}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span className="text-sm font-semibold text-neutral-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {service.duracion} min
          </span>
          <span className="text-xl font-black text-black">
            {service.precio}€
          </span>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{
          scale: isSelected ? 1 : 0,
          opacity: isSelected ? 1 : 0,
        }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0 mt-1"
      >
        <Check className="w-4 h-4 text-white stroke-[3]" />
      </motion.div>
    </div>
  </motion.button>
);
