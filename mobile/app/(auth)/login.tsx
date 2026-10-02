import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text } from 'react-native-paper';

import { FormTextInput } from '@/components/FormTextInput';
import { getApiErrorMessage } from '@/core/api/errors';
import { login } from '@/features/auth/auth.api';
import { type LoginForm, loginSchema } from '@/features/auth/auth.schemas';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      // login() guarda los tokens y abre la sesión; el layout raíz navega a (app).
      await login(email, password);
    } catch (error) {
      setServerError(
        getApiErrorMessage(error, {
          401: 'Email o contraseña incorrectos.',
          403: 'Tu cuenta está desactivada.',
        }),
      );
    }
  });

  return (
    <AuthLayout
      subtitle="Inicia sesión en tu cuenta"
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
        autoComplete="current-password"
        textContentType="password"
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
        Iniciar sesión
      </Button>

      <View style={styles.footer}>
        <Text variant="bodyMedium">¿No tienes cuenta?</Text>
        <Link href="/register" asChild>
          <Button mode="text" compact disabled={isSubmitting}>
            Crear cuenta
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
