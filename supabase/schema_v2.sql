-- Schema SQL V2 for BarberLozz Manager (AI Virtual Receptionist SaaS)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Business Settings Table (Tenants)
CREATE TABLE public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#D4AF37', -- Gold
    secondary_color TEXT DEFAULT '#111111', -- Obsidian
    phone_whatsapp TEXT,
    default_service_duration INTEGER DEFAULT 30, -- minutes
    open_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6], -- Mon-Sat
    business_hours JSONB DEFAULT '{"start": "09:00", "end": "20:00"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Profiles Table (Users linked to Tenants)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    business_id UUID REFERENCES public.business_settings ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Services Table (with description for AI lookup)
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- minutes
    color TEXT NOT NULL DEFAULT '#D4AF37',
    descripcion TEXT, -- AI reads this to answer customer questions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customers Table (with SaaS statistics)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT NOT NULL, -- WhatsApp phone number
    email TEXT,
    notes TEXT,
    numero_visitas INTEGER DEFAULT 0 NOT NULL,
    gasto_total NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    servicio_favorito UUID REFERENCES public.services ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Appointments Table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    price_charged NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Conversations Table (revolves around WhatsApp chats)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers ON DELETE SET NULL, -- Null if customer not created yet
    customer_phone TEXT NOT NULL, -- raw incoming WhatsApp number
    status TEXT NOT NULL DEFAULT 'ai_pending' CHECK (status IN ('ai_pending', 'ai_resolved', 'human_needed')),
    last_message TEXT,
    ai_enabled BOOLEAN DEFAULT true NOT NULL, -- Set to false if human takes over
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. WhatsApp Messages Table (revolves around messages inside chats)
CREATE TABLE public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations ON DELETE CASCADE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'location')),
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('received', 'sent', 'delivered', 'read')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
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

-- RLS Policies

-- Profiles Policies
CREATE POLICY "Allow users to read profiles in the same business" 
    ON public.profiles FOR SELECT 
    USING (id = auth.uid() OR business_id = public.get_user_business_id());

CREATE POLICY "Allow users to insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (id = auth.uid());

CREATE POLICY "Allow owners to update profiles in their business" 
    ON public.profiles FOR UPDATE 
    USING (id = auth.uid() OR (business_id = public.get_user_business_id() AND (select role from public.profiles where id = auth.uid()) = 'admin'));

-- Business Settings Policies
CREATE POLICY "Allow new signup to insert business settings"
    ON public.business_settings FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow users to select their business settings" 
    ON public.business_settings FOR SELECT 
    USING (id = public.get_user_business_id());

CREATE POLICY "Allow admin to update their business settings" 
    ON public.business_settings FOR UPDATE 
    USING (id = public.get_user_business_id());

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
CREATE POLICY "Allow business users full access to whatsapp_messages"
    ON public.whatsapp_messages FOR ALL
    USING (conversation_id IN (
        SELECT id FROM public.conversations WHERE business_id = public.get_user_business_id()
    ))
    WITH CHECK (conversation_id IN (
        SELECT id FROM public.conversations WHERE business_id = public.get_user_business_id()
    ));

-- Automatically update customer stats when an appointment is completed
CREATE OR REPLACE FUNCTION public.update_customer_stats_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
        UPDATE public.customers
        SET 
            numero_visitas = numero_visitas + 1,
            gasto_total = gasto_total + NEW.price_charged,
            servicio_favorito = COALESCE(
                (
                    SELECT service_id 
                    FROM public.appointments 
                    WHERE customer_id = NEW.customer_id AND status = 'completed'
                    GROUP BY service_id 
                    ORDER BY count(*) DESC 
                    LIMIT 1
                ), 
                NEW.service_id
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
