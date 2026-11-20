import React, { useCallback, useState } from 'react';
import {
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { listarEstudos } from '../../services/participanteService';
import type { EstudoParticipante } from '../../services/participanteService';

// Rótulos do Figma. Se a equipe preferir "Incluído", é só trocar aqui.
const ROTULO_ATIVA = 'Participação ativa';
const ROTULO_RETIRADA = 'Retirada';

const ROTULO_ESTADO: Record<string, string> = {
  PLANEJAMENTO: 'Planejamento',
  RECRUTAMENTO: 'Recrutamento',
  EXECUCAO: 'Execução',
  EXECUÇÃO: 'Execução',
  ENCERRADO: 'Encerrado',
};

const MSG_VAZIO = 'Você ainda não está incluída em nenhum estudo.';
const MSG_ERRO = 'Não foi possível carregar seus estudos. Tente novamente.';

function rotuloEstado(estado: string): string {
  const chave = (estado ?? '').toUpperCase();
  return ROTULO_ESTADO[chave] ?? estado;
}

function Linha({
  icone,
  texto,
}: {
  icone: React.ComponentProps<typeof Ionicons>['name'];
  texto: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icone} size={14} color="#64748B" />
      <Text style={styles.rowText}>{texto}</Text>
    </View>
  );
}

function CartaoEstudo({ estudo }: { estudo: EstudoParticipante }) {
  const retirada = estudo.situacaoParticipacao === 'RETIRADA';

  return (
    <View style={styles.card} testID="cartao-estudo">
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, retirada && styles.iconBoxRetirada]}>
          <Ionicons name="flask-outline" size={18} color={retirada ? '#64748B' : '#0E7C86'} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{estudo.titulo}</Text>
          <View style={[styles.badge, retirada && styles.badgeRetirada]}>
            <View style={[styles.badgeDot, retirada && styles.badgeDotRetirada]} />
            <Text style={[styles.badgeText, retirada && styles.badgeTextRetirada]}>
              {retirada ? ROTULO_RETIRADA : ROTULO_ATIVA}
            </Text>
          </View>
        </View>
        {/* Detalhe do estudo ainda não implementado */}
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>

      <View style={styles.divider} />

      <Linha icone="pulse-outline" texto={`Estado do estudo: ${rotuloEstado(estudo.estado)}`} />
      {retirada && <Linha icone="document-text-outline" texto="Histórico de visitas disponível" />}
    </View>
  );
}

function CartaoCarregando() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, styles.skeleton]} />
        <View style={styles.cardInfo}>
          <View style={[styles.skeleton, { width: '70%', height: 12 }]} />
          <View style={[styles.skeleton, { width: '40%', height: 10, marginTop: 8 }]} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={[styles.skeleton, { width: '60%', height: 10 }]} />
      <View style={[styles.skeleton, { width: '45%', height: 10, marginTop: 10 }]} />
    </View>
  );
}

export default function EstudosScreen() {
  const [estudos, setEstudos] = useState<EstudoParticipante[] | null>(null);
  const [erro, setErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setEstudos(await listarEstudos());
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  // Recarrega ao entrar na aba: uma inclusão feita na web aparece aqui
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const atualizar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const carregando = estudos === null && !erro;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus estudos</Text>
          <Text style={styles.subtitle}>Estudos em que você está incluída</Text>
        </View>

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
        >
          {erro && (
            <View style={styles.erroBox} accessibilityRole="alert" testID="erro-estudos">
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.erroText}>{MSG_ERRO}</Text>
            </View>
          )}

          {carregando && (
            <>
              <CartaoCarregando />
              <CartaoCarregando />
              <View style={styles.row}>
                <Ionicons name="time-outline" size={14} color="#64748B" />
                <Text style={styles.rowText}>Carregando seus estudos...</Text>
              </View>
            </>
          )}

          {estudos?.length === 0 && !erro && (
            <View style={styles.vazioBox} testID="estudos-vazio">
              <View style={styles.vazioIcone}>
                <Ionicons name="flask-outline" size={24} color="#374151" />
              </View>
              <Text style={styles.vazioText}>{MSG_VAZIO}</Text>
            </View>
          )}

          {estudos?.map((estudo) => (
            <CartaoEstudo key={estudo.estudoId} estudo={estudo} />
          ))}
        </ScrollView>
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
  },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E0F2F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxRetirada: { backgroundColor: '#F1F5F9' },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#E7F6EC',
  },
  badgeRetirada: { backgroundColor: '#F1F5F9' },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  badgeDotRetirada: { backgroundColor: '#94A3B8' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#15803D' },
  badgeTextRetirada: { color: '#64748B' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 12, color: '#64748B' },

  skeleton: { backgroundColor: '#E2E8F0', borderRadius: 6 },

  vazioBox: { alignItems: 'center', padding: 24, gap: 12 },
  vazioIcone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vazioText: { fontSize: 13, color: '#64748B', textAlign: 'center' },

  erroBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  erroText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#B91C1C' },
});