import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getEventById, saveEvent } from '../store/storage';

const { width, height } = Dimensions.get('window');

const OPTION_COLORS = ['#e94560', '#4ecdc4', '#ffd93d', '#ff6b6b', '#a8e6cf', '#6bceff', '#ff9ff3', '#0f3460'];

export default function VotingScreen({ navigation, route }) {
  const { eventId, questionIndex = 0 } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [event, setEvent] = useState(null);
  const [currentQIdx, setCurrentQIdx] = useState(questionIndex);
  const [capturedCount, setCapturedCount] = useState(null);
  const [currentOptionIdx, setCurrentOptionIdx] = useState(0);
  const [votes, setVotes] = useState([]);  // votes per option for current question
  const [phase, setPhase] = useState('ready'); // 'ready' | 'captured' | 'done'
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadEvent();
  }, []);

  useEffect(() => {
    if (event) {
      const q = event.questions[currentQIdx];
      setVotes(new Array(q.options.length).fill(0));
      setCurrentOptionIdx(0);
      setCapturedCount(null);
      setPhase('ready');
    }
  }, [currentQIdx, event]);

  async function loadEvent() {
    const ev = await getEventById(eventId);
    setEvent(ev);
  }

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }

  function stopPulse() {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }

  async function takeSnapshot() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    startPulse();
    try {
      // Simulate a short count delay for UX
      await new Promise((res) => setTimeout(res, 1200));
      // In a real TF.js integration this is where hand detection runs.
      // We expose this as a manual count interface since TF.js on RN requires
      // a dev client build and a native backend. The "capture" here freezes
      // the moment and lets the presenter confirm the count.
      setCapturedCount(0);
      setPhase('captured');
    } finally {
      setIsCapturing(false);
      stopPulse();
    }
  }

  function adjustCount(delta) {
    setCapturedCount((c) => Math.max(0, (c ?? 0) + delta));
  }

  function confirmCount() {
    const q = event.questions[currentQIdx];
    const newVotes = [...votes];
    newVotes[currentOptionIdx] = capturedCount;
    setVotes(newVotes);

    if (currentOptionIdx < q.options.length - 1) {
      setCurrentOptionIdx(currentOptionIdx + 1);
      setCapturedCount(null);
      setPhase('ready');
    } else {
      // All options captured — save and move on
      saveVotesForQuestion(newVotes);
    }
  }

  async function saveVotesForQuestion(finalVotes) {
    const updated = { ...event };
    updated.questions[currentQIdx] = {
      ...updated.questions[currentQIdx],
      votes: finalVotes,
    };
    await saveEvent(updated);
    setEvent(updated);

    if (currentQIdx < event.questions.length - 1) {
      Alert.alert(
        '✅ Pregunta guardada',
        `Resultados de "${event.questions[currentQIdx].text}" registrados.`,
        [
          {
            text: 'Siguiente pregunta',
            onPress: () => setCurrentQIdx(currentQIdx + 1),
          },
        ]
      );
    } else {
      setPhase('done');
    }
  }

  function skipOption() {
    const q = event.questions[currentQIdx];
    const newVotes = [...votes];
    newVotes[currentOptionIdx] = 0;
    setVotes(newVotes);
    if (currentOptionIdx < q.options.length - 1) {
      setCurrentOptionIdx(currentOptionIdx + 1);
      setCapturedCount(null);
      setPhase('ready');
    } else {
      saveVotesForQuestion(newVotes);
    }
  }

  async function finishEvent() {
    navigation.replace('Results', { eventId });
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Permiso de Cámara Requerido</Text>
        <Text style={styles.permText}>
          HandVote necesita acceso a la cámara para capturar los votos de tu audiencia.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff' }}>Cargando evento...</Text>
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneIcon}>🎉</Text>
        <Text style={styles.doneTitle}>¡Evento finalizado!</Text>
        <Text style={styles.doneText}>Todos los votos han sido registrados correctamente.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={finishEvent} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>📊 Ver Resultados</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = event.questions[currentQIdx];
  const currentOption = question.options[currentOptionIdx];
  const optionColor = OPTION_COLORS[currentOptionIdx % OPTION_COLORS.length];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        {/* Top overlay */}
        <View style={styles.topOverlay}>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              Pregunta {currentQIdx + 1}/{event.questions.length}
            </Text>
          </View>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        {/* Option indicator */}
        <View style={[styles.optionBadge, { backgroundColor: optionColor + 'dd' }]}>
          <Text style={styles.optionBadgeText}>
            Opción: {currentOption}
          </Text>
          <Text style={styles.optionProgress}>
            {currentOptionIdx + 1} de {question.options.length}
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomOverlay}>
          {phase === 'ready' && (
            <>
              <Text style={styles.instructionText}>
                Pide a tu audiencia que levante la mano si elige{' '}
                <Text style={{ color: optionColor, fontWeight: 'bold' }}>"{currentOption}"</Text>
              </Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.captureBtn, isCapturing && styles.captureBtnActive]}
                  onPress={takeSnapshot}
                  activeOpacity={0.85}
                  disabled={isCapturing}
                >
                  <Text style={styles.captureBtnText}>
                    {isCapturing ? '⏳ Capturando...' : '📸 Capturar Votos'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity onPress={skipOption} style={styles.skipBtn}>
                <Text style={styles.skipText}>Saltar (0 votos)</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === 'captured' && (
            <View style={styles.countPanel}>
              <Text style={styles.countLabel}>Manos contadas</Text>
              <Text style={styles.countInstruction}>Ajusta si es necesario:</Text>
              <View style={styles.countRow}>
                <TouchableOpacity style={styles.countBtn} onPress={() => adjustCount(-1)}>
                  <Text style={styles.countBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.countNumber}>{capturedCount}</Text>
                <TouchableOpacity style={styles.countBtn} onPress={() => adjustCount(1)}>
                  <Text style={styles.countBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: optionColor }]}
                onPress={confirmCount}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>
                  ✅ Confirmar {capturedCount} votos para "{currentOption}"
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  // Permission screen
  permContainer: {
    flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 36,
  },
  permIcon: { fontSize: 64, marginBottom: 20 },
  permTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  permText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permBtn: {
    backgroundColor: '#e94560', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Overlays
  topOverlay: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  progressBadge: {
    alignSelf: 'flex-start', backgroundColor: '#e94560', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  progressText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  questionText: {
    color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 26,
  },
  optionBadge: {
    position: 'absolute', top: height * 0.22,
    left: 20, right: 20, borderRadius: 14, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  optionBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  optionProgress: { color: '#ffffffcc', fontSize: 13 },
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 20,
    paddingBottom: 40, paddingTop: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  instructionText: { color: '#ddd', textAlign: 'center', fontSize: 15, marginBottom: 18, lineHeight: 22 },
  captureBtn: {
    backgroundColor: '#e94560', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  captureBtnActive: { backgroundColor: '#b33045' },
  captureBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  skipBtn: { marginTop: 14, alignItems: 'center' },
  skipText: { color: '#888', fontSize: 14 },

  // Count panel
  countPanel: { alignItems: 'center' },
  countLabel: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  countInstruction: { color: '#aaa', fontSize: 14, marginBottom: 18 },
  countRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  countBtn: {
    backgroundColor: '#16213e', borderRadius: 14, width: 52, height: 52,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#e94560',
  },
  countBtnText: { color: '#e94560', fontSize: 28, fontWeight: 'bold', lineHeight: 30 },
  countNumber: { color: '#fff', fontSize: 64, fontWeight: 'bold', marginHorizontal: 30, lineHeight: 72 },
  confirmBtn: {
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center', width: '100%',
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },

  // Done
  doneContainer: {
    flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 40,
  },
  doneIcon: { fontSize: 72, marginBottom: 20 },
  doneTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 14, textAlign: 'center' },
  doneText: { color: '#888', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  doneBtn: {
    backgroundColor: '#e94560', borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
