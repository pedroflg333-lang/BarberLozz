import { Router } from 'express';
import { supabaseAdmin, isSupabaseConfigured } from '../supabase.js';
import { getAvailableSlots, isSlotAvailable } from '../availabilityEngine.js';

const router = Router();

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// GET /api/public/business/slug/:slug — Lookup business by slug (or UUID fallback)
router.get('/business/slug/:slug', async (req, res) => {
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const param = req.params.slug;
    let query = supabaseAdmin
      .from('businesses')
      .select('id, nombre, logo_url, telefono, email, direccion');

    // Try slug first, then UUID
    if (isUUID(param)) {
      query = query.eq('id', param);
    } else {
      query = query.eq('slug', param);
    }

    const { data } = await query.maybeSingle();

    if (!data) {
      // Last resort: return first business if param matches no slug but looks like a name
      if (!isUUID(param)) {
        const { data: firstBiz } = await supabaseAdmin
          .from('businesses')
          .select('id, nombre, logo_url, telefono, email, direccion')
          .limit(1)
          .maybeSingle();
        if (firstBiz) return res.json(firstBiz);
      }
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/public/business/:id/services — Active services for public booking
router.get('/business/:id/services', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('id, nombre, precio, duracion, color, descripcion')
      .eq('business_id', id)
      .eq('is_active', true);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/public/business/:id/employees — Employees for public booking
router.get('/business/:id/employees', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured || !isUUID(id)) return res.json([]);
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .eq('business_id', id);
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/public/availability — Get available slots for a service+employee+date
router.post('/availability', async (req, res) => {
  const { business_id, service_id, date, employee_id } = req.body;
  if (!business_id || !service_id || !date) {
    return res.status(400).json({ error: 'business_id, service_id, and date required' });
  }
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });

  try {
    const result = await getAvailableSlots(business_id, date, service_id, {
      employee_id: employee_id || undefined
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/public/book — Create a pending booking from the public page
router.post('/book', async (req, res) => {
  const { business_id, nombre, telefono, servicio_id, employee_id, fecha, hora, notes } = req.body;

  if (!business_id || !nombre || !telefono || !servicio_id || !fecha || !hora) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });

  try {
    // 1. Lookup service for price
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('precio, duracion')
      .eq('id', servicio_id)
      .maybeSingle();
    if (!service) return res.status(404).json({ error: 'Service not found' });

    // 2. Quick availability check
    const endMinutes = toMinutes(hora) + (service.duracion || 30);
    const endTime = toTimeStr(endMinutes);
    const availCheck = await isSlotAvailable(business_id, fecha, hora, endTime, employee_id || null, servicio_id);
    if (!availCheck.available) {
      return res.status(409).json({ error: availCheck.message || 'Slot not available' });
    }

    // 3. Find or create customer
    let customerId: string;
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('business_id', business_id)
      .eq('telefono', telefono)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
    } else {
      const { data: newCust, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id,
          nombre,
          telefono,
          notas: notes || null
        })
        .select('id')
        .single();
      if (custErr) throw custErr;
      customerId = newCust.id;
    }

    // 4. Create appointment with estado='pending', origen='WEB'
    const { data: appointment, error: aptErr } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id,
        customer_id: customerId,
        employee_id: employee_id || null,
        servicio_id,
        fecha,
        hora,
        estado: 'pending',
        origen: 'WEB',
        notes: notes || null,
        price_charged: service.precio
      })
      .select('*, customer:customers(*)')
      .single();

    if (aptErr) throw aptErr;

    res.json({ success: true, appointment });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/public/bookings/:id/confirm — Accept a pending booking
router.patch('/bookings/:id/confirm', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ estado: 'confirmed' })
      .eq('id', id)
      .eq('estado', 'pending')
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found or already processed' });
    res.json({ success: true, appointment: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/public/bookings/:id/reject — Reject a pending booking
router.patch('/bookings/:id/reject', async (req, res) => {
  const { id } = req.params;
  if (!isSupabaseConfigured) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ estado: 'rejected' })
      .eq('id', id)
      .eq('estado', 'pending')
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found or already processed' });
    res.json({ success: true, appointment: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
