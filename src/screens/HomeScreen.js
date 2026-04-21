import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getEvents, deleteEvent } from '../store/storage';

export default function HomeScreen({ navigation }) {
  const [events, setEvents] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  async function loadEvents() {
    const evs = await getEvents();
    setEvents(evs.reverse());
  }

  function confirmDelete(eventId, eventName) {
    Alert.alert(
      'Eliminar evento',
      `¿Eliminar "${eventName}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(eventId);
            loadEvents();
          },
        },
      ]
    );
  }

  function renderEvent({ item }) {
    const totalVotes = item.questions.reduce((sum, q) => {
      return sum + q.votes.reduce((s, v) => s + v, 0);
    }, 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {item.questions.length} preguntas · {totalVotes} votos totales
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.navigate('Results', { eventId: item.id })}
          >
            <Text style={styles.btnSecondaryText}>📊 Resultados</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnDanger}
            onPress={() => confirmDelete(item.id, item.name)}
          >
            <Text style={styles.btnDangerText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎤</Text>
          <Text style={styles.emptyTitle}>Sin eventos aún</Text>
          <Text style={styles.emptyText}>
            Crea tu primer evento y empieza a capturar votos de tu audiencia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Nuevo Evento</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 1 },
  cardDate: { color: '#e94560', fontSize: 13, marginLeft: 8 },
  cardMeta: { color: '#888', fontSize: 13, marginBottom: 14 },
  cardActions: { flexDirection: 'row', gap: 10 },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#0f3460',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnDanger: {
    backgroundColor: '#3d0a0a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  btnDangerText: { fontSize: 18 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
    backgroundColor: '#e94560',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: { color: '#fff', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
});
