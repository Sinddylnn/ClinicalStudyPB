import { StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>

      {/* Cabeçalho de Boas-Vindas */}

      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeSubtitle}>Participante / Paciente</Text>
          <Text style={styles.welcomeTitle}>Painel de Saúde</Text>
        </View>
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: themeColors.primary + '20' }]}>
          <Ionicons name="person-outline" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Próximo Compromisso / Card de Destaque */}

      <View style={[
        styles.highlightCard, 
        { 
          backgroundColor: themeColors.cardBackground, 
          borderColor: themeColors.secondary,
          shadowOpacity: colorScheme === 'dark' ? 0.2 : 0.05 // Movido para cá dinamicamente
        }
      ]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="calendar" size={22} color={themeColors.secondary} />
          <Text style={[styles.cardTag, { color: themeColors.secondary }]}>Próxima Visita</Text>
        </View>
        <Text style={styles.cardTitle}>Consulta de Acompanhamento</Text>
        <Text style={styles.cardInfo}>Amanhã, às 14:30 - Dr. Carlos Silva</Text>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.actionButtonText}>Confirmar Presença</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de Ações Rápidas */}
      
      <Text style={styles.sectionTitle}>Ações do Participante</Text>

      <TouchableOpacity style={[styles.menuCard, { backgroundColor: themeColors.cardBackground }]}>
        <View style={[styles.iconContainer, { backgroundColor: themeColors.primary + '15' }]}>
          <Ionicons name="medical-outline" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Consultar Estudos e Visitas</Text>
          <Text style={styles.menuDescription}>Visualize o cronograma e os detalhes do seu estudo clínico.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuCard, { backgroundColor: themeColors.cardBackground }]}>
        <View style={[styles.iconContainer, { backgroundColor: themeColors.secondary + '15' }]}>
          <Ionicons name="calendar-number-outline" size={24} color={themeColors.secondary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Reagendamento</Text>
          <Text style={styles.menuDescription}>Confirme sua presença ou solicite alteração de horário.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.menuCard, { backgroundColor: themeColors.cardBackground }]}>
        <View style={[styles.iconContainer, { backgroundColor: themeColors.primary + '15' }]}>
          <Ionicons name="cube-outline" size={24} color={themeColors.primary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>Retiradas e Pedidos</Text>
          <Text style={styles.menuDescription}>Solicite kits e acompanhe o status dos seus pedidos.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTag: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
    actionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#64748b',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: '#64748b',
  },
});