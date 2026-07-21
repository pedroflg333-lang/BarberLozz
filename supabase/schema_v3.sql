-- Schema SQL V3 for Multi-Tenant AI Receptionist SaaS Platform

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Business (Tenants) Table
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    logo_url TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    horarios JSONB DEFAULT '{"start": "09:00", "end": "20:30", "open_days": [1,2,3,4,5,6]}'::jsonb NOT NULL,
    configuracion_ia JSONB DEFAULT '{"custom_prompt": "Eres un recepcionista atento.", "greeting": "¡Hola! ¿En qué puedo ayudarte?", "ai_enabled": true}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Profiles Table (Users linked to Tenants)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Services Table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    duracion INTEGER NOT NULL, -- in minutes
    color TEXT NOT NULL DEFAULT '#D4AF37',
    descripcion TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses ON DELETE CASCADE NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL, -- unique WhatsApp number per business
    email TEXT,
    notas TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ultima_visita TIMESTAMP WITH TIME ZONE,
    numero_visitas INTEGER DEFAULT 0 NOT NULL,
    gasto_total NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    servicio_favorito UUID REFERENCES public.services ON DELETE SET NULL,
    CONSTRAINT unique_customer_per_business UNIQUE (business_id, telefono)
);

-- 6. Appointments Table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.profiles ON DELETE SET NULL, -- Nullable if general booking
    fecha DATE NOT NULL, -- YYYY-MM-DD
    hora TEXT NOT NULL, -- HH:MM
    servicio_id UUID REFERENCES public.services ON DELETE CASCADE NOT NULL,
    estado TEXT DEFAULT 'pending' CHECK (estado IN ('pending', 'completed', 'cancelled')) NOT NULL,
    origen TEXT DEFAULT 'MANUAL' CHECK (origen IN ('MANUAL', 'IA', 'WHATSAPP', 'WEB')) NOT NULL,
    notes TEXT,
    price_charged NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Conversations Table (revolves around WhatsApp chats)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers ON DELETE SET NULL,
    customer_phone TEXT NOT NULL, -- raw incoming WhatsApp number
    status TEXT DEFAULT 'ai_pending' CHECK (status IN ('ai_pending', 'ai_resolved', 'human_needed')) NOT NULL,
    last_message TEXT,
    ai_enabled BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_conversation_per_business UNIQUE (business_id, customer_phone)
);

-- 8. WhatsApp Messages Table
CREATE TABLE public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations ON DELETE CASCADE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'location')) NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('received', 'sent', 'delivered', 'read')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Helper Function to get current user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- RLS Policies (Isolated by business_id)

-- Profiles Policies
CREATE POLICY "Allow business users to read profiles" 
    ON public.profiles FOR SELECT 
    USING (id = auth.uid() OR business_id = public.get_user_business_id());

CREATE POLICY "Allow users to insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (id = auth.uid());

CREATE POLICY "Allow admins to update profiles in their business" 
    ON public.profiles FOR UPDATE 
    USING (id = auth.uid() OR (business_id = public.get_user_business_id() AND (select role from public.profiles where id = auth.uid()) = 'admin'));

-- Business Settings Policies
CREATE POLICY "Allow new signups to insert business records"
    ON public.businesses FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow users to select their business record" 
    ON public.businesses FOR SELECT 
    USING (id = public.get_user_business_id());

CREATE POLICY "Allow admin to update their business record" 
    ON public.businesses FOR UPDATE 
    USING (id = public.get_user_business_id() AND (select role from public.profiles where id = auth.uid()) = 'admin');

-- Services Policies
CREATE POLICY "Allow business users full access to services"
    ON public.services FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- Customers Policies
CREATE POLICY "Allow business users full access to customers"
    ON public.customers FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- Appointments Policies
CREATE POLICY "Allow business users full access to appointments"
    ON public.appointments FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- Conversations Policies
CREATE POLICY "Allow business users full access to conversations"
    ON public.conversations FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- WhatsApp Messages Policies
CREATE POLICY "Allow business users full access to messages"
    ON public.whatsapp_messages FOR ALL
    USING (conversation_id IN (
        SELECT id FROM public.conversations WHERE business_id = public.get_user_business_id()
    ))
    WITH CHECK (conversation_id IN (
        SELECT id FROM public.conversations WHERE business_id = public.get_user_business_id()
    ));

-- Auto update customer stats trigger
CREATE OR REPLACE FUNCTION public.update_customer_stats_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.estado = 'completed' AND OLD.estado != 'completed') THEN
        UPDATE public.customers
        SET 
            numero_visitas = numero_visitas + 1,
            gasto_total = gasto_total + NEW.price_charged,
            ultima_visita = NEW.created_at,
            servicio_favorito = COALESCE(
                (
                    SELECT servicio_id 
                    FROM public.appointments 
                    WHERE customer_id = NEW.customer_id AND estado = 'completed'
                    GROUP BY servicio_id 
                    ORDER BY count(*) DESC 
                    LIMIT 1
                ), 
                NEW.servicio_id
            )
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_customer_stats
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_stats_on_appointment();
