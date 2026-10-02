import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';

import { FormTextInput } from '@/components/FormTextInput';
import { getApiErrorMessage, getApiErrorStatus } from '@/core/api/errors';
import { login, register } from '@/features/auth/auth.api';
import { type RegisterForm, registerSchema } from '@/features/auth/auth.schemas';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function RegisterScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null);
    try {
      await register({ name, email, password });
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        setError('email', { message: 'Este email ya está registrado. Inicia sesión.' });
      } else {
        setServerError(getApiErrorMessage(error));
      }
      return;
    }

    try {
      // Inicio de sesión automático; el layout raíz navega a (app).
      await login(email, password);
    } catch {
      // La cuenta sí se creó: se envía al login para entrar manualmente.
      router.replace('/login');
    }
  });

  return (
    <AuthLayout
      subtitle="Crea tu cuenta"
      overlay={
        <Snackbar
          visible={!!serverError}
          onDismiss={() => setServerError(null)}
          duration={5000}
          action={{ label: 'OK', onPress: () => setServerError(null) }}
        >
          {serverError}
        </Snackbar>
      }
    >
      <FormTextInput
        control={control}
        name="name"
        label="Nombre"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        disabled={isSubmitting}
      />
      <FormTextInput
        control={control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        disabled={isSubmitting}
      />
      <FormTextInput
        control={control}
        name="password"
        label="Contraseña"
        secret
        autoComplete="new-password"
        textContentType="newPassword"
        disabled={isSubmitting}
      />
      <FormTextInput
        control={control}
        name="confirmPassword"
        label="Confirmar contraseña"
        secret
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        disabled={isSubmitting}
      />

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Crear cuenta
      </Button>

      <View style={styles.footer}>
        <Text variant="bodyMedium">¿Ya tienes cuenta?</Text>
        <Link href="/login" asChild>
          <Button mode="text" compact disabled={isSubmitting}>
            Ya tengo cuenta
          </Button>
        </Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 8 },
  buttonContent: { paddingVertical: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
