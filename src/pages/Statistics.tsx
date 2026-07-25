import { useState, useEffect, useMemo } from 'react';
import { useAppointmentStore } from '../stores/appointmentStore';

import { useServiceStore } from '../stores/serviceStore';
import { Card, Badge } from '../ui';
import { Calendar, TrendingUp, Users, Scissors, Euro, Clock } from 'lucide-react';

export const Statistics: React.FC = () => {
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { services, fetchServices } = useServiceStore();
  const [filter, setFilter] = useState<'7d' | '30d' | 'all'>('all');

  useEffect(() => { fetchAppointments(); fetchServices(); }, [fetchAppointments, fetchServices]);

  const getDateLimit = () => {
    if (filter === 'all') return null;
    const d = new Date(); d.setDate(d.getDate() - (filter === '7d' ? 7 : 30));
    return d.toISOString().split('T')[0];
  };

  const filteredAppointments = useMemo(() => {
    const limit = getDateLimit();
    return limit ? appointments.filter(apt => apt.fecha >= limit) : appointments;
  }, [appointments, filter]);

  const totalRevenue = filteredAppointments.filter(apt => apt.estado === 'completed').reduce((acc, apt) => acc + apt.price_charged, 0);
  const completedCount = filteredAppointments.filter(apt => apt.estado === 'completed').length;
  const cancelledCount = filteredAppointments.filter(apt => apt.estado === 'cancelled').length;
  const pendingCount = filteredAppointments.filter(apt => apt.estado === 'pending').length;
  const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

  const serviceRanking = useMemo(() => {
    const map: Record<string, { nombre: string; count: number; revenue: number }> = {};
    filteredAppointments.filter(a => a.estado === 'completed').forEach(apt => {
      const srv = services.find(s => s.id === apt.servicio_id);
      const key = apt.servicio_id;
      if (!map[key]) map[key] = { nombre: srv?.nombre || 'Desconocido', count: 0, revenue: 0 };
      map[key].count++; map[key].revenue += apt.price_charged;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredAppointments, services]);

  const monthlyStats = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    filteredAppointments.filter(a => a.estado === 'completed').forEach(apt => {
      const month = apt.fecha.slice(0, 7);
      if (!map[month]) map[month] = { revenue: 0, count: 0 };
      map[month].revenue += apt.price_charged; map[month].count++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAppointments]);

  const filters = [
    { key: 'all' as const, label: 'Todo' },
    { key: '30d' as const, label: 'Último mes' },
    { key: '7d' as const, label: 'Última semana' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-text-primary m-0">Estadísticas</h1>
          <p className="text-text-secondary m-0 mt-0.5 text-xs md:text-sm">Rendimiento del negocio.</p>
        </div>
        <div className="flex gap-1.5 bg-neutral-100 p-1 rounded-btn">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-btn text-xs md:text-sm font-extrabold transition-all cursor-pointer ${filter === f.key ? 'bg-surface shadow-md text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-emerald-100 rounded-xl"><Euro className="w-4 h-4 md:w-6 md:h-6 text-emerald-600" /></div>
            <div><span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Ingresos</span><span className="text-base md:text-2xl font-black text-text-primary">{totalRevenue.toFixed(0)}€</span></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-blue-100 rounded-xl"><TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-blue-600" /></div>
            <div><span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Ticket Medio</span><span className="text-base md:text-2xl font-black text-text-primary">{averageTicket.toFixed(0)}€</span></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-gold/20 rounded-xl"><Scissors className="w-4 h-4 md:w-6 md:h-6 text-gold-dark" /></div>
            <div><span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Realizadas</span><span className="text-base md:text-2xl font-black text-text-primary">{completedCount}</span></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-amber-100 rounded-xl"><Clock className="w-4 h-4 md:w-6 md:h-6 text-amber-600" /></div>
            <div><span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Pendientes</span><span className="text-base md:text-2xl font-black text-text-primary">{pendingCount}</span></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-red-100 rounded-xl"><Users className="w-4 h-4 md:w-6 md:h-6 text-red-500" /></div>
            <div><span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Canceladas</span><span className="text-base md:text-2xl font-black text-text-primary">{cancelledCount}</span></div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm md:text-lg font-bold text-text-primary m-0 mb-3 flex items-center gap-2"><Scissors className="w-4 h-4 md:w-5 md:h-5 text-gold-dark" />Servicios más vendidos</h2>
          <div className="space-y-2">
            {serviceRanking.length === 0 && <p className="text-text-tertiary text-center py-6 text-sm">Sin datos.</p>}
            {serviceRanking.map((s, i) => (
              <div key={s.nombre} className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-black text-text-tertiary w-5">{i + 1}.</span>
                  <span className="text-xs md:text-sm font-bold text-text-primary truncate">{s.nombre}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="info">{s.count} ventas</Badge>
                  <span className="text-xs font-black text-text-primary">{s.revenue.toFixed(0)}€</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm md:text-lg font-bold text-text-primary m-0 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 md:w-5 md:h-5 text-gold-dark" />Ingresos Mensuales</h2>
          <div className="space-y-2">
            {monthlyStats.length === 0 && <p className="text-text-tertiary text-center py-6 text-sm">Sin datos.</p>}
            {monthlyStats.map(([month, stats]) => (
              <div key={month} className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs md:text-sm font-semibold text-text-primary">{new Date(month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">{stats.count} citas</span>
                  <span className="text-sm md:text-base font-black text-emerald-600">{stats.revenue.toFixed(0)}€</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
