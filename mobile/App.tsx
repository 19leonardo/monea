import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { apiClient } from './src/core/api/client';

type ConnectionStatus = 'loading' | 'connected' | 'error';

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('loading');

  useEffect(() => {
    apiClient
      .get('/health')
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monea</Text>
      {status === 'loading' && <ActivityIndicator />}
      {status === 'connected' && <Text style={styles.status}>✅ Conectado al backend</Text>}
      {status === 'error' && <Text style={styles.status}>❌ Sin conexión</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 18,
  },
});
