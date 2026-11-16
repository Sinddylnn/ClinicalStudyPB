import { Platform } from 'react-native';

// Emulador Android acessa a máquina que roda o backend por 10.0.2.2.
// Simulador iOS usa localhost.
// No celular, defina EXPO_PUBLIC_API_URL com o IP da máquina na mesma rede
// (ex.: EXPO_PUBLIC_API_URL=http://192.168.0.10:8080).
const padrao = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? padrao;
