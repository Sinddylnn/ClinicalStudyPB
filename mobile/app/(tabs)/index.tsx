import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabeçalho idêntico ao Figma */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBox}>
              <Ionicons name="flask-outline" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>ClinicalStudyPB</Text>
          </View>
          <Text style={styles.greeting}>Olá!</Text>
          <Text style={styles.subtitle}>Aplicativo do participante</Text>
        </View>

        {/* Bloco inferior com o cartão */}
        <View style={styles.contentContainer}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="home-outline" size={24} color="#374151" />
            </View>
            <Text style={styles.cardTitle}>Disponível na Sprint 3</Text>
            <Text style={styles.cardDescription}>
              Aqui você vai acompanhar a próxima visita, seus estudos e o comparecimento.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F293B',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F293B',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  logoText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: 14,
  },
  logoIconBox: {
  width: 24,
  height: 24,
  borderRadius: 6,
  backgroundColor: '#0E7C86',
  justifyContent: 'center',
  alignItems: 'center',
},
  greeting: {
    fontSize: 34, // Aumentado para corresponder ao destaque do Figma
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});