import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Scissors, ArrowLeft } from 'lucide-react';

export const Recovery: React.FC = () => {
  const { resetPassword, error, clearError, loading } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: any) => {
    const res = await resetPassword(data.email);
    if (res) {
      setSuccess(true);
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
          Recuperar Contraseña
        </h2>
        <p className="mt-2 text-center text-base text-neutral-400">
          Te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-900 py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-neutral-800">
          {success ? (
            <div className="text-center space-y-6">
              <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 px-4 py-4 rounded-xl text-base">
                Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada o spam.
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-gold font-semibold hover:underline text-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}

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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 rounded-xl shadow-sm text-lg font-bold text-black bg-gold hover:bg-opacity-90 focus:outline-none transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Enlace'}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
