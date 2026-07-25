import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../ui';
import { Scissors } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, error, clearError, loading, user } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    clearError();
    if (user) { navigate('/dashboard'); }
  }, [user, navigate, clearError]);

  const onSubmit = async (data: any) => {
    const success = await signIn(data.email, data.password);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-surface-dark-muted border-2 border-gold flex items-center justify-center shadow-lg">
          <Scissors className="h-10 w-10 text-gold" />
        </div>
        <h2 className="mt-8 text-center text-4xl font-extrabold text-text-inverse tracking-tight">BarberLozz</h2>
        <p className="mt-2 text-center text-lg text-neutral-400">Entra a tu panel de peluquería premium</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-dark-muted py-10 px-6 shadow-xl rounded-2xl sm:px-10 border border-border-dark">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-error-bg/10 border border-error/50 text-error px-4 py-3 rounded-xl text-base text-center font-semibold">
                {error}
              </div>
            )}

            <Input variant="dark" label="Correo Electrónico" type="email" placeholder="ejemplo@barberia.com"
              autoComplete="email" error={errors.email ? String(errors.email.message) : undefined}
              {...register('email', { required: 'El correo es obligatorio' })} />

            <Input variant="dark" label="Contraseña" type="password" placeholder="••••••••"
              autoComplete="current-password" error={errors.password ? String(errors.password.message) : undefined}
              {...register('password', { required: 'La contraseña es obligatoria' })} />

            <div className="flex items-center justify-between">
              <Link to="/recovery" className="text-base font-medium text-gold hover:text-opacity-80">¿Olvidaste tu contraseña?</Link>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gold text-black hover:bg-gold-dark text-xl py-4" size="lg">
              {loading ? 'Entrando...' : 'Entrar Ahora'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border-dark text-center">
            <p className="text-base text-neutral-400">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-medium text-gold hover:text-opacity-80">Regístrate gratis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
