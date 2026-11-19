import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { CredenciaisInvalidasError } from '../services/authService';


// Mensagem do Figma: 401 CREDENCIAIS_INVALIDAS, genérica
const MSG_CREDENCIAIS = 'E-mail ou senha inválidos. Confira os dados e tente novamente.';
// Sem estado no Figma: falha de conexão ou erro inesperado
const MSG_FALHA = 'Não foi possível entrar agora. Tente novamente.';
// Mensagem do Figma
const MSG_PERFIL = 'Este aplicativo é para participantes. Use o sistema web.';
// Texto do Figma
const MSG_SESSAO_EXPIRADA = 'Sua sessão expirou após 30 minutos sem uso. Entre novamente.';

// Medidas do Figma (frame de 390 px de largura). Ajuste aqui se precisar.
const HERO_ALTURA = 431; // altura do bloco escuro
const HERO_SOBREPOSICAO = 40; // quanto o bloco claro sobe sobre o escuro
const HERO_RODAPE = 124; // distância entre os chips e o fim do bloco escuro
const ESPACO_TITULO_CHIPS = 18; // espaço entre o título e os chips

export default function LoginScreen() {
  const { entrar, aviso, limparAviso } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [foco, setFoco] = useState<'email' | 'senha' | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviar = async () => {
  if (carregando) return;
  limparAviso();

  // Campos vazios: mesma mensagem genérica do Figma, sem chamar a API
  if (!email.trim() || !senha) {
    setErro(MSG_CREDENCIAIS);
    return;
  }

  setErro('');
  setCarregando(true);
  try {
    await entrar(email.trim(), senha);
  } catch (e) {
    console.log('[login] erro:', e);
    setErro(e instanceof CredenciaisInvalidasError ? MSG_CREDENCIAIS : MSG_FALHA);
  } finally {
    setCarregando(false);
  }
};

  const mensagemErro = erro || (aviso === 'PERFIL_NAO_PARTICIPANTE' ? MSG_PERFIL : '');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Bloco escuro */}
        <View style={[styles.hero, { paddingTop: insets.top + 32 }]}>
          <View style={styles.ringTop} />
          <View style={styles.ringBottomLeft} />
          <View style={styles.ringBottomRight} />

          <View style={styles.logoContainer}>
            <View style={styles.logoIconBox}>
              <Ionicons name="flask-outline" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>ClinicalStudyPB</Text>
          </View>

          <View>
            <Text style={styles.headline}>Acompanhe sua participação nos estudos.</Text>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Ionicons name="calendar-outline" size={12} color="#5EEAD4" />
                <Text style={styles.chipText}>Próximas visitas</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="flask-outline" size={12} color="#5EEAD4" />
                <Text style={styles.chipText}>Estudos e solicitações</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bloco claro com o formulário */}
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <Text style={styles.sheetTitle}>Entrar na sua conta</Text>
          <Text style={styles.sheetSubtitle}>
            Use o e-mail e a senha recebidos da equipe do estudo.
          </Text>

          {!!mensagemErro && (
            <View style={styles.erroBox} accessibilityRole="alert" testID="erro-login">
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.erroText}>{mensagemErro}</Text>
            </View>
          )}

          {!mensagemErro && aviso === 'SESSAO_EXPIRADA' && (
            <View style={styles.avisoBox} accessibilityRole="alert" testID="aviso-sessao-expirada">
              <Ionicons name="information-circle-outline" size={16} color="#0E7C86" />
              <Text style={styles.avisoText}>{MSG_SESSAO_EXPIRADA}</Text>
            </View>
          )}

          <Text style={styles.label}>
            E-mail <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputBox, foco === 'email' && styles.inputBoxFocus]}>
            <Ionicons name="mail-outline" size={16} color="#64748B" />
            <TextInput
              testID="campo-email"
              style={styles.input}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFoco('email')}
              onBlur={() => setFoco(null)}
              editable={!carregando}
            />
          </View>

          <Text style={styles.label}>
            Senha <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputBox, foco === 'senha' && styles.inputBoxFocus]}>
            <Ionicons name="lock-closed-outline" size={16} color="#64748B" />
            <TextInput
              testID="campo-senha"
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
              value={senha}
              onChangeText={setSenha}
              onFocus={() => setFoco('senha')}
              onBlur={() => setFoco(null)}
              onSubmitEditing={enviar}
              editable={!carregando}
            />
          </View>

          <Pressable
            testID="botao-entrar"
            accessibilityRole="button"
            onPress={enviar}
            disabled={carregando}
            style={({ pressed }) => [
              styles.button,
              (pressed || carregando) && styles.buttonPressed,
            ]}
          >
            {carregando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0E7C86" />
            <Text style={styles.infoText}>
              Esqueceu a senha ou não tem acesso? Fale com a equipe do estudo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F2A3A' },
  scroll: { flexGrow: 1 },

  hero: {
    flex: 1,
    minHeight: HERO_ALTURA,
    paddingHorizontal: 24,
    paddingBottom: HERO_RODAPE,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ringTop: {
    position: 'absolute',
    top: -40,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 28,
    borderColor: '#5EEAD414',
  },
  ringBottomLeft: {
    position: 'absolute',
    bottom: -19,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 16,
    borderColor: '#5EEAD414',
  },
  ringBottomRight: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 20,
    borderColor: '#5EEAD414',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  logoIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#0E7C86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { marginLeft: 8, fontWeight: '600', color: '#FFFFFF', fontSize: 14 },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: ESPACO_TITULO_CHIPS,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipText: { fontSize: 11, color: '#E2E8F0' },

  sheet: {
    marginTop: -HERO_SOBREPOSICAO,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F2A3A', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },

  erroBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  
  erroText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#B91C1C' },

  avisoBox: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 8,
  padding: 12,
  marginBottom: 16,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#BFE3E6',
  backgroundColor: '#E8F5F6',
},
avisoText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#0E5F67' },

  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6 },
  required: { color: '#DC2626' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  inputBoxFocus: { borderColor: '#0E7C86' },
  input: { flex: 1, fontSize: 14, color: '#1E293B', paddingVertical: 0 },

  button: {
    height: 48,
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: '#0E7C86',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  infoText: { flex: 1, fontSize: 11, lineHeight: 16, color: '#64748B' },
});
