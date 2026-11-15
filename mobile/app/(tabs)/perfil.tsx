import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform, StatusBar, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

// PARTICIPANTE -> Participante
function nomeDoPerfil(perfil: string): string {
  return perfil.charAt(0) + perfil.slice(1).toLowerCase();
}

export default function PerfilScreen() {
  const { sessao, sair } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
          <Text style={styles.subtitle}>Dados da sua conta</Text>
        </View>

        <View style={styles.contentContainer}>
          {/* Dados da conta */}
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniciais(sessao?.nome ?? '')}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{sessao?.nome}</Text>
              <Text style={styles.userEmail}>{sessao?.email}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{nomeDoPerfil(sessao?.perfil ?? '')}</Text>
              </View>
            </View>
          </View>

          {/* Ações */}
          <View style={[styles.card, styles.listCard]}>
            {/* RF19/RF20 entram na Sprint 4: por enquanto a linha não navega */}
            <View style={styles.row}>
              <Ionicons name="document-text-outline" size={18} color="#0E5F67" />
              <Text style={styles.rowText}>Minhas solicitações</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
            <View style={styles.divider} />
            <Pressable
              testID="botao-sair"
              accessibilityRole="button"
              onPress={sair}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={[styles.rowText, styles.rowTextDanger]}>Sair</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Aviso */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0E7C86" />
            <Text style={styles.infoText}>
              Para alterar seus dados, fale com a equipe do estudo.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F293B' },
  container: {
    flex: 1,
    backgroundColor: '#0F2A3A',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8' },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#B45309' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  userEmail: { fontSize: 12, color: '#64748B', marginTop: 1 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#B45309' },

  listCard: { flexDirection: 'column', alignItems: 'stretch', padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: { backgroundColor: '#F8FAFC' },
  rowText: { flex: 1, fontSize: 14, color: '#1E293B' },
  rowTextDanger: { color: '#DC2626', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#E2E8F0' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B6E0E3',
    backgroundColor: '#E6F4F5',
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#0E5F67' },
});
