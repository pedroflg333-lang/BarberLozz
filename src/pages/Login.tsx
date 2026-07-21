import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Scissors } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, error, clearError, loading, user } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    clearError();
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate, clearError]);

  const onSubmit = async (data: any) => {
    const success = await signIn(data.email, data.password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Elegant Gold Logo */}
        <div className="mx-auto h-20 w-20 rounded-2xl bg-neutral-900 border-2 border-gold flex items-center justify-center shadow-lg">
          <Scissors className="h-10 w-10 text-gold" />
        </div>
        <h2 className="mt-8 text-center text-4xl font-extrabold text-white tracking-tight">
          BarberLozz
        </h2>
        <p className="mt-2 text-center text-lg text-neutral-400">
          Entra a tu panel de peluquería premium
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-900 py-10 px-6 shadow-xl rounded-2xl sm:px-10 border border-neutral-800">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-base text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-lg font-semibold text-neutral-300">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@barberia.com"
                  autoComplete="email"
                  {...register('email', { required: 'El correo es obligatorio' })}
                  className="appearance-none block w-full px-4 py-4 rounded-xl bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-lg focus-gold"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400 m-0">{String(errors.email.message)}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-lg font-semibold text-neutral-300">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'La contraseña es obligatoria' })}
                  className="appearance-none block w-full px-4 py-4 rounded-xl bg-[#1A1A1A] border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent text-lg focus-gold"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 m-0">{String(errors.password.message)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-base">
                <Link to="/recovery" className="font-medium text-gold hover:text-opacity-80">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 rounded-xl shadow-sm text-xl font-bold text-black bg-gold hover:bg-opacity-90 focus:outline-none transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar Ahora'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
            <p className="text-base text-neutral-400">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-medium text-gold hover:text-opacity-80">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
