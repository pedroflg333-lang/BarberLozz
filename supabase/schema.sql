-- Schema SQL for BarberLozz (SaaS Appointment Management)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Business Settings Table (Tenants)
CREATE TABLE public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#D4AF37', -- Elegant Gold
    secondary_color TEXT DEFAULT '#111111', -- Deep Obsidian / Near Black
    phone_whatsapp TEXT,
    default_service_duration INTEGER DEFAULT 30, -- minutes
    open_days INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6], -- Monday to Saturday (1-6)
    business_hours JSONB DEFAULT '{"start": "09:00", "end": "20:00"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Profiles Table (Users linked to Tenants)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    business_id UUID REFERENCES public.business_settings ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Services Table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    color TEXT NOT NULL DEFAULT '#E5E7EB', -- soft visual color
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Appointments Table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    price_charged NUMERIC(10,2) NOT NULL, -- Frozen price at booking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Notes Table
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_settings ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

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

-- Customers Policies
CREATE POLICY "Allow business users full access to customers"
    ON public.customers FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- Services Policies
CREATE POLICY "Allow business users full access to services"
    ON public.services FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- Appointments Policies
CREATE POLICY "Allow business users full access to appointments"
    ON public.appointments FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- Notes Policies
CREATE POLICY "Allow business users full access to notes"
    ON public.notes FOR ALL
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());
