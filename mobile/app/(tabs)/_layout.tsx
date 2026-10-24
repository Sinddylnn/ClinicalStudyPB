import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color ? String(color) : '#0ea5e9'} />
          ),
        }}
      />
      <Tabs.Screen
        name="estudos"
        options={{
          title: 'Estudos',
          tabBarIcon: ({ color }) => (
            <Ionicons name="medical" size={22} color={color ? String(color) : '#0ea5e9'} />
          ),
        }}
      />
      <Tabs.Screen
        name="visitas"
        options={{
          title: 'Visitas',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={22} color={color ? String(color) : '#0ea5e9'} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color ? String(color) : '#0ea5e9'} />
          ),
        }}
      />
    </Tabs>
  );
}
