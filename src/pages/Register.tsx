import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../ui';
import { Scissors } from 'lucide-react';

export const Register: React.FC = () => {
  const { signUp, error, clearError, loading, user } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    clearError();
    if (user) { navigate('/dashboard'); }
  }, [user, navigate, clearError]);

  const onSubmit = async (data: any) => {
    const success = await signUp(data.email, data.password, data.fullName, data.businessName);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-xl bg-surface-dark-muted border border-gold flex items-center justify-center shadow-lg">
          <Scissors className="h-8 w-8 text-gold" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-inverse tracking-tight">Crea tu Barbería SaaS</h2>
        <p className="mt-2 text-center text-base text-neutral-400">Comienza a gestionar tus citas de forma profesional en 2 minutos</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-dark-muted py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-border-dark">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-error-bg/10 border border-error/50 text-error px-4 py-3 rounded-xl text-sm text-center font-semibold">
                {error}
              </div>
            )}

            <Input variant="dark" label="Nombre de la Peluquería / Barbería" type="text" placeholder="Ej: BarberLozz Premium"
              error={errors.businessName ? String(errors.businessName.message) : undefined}
              {...register('businessName', { required: 'El nombre del negocio es obligatorio' })} />

            <Input variant="dark" label="Tu Nombre Completo" type="text" placeholder="Ej: Pedro Lozz"
              error={errors.fullName ? String(errors.fullName.message) : undefined}
              {...register('fullName', { required: 'Tu nombre es obligatorio' })} />

            <Input variant="dark" label="Correo Electrónico" type="email" placeholder="ejemplo@barberia.com"
              error={errors.email ? String(errors.email.message) : undefined}
              {...register('email', { required: 'El correo es obligatorio' })} />

            <Input variant="dark" label="Contraseña" type="password" placeholder="Mínimo 6 caracteres"
              error={errors.password ? String(errors.password.message) : undefined}
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 6, message: 'Debe tener al menos 6 caracteres' }
              })} />

            <Button type="submit" disabled={loading} className="w-full bg-gold text-black hover:bg-gold-dark text-lg py-4" size="lg">
              {loading ? 'Creando cuenta...' : 'Crear mi Barbería'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border-dark text-center">
            <p className="text-base text-neutral-400">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="font-medium text-gold hover:text-opacity-80">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
