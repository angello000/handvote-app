import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getEventById } from '../store/storage';
import { exportEventToExcel } from '../utils/exportExcel';

const OPTION_COLORS = ['#e94560', '#4ecdc4', '#ffd93d', '#ff6b6b', '#a8e6cf', '#6bceff', '#ff9ff3', '#0f3460'];

export default function ResultsScreen({ route, navigation }) {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [])
  );

  async function loadEvent() {
    const ev = await getEventById(eventId);
    setEvent(ev);
  }

  async function handleExport() {
    if (!event) return;
    setExporting(true);
    try {
      await exportEventToExcel(event);
    } catch (e) {
      Alert.alert('Error al exportar', e.message);
    } finally {
      setExporting(false);
    }
  }

  if (!event) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#e94560" />
      </View>
    );
  }

  const totalVotes = event.questions.reduce((sum, q) => sum + q.votes.reduce((s, v) => s + v, 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event header */}
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventDate}>📅 {event.date}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statNum}>{event.questions.length}</Text>
              <Text style={styles.statLabel}>Preguntas</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statNum}>{totalVotes}</Text>
              <Text style={styles.statLabel}>Votos totales</Text>
            </View>
          </View>
        </View>

        {event.questions.map((q, qIdx) => {
          const total = q.votes.reduce((s, v) => s + v, 0);
          const maxVotes = Math.max(...q.votes, 1);

          return (
            <View key={q.id} style={styles.questionCard}>
              <Text style={styles.questionNum}>Pregunta {qIdx + 1}</Text>
              <Text style={styles.questionText}>{q.text}</Text>

              {q.options.map((opt, oIdx) => {
                const count = q.votes[oIdx] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const barWidth = total > 0 ? (count / maxVotes) * 100 : 0;
                const color = OPTION_COLORS[oIdx % OPTION_COLORS.length];

                return (
                  <View key={oIdx} style={styles.optionRow}>
                    <View style={styles.optionLabelRow}>
                      <View style={[styles.dot, { backgroundColor: color }]} />
                      <Text style={styles.optionName}>{opt}</Text>
                      <Text style={styles.optionCount}>{count} votos</Text>
                      <Text style={[styles.optionPct, { color }]}>{pct}%</Text>
                    </View>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${barWidth}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}

              <Text style={styles.questionTotal}>Total: {total} votos</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Export button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.exportBtnText}>📤 Exportar a Excel</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeBtnText}>🏠 Inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  eventCard: {
    backgroundColor: '#16213e', borderRadius: 18, padding: 20, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: '#e94560',
  },
  eventName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  eventDate: { color: '#888', fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBadge: {
    flex: 1, backgroundColor: '#0f3460', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  statNum: { color: '#e94560', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 2 },
  questionCard: {
    backgroundColor: '#16213e', borderRadius: 16, padding: 18, marginBottom: 16,
  },
  questionNum: { color: '#e94560', fontWeight: 'bold', fontSize: 13, marginBottom: 6 },
  questionText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 18, lineHeight: 22 },
  optionRow: { marginBottom: 14 },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  optionName: { color: '#ddd', fontSize: 14, flex: 1 },
  optionCount: { color: '#aaa', fontSize: 13, marginRight: 8 },
  optionPct: { fontWeight: 'bold', fontSize: 16 },
  barBg: { height: 8, backgroundColor: '#0f3460', borderRadius: 4 },
  barFill: { height: 8, borderRadius: 4 },
  questionTotal: { color: '#555', fontSize: 12, marginTop: 8, textAlign: 'right' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#16213e', paddingHorizontal: 20, paddingBottom: 34, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#0f3460', gap: 10,
  },
  exportBtn: {
    backgroundColor: '#e94560', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  exportBtnDisabled: { backgroundColor: '#7a2233' },
  exportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  homeBtn: {
    backgroundColor: '#0f3460', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
