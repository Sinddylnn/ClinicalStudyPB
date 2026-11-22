import React, { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
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
import {
  listarHistoricoVisitas,
  listarProximasVisitas,
} from '../../services/participanteService';
import type { SituacaoVisita, VisitaParticipante } from '../../services/participanteService';

const MSG_VAZIO_PROXIMAS = 'Você não tem visitas agendadas.';
const MSG_VAZIO_HISTORICO = 'Você ainda não tem histórico de visitas.';
const MSG_ERRO = 'Não foi possível carregar suas visitas. Tente novamente.';

const SITUACAO: Record<
  SituacaoVisita,
  { rotulo: string; fundo: string; texto: string; ponto: string }
> = {
  AGENDADA: { rotulo: 'Agendada', fundo: '#E0EAFF', texto: '#1D4ED8', ponto: '#3B82F6' },
  REALIZADA: { rotulo: 'Realizada', fundo: '#E7F6EC', texto: '#15803D', ponto: '#16A34A' },
  AUSENTE: { rotulo: 'Ausente', fundo: '#FEF3C7', texto: '#B45309', ponto: '#F59E0B' },
  CANCELADA: { rotulo: 'Cancelada', fundo: '#F1F5F9', texto: '#64748B', ponto: '#94A3B8' },
};

const SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const TEM_FUSO = /(Z|[+-]\d{2}:?\d{2})$/;
const dois = (n: number) => String(n).padStart(2, '0');

// Datas no fuso America/Recife (UTC-3, sem horário de verão).
// Com fuso na resposta (Z ou -03:00), converte o instante; sem fuso, lê o texto como está.
function formatarDataHora(iso: string, comSemana: boolean): string {
  if (!iso) return '';
  let d: Date;
  let temHora = true;
  if (TEM_FUSO.test(iso)) {
    d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  } else {
    const [dia, hora] = iso.split('T');
    const [a, m, dd] = dia.split('-').map(Number);
    const [h, min] = (hora ?? '00:00').split(':').map(Number);
    temHora = hora !== undefined;
    d = new Date(Date.UTC(a, m - 1, dd, h, min));
  }
  const data = `${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  const prefixo = comSemana ? `${SEMANA[d.getUTCDay()]}, ` : '';
  const hora = temHora ? ` • ${dois(d.getUTCHours())}:${dois(d.getUTCMinutes())}` : '';
  return `${prefixo}${data}${hora}`;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

type Aba = 'PROXIMAS' | 'HISTORICO';

function Abas({ aba, aoTrocar }: { aba: Aba; aoTrocar: (a: Aba) => void }) {
  const itens: { chave: Aba; rotulo: string }[] = [
    { chave: 'PROXIMAS', rotulo: 'Próximas' },
    { chave: 'HISTORICO', rotulo: 'Histórico' },
  ];
  return (
    <View style={styles.segmento}>
      {itens.map((item) => {
        const ativa = aba === item.chave;
        return (
          <Pressable
            key={item.chave}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            onPress={() => aoTrocar(item.chave)}
            style={[styles.segmentoItem, ativa && styles.segmentoItemAtivo]}
          >
            <Text style={[styles.segmentoTexto, ativa && styles.segmentoTextoAtivo]}>
              {item.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Cartao({
  visita,
  comAcoes,
  comSemana,
}: {
  visita: VisitaParticipante;
  comAcoes: boolean;
  comSemana: boolean;
}) {
  const s = SITUACAO[visita.situacao] ?? {
    rotulo: String(visita.situacao),
    fundo: '#F1F5F9',
    texto: '#64748B',
    ponto: '#94A3B8',
  };

  return (
    <View style={styles.card} testID="cartao-visita">
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{visita.titulo}</Text>
        <View style={[styles.badge, { backgroundColor: s.fundo }]}>
          <View style={[styles.badgeDot, { backgroundColor: s.ponto }]} />
          <Text style={[styles.badgeText, { color: s.texto }]}>{s.rotulo}</Text>
        </View>
      </View>
      {!!visita.estudoTitulo && <Text style={styles.estudo}>{visita.estudoTitulo}</Text>}
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={14} color="#64748B" />
        <Text style={styles.rowText}>{formatarDataHora(visita.dataHora, comSemana)}</Text>
      </View>

      {/* Confirmar e reagendar entram na Sprint 4 (RF19): por enquanto sem ação */}
      {comAcoes && (
        <>
          <View style={styles.botaoPrimario} accessibilityRole="button">
            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.botaoPrimarioTexto}>Confirmar presença</Text>
          </View>
          <View style={styles.botaoSecundario} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={16} color="#1E293B" />
            <Text style={styles.botaoSecundarioTexto}>Pedir reagendamento</Text>
          </View>
        </>
      )}
    </View>
  );
}

function CartaoCarregando() {
  return (
    <View style={styles.card}>
      <View style={[styles.skeleton, { width: '65%', height: 12 }]} />
      <View style={[styles.skeleton, { width: '45%', height: 10 }]} />
      <View style={[styles.skeleton, { width: '55%', height: 10 }]} />
    </View>
  );
}

function Resumo({ visitas }: { visitas: VisitaParticipante[] }) {
  const conta = (s: SituacaoVisita) => visitas.filter((v) => v.situacao === s).length;
  const itens = [
    { texto: plural(conta('REALIZADA'), 'realizada', 'realizadas'), ponto: '#16A34A', fundo: '#E7F6EC' },
    { texto: plural(conta('AUSENTE'), 'ausência', 'ausências'), ponto: '#F59E0B', fundo: '#FEF3C7' },
    { texto: plural(conta('CANCELADA'), 'cancelada', 'canceladas'), ponto: '#94A3B8', fundo: '#F1F5F9' },
  ];
  return (
    <View style={styles.resumo}>
      {itens.map((item) => (
        <View key={item.texto} style={[styles.resumoItem, { backgroundColor: item.fundo }]}>
          <View style={[styles.badgeDot, { backgroundColor: item.ponto }]} />
          <Text style={styles.resumoTexto}>{item.texto}</Text>
        </View>
      ))}
    </View>
  );
}

export default function VisitasScreen() {
  const [aba, setAba] = useState<Aba>('PROXIMAS');
  const [dados, setDados] = useState<{
    proximas: VisitaParticipante[];
    historico: VisitaParticipante[];
  } | null>(null);
  const [erro, setErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [proximas, historico] = await Promise.all([
        listarProximasVisitas(),
        listarHistoricoVisitas(),
      ]);
      setDados({ proximas, historico });
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  // Recarrega ao entrar na aba: uma visita agendada na web aparece aqui
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

  const carregando = dados === null && !erro;
  const lista = dados ? (aba === 'PROXIMAS' ? dados.proximas : dados.historico) : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Visitas</Text>
          <Text style={styles.subtitle}>Próximas visitas e comparecimento</Text>
        </View>

        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
        >
          <Abas aba={aba} aoTrocar={setAba} />

          {erro && (
            <View style={styles.erroBox} accessibilityRole="alert" testID="erro-visitas">
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
                <Text style={styles.rowText}>Carregando suas visitas...</Text>
              </View>
            </>
          )}

          {dados && aba === 'HISTORICO' && lista.length > 0 && <Resumo visitas={lista} />}

          {dados && !erro && lista.length === 0 && (
            <View style={styles.vazioBox} testID="visitas-vazio">
              <View style={styles.vazioIcone}>
                <Ionicons name="calendar-outline" size={24} color="#374151" />
              </View>
              <Text style={styles.vazioText}>
                {aba === 'PROXIMAS' ? MSG_VAZIO_PROXIMAS : MSG_VAZIO_HISTORICO}
              </Text>
            </View>
          )}

          {lista.map((visita, i) => (
            <Cartao
              key={`${visita.id}-${i}`}
              visita={visita}
              comAcoes={aba === 'PROXIMAS' && i === 0}
              comSemana={aba === 'PROXIMAS'}
            />
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

  segmento: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  segmentoItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentoItemAtivo: { backgroundColor: '#FFFFFF' },
  segmentoTexto: { fontSize: 13, color: '#64748B' },
  segmentoTextoAtivo: { fontWeight: '600', color: '#1E293B' },

  resumo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resumoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  resumoTexto: { fontSize: 11, color: '#475569' },

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
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  estudo: { fontSize: 12, color: '#64748B' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 12, color: '#64748B' },

  botaoPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#0E7C86',
  },
  botaoPrimarioTexto: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  botaoSecundarioTexto: { fontSize: 13, fontWeight: '600', color: '#1E293B' },

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