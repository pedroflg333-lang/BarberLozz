import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Scissors } from 'lucide-react';

export const Register: React.FC = () => {
  const { signUp, error, clearError, loading, user } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    clearError();
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate, clearError]);

  const onSubmit = async (data: any) => {
    const success = await signUp(data.email, data.password, data.fullName, data.businessName);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Elegant Gold Logo */}
        <div className="mx-auto h-16 w-16 rounded-xl bg-neutral-900 border border-gold flex items-center justify-center shadow-lg">
          <Scissors className="h-8 w-8 text-gold" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Crea tu Barbería SaaS
        </h2>
        <p className="mt-2 text-center text-base text-neutral-400">
          Comienza a gestionar tus citas de forma profesional en 2 minutos
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-900 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-neutral-800">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="businessName" className="block text-base font-semibold text-neutral-300">
                Nombre de la Peluquería / Barbería
              </label>
              <div className="mt-1">
                <input
                  id="businessName"
                  type="text"
                  placeholder="Ej: BarberLozz Premium"
                  {...register('businessName', { required: 'El nombre del negocio es obligatorio' })}
                  className="appearance-none block w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold text-base focus-gold"
                />
                {errors.businessName && (
                  <p className="mt-1 text-sm text-red-400 m-0">{String(errors.businessName.message)}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-base font-semibold text-neutral-300">
                Tu Nombre Completo
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  type="text"
                  placeholder="Ej: Pedro Lozz"
                  {...register('fullName', { required: 'Tu nombre es obligatorio' })}
                  className="appearance-none block w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold text-base focus-gold"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-400 m-0">{String(errors.fullName.message)}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-base font-semibold text-neutral-300">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@barberia.com"
                  {...register('email', { required: 'El correo es obligatorio' })}
                  className="appearance-none block w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold text-base focus-gold"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400 m-0">{String(errors.email.message)}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-base font-semibold text-neutral-300">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  {...register('password', { 
                    required: 'La contraseña es obligatoria',
                    minLength: { value: 6, message: 'Debe tener al menos 6 caracteres' }
                  })}
                  className="appearance-none block w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold text-base focus-gold"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 m-0">{String(errors.password.message)}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 rounded-xl shadow-sm text-lg font-bold text-black bg-gold hover:bg-opacity-90 focus:outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creando cuenta...' : 'Crear mi Barbería'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <p className="text-base text-neutral-400">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-medium text-gold hover:text-opacity-80">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
