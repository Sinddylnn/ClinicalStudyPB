import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet, ColorValue } from 'react-native';

const TEAL = '#0E7C86'; // troque pelo hex exato do Figma
const INACTIVE = '#9CA3AF';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => (
    <Ionicons name={name} size={22} color={String(color)} />
  );

type TabButtonProps = {
  children: React.ReactNode;
  onPress?: (e: any) => void;
  onLongPress?: ((e: any) => void) | null;
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  testID?: string;
};

// Botão da aba com o traço teal no topo quando ativa
function TabButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: TabButtonProps) {
  const focused = accessibilityState?.selected;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.tabButton}
    >
      {focused && <View style={styles.indicator} />}
      {children}
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: INACTIVE,
        tabBarButton: (props) => (
          <TabButton
            onPress={props.onPress}
            onLongPress={props.onLongPress}
            accessibilityState={props.accessibilityState}
            accessibilityLabel={props.accessibilityLabel}
            testID={props.testID}
          >
            {props.children}
          </TabButton>
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 64,
          paddingTop: 0,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: tabIcon('home-outline') }}
      />
      <Tabs.Screen
        name="estudos"
        options={{ title: 'Estudos', tabBarIcon: tabIcon('flask-outline') }}
      />
      <Tabs.Screen
        name="visitas"
        options={{ title: 'Visitas', tabBarIcon: tabIcon('calendar-outline') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('person-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: TEAL,
  },
});