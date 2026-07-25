import { motion } from 'framer-motion';

const STEPS = ['Servicio', 'Profesional', 'Fecha y hora', 'Datos'];

interface Props {
  current: number;
}

export const ProgressBar = ({ current }: Props) => (
  <div className="flex items-center justify-between w-full max-w-md mx-auto">
    {STEPS.map((label, i) => (
      <div key={i} className="flex items-center flex-1 last:flex-none">
        <div className="flex flex-col items-center gap-1.5">
          <motion.div
            initial={false}
            animate={{
              scale: i === current ? 1 : 0.85,
              backgroundColor: i <= current ? '#000000' : '#E5E5E5',
            }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-2.5 h-2.5 rounded-full"
          />
          <motion.span
            initial={false}
            animate={{
              color: i <= current ? '#000000' : '#A3A3A3',
              fontWeight: i === current ? 700 : 500,
            }}
            transition={{ duration: 0.3 }}
            className="text-[10px] leading-tight text-center"
          >
            {label}
          </motion.span>
        </div>
        {i < STEPS.length - 1 && (
          <div className="flex-1 mx-1.5 mb-4">
            <motion.div
              initial={false}
              animate={{
                backgroundColor: i < current ? '#000000' : '#E5E5E5',
              }}
              transition={{ duration: 0.3 }}
              className="h-[2px] rounded-full"
            />
          </div>
        )}
      </div>
    ))}
  </div>
);
