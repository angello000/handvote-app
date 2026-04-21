import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { saveEvent } from '../store/storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_OPTIONS = ['Sí', 'No'];

export default function CreateEventScreen({ navigation }) {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(
    new Date().toLocaleDateString('es-CO')
  );
  const [questions, setQuestions] = useState([
    { id: uuidv4(), text: '', options: ['Sí', 'No', 'Abstención'], votes: [0, 0, 0] },
  ]);

  function addQuestion() {
    setQuestions([
      ...questions,
      { id: uuidv4(), text: '', options: ['Sí', 'No', 'Abstención'], votes: [0, 0, 0] },
    ]);
  }

  function removeQuestion(qid) {
    if (questions.length === 1) {
      Alert.alert('Mínimo una pregunta', 'El evento debe tener al menos una pregunta.');
      return;
    }
    setQuestions(questions.filter((q) => q.id !== qid));
  }

  function updateQuestionText(qid, text) {
    setQuestions(questions.map((q) => (q.id === qid ? { ...q, text } : q)));
  }

  function updateOption(qid, optIdx, text) {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid) return q;
        const options = [...q.options];
        options[optIdx] = text;
        return { ...q, options };
      })
    );
  }

  function addOption(qid) {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid) return q;
        if (q.options.length >= 8) {
          Alert.alert('Máximo 8 opciones por pregunta');
          return q;
        }
        return { ...q, options: [...q.options, ''], votes: [...q.votes, 0] };
      })
    );
  }

  function removeOption(qid, optIdx) {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid) return q;
        if (q.options.length <= 2) {
          Alert.alert('Mínimo 2 opciones', 'Una pregunta necesita al menos 2 opciones.');
          return q;
        }
        const options = q.options.filter((_, i) => i !== optIdx);
        const votes = q.votes.filter((_, i) => i !== optIdx);
        return { ...q, options, votes };
      })
    );
  }

  async function handleStart() {
    if (!eventName.trim()) {
      Alert.alert('Falta el nombre', 'Por favor ingresa un nombre para el evento.');
      return;
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        Alert.alert('Pregunta vacía', 'Todas las preguntas deben tener texto.');
        return;
      }
      for (const opt of q.options) {
        if (!opt.trim()) {
          Alert.alert('Opción vacía', 'Todas las opciones deben tener texto.');
          return;
        }
      }
    }

    const event = {
      id: uuidv4(),
      name: eventName.trim(),
      date: eventDate.trim(),
      questions,
    };

    await saveEvent(event);
    navigation.replace('Voting', { eventId: event.id, questionIndex: 0 });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#1a1a2e' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Nombre del Evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Asamblea General 2026"
          placeholderTextColor="#555"
          value={eventName}
          onChangeText={setEventName}
        />

        <Text style={styles.sectionLabel}>Fecha</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#555"
          value={eventDate}
          onChangeText={setEventDate}
        />

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Preguntas</Text>

        {questions.map((q, qIdx) => (
          <View key={q.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNum}>Pregunta {qIdx + 1}</Text>
              <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Escribe la pregunta..."
              placeholderTextColor="#555"
              value={q.text}
              onChangeText={(text) => updateQuestionText(q.id, text)}
              multiline
            />

            <Text style={styles.optionsLabel}>Opciones de respuesta:</Text>
            {q.options.map((opt, oIdx) => (
              <View key={oIdx} style={styles.optionRow}>
                <View style={[styles.optionDot, { backgroundColor: OPTION_COLORS[oIdx % OPTION_COLORS.length] }]} />
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Opción ${oIdx + 1}`}
                  placeholderTextColor="#555"
                  value={opt}
                  onChangeText={(text) => updateOption(q.id, oIdx, text)}
                />
                <TouchableOpacity onPress={() => removeOption(q.id, oIdx)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addOptionBtn} onPress={() => addOption(q.id)}>
              <Text style={styles.addOptionText}>+ Agregar opción</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}>
          <Text style={styles.addQuestionText}>+ Agregar pregunta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>🎤 Iniciar Evento</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const OPTION_COLORS = ['#e94560', '#0f3460', '#4ecdc4', '#ff6b6b', '#a8e6cf', '#ffd93d', '#6bceff', '#ff9ff3'];

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: { color: '#aaa', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
    marginBottom: 14,
  },
  questionCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  questionNum: { color: '#e94560', fontWeight: 'bold', fontSize: 15 },
  removeBtn: { color: '#e94560', fontSize: 18, paddingHorizontal: 4 },
  optionsLabel: { color: '#aaa', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  optionDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  optionInput: {
    flex: 1,
    backgroundColor: '#0f3460',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    marginRight: 8,
  },
  addOptionBtn: { alignSelf: 'flex-start', marginTop: 4 },
  addOptionText: { color: '#4ecdc4', fontSize: 14, fontWeight: '600' },
  addQuestionBtn: {
    borderWidth: 1.5,
    borderColor: '#e94560',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  addQuestionText: { color: '#e94560', fontWeight: 'bold', fontSize: 15 },
  startBtn: {
    backgroundColor: '#e94560',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
