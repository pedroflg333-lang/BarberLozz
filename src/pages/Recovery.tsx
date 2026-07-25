import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../ui';
import { Scissors, ArrowLeft, CheckCircle } from 'lucide-react';

export const Recovery: React.FC = () => {
  const { resetPassword, error, clearError, loading } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => { clearError(); }, [clearError]);

  const onSubmit = async (data: any) => {
    const res = await resetPassword(data.email);
    if (res) setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-xl bg-surface-dark-muted border border-gold flex items-center justify-center shadow-lg">
          <Scissors className="h-8 w-8 text-gold" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-inverse tracking-tight">Recuperar Contraseña</h2>
        <p className="mt-2 text-center text-base text-neutral-400">Te enviaremos un enlace para restablecer tu contraseña</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-dark-muted py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-border-dark">
          {success ? (
            <div className="text-center space-y-6">
              <div className="bg-success-bg/10 border border-success/50 text-success px-4 py-4 rounded-xl text-base font-semibold flex items-center gap-3">
                <CheckCircle className="w-6 h-6 shrink-0" />
                Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada o spam.
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 text-gold font-semibold hover:underline text-lg">
                <ArrowLeft className="w-5 h-5" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-error-bg/10 border border-error/50 text-error px-4 py-3 rounded-xl text-sm text-center font-semibold">
                  {error}
                </div>
              )}

              <Input variant="dark" label="Correo Electrónico" type="email" placeholder="ejemplo@barberia.com"
                error={errors.email ? String(errors.email.message) : undefined}
                {...register('email', { required: 'El correo es obligatorio' })} />

              <Button type="submit" disabled={loading} className="w-full bg-gold text-black hover:bg-gold-dark text-lg py-4" size="lg">
                {loading ? 'Enviando...' : 'Enviar Enlace'}
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-all">
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
