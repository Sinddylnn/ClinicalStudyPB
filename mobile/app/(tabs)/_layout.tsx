import { Link, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { Ionicons } from '@expo/vector-icons';

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
            <Ionicons name="home" size={24} color={color ? String(color) : '#0ea5e9'} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Estudos',
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={24} color={color ? String(color) : '#0ea5e9'} />
          ),
        }}
      />
    </Tabs>
  );
}
