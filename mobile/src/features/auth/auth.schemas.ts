import { z } from 'zod';

// Mismo límite que el backend: bcrypt solo usa los primeros 72 bytes.
const PASSWORD_MAX_BYTES = 72;

const email = z
  .string()
  .trim()
  .min(1, 'Ingresa tu email')
  .pipe(z.email('Ingresa un email válido'));

const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
    'La contraseña es demasiado larga',
  );

export const loginSchema = z.object({
  email,
  password,
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresa tu nombre').max(100, 'Máximo 100 caracteres'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
