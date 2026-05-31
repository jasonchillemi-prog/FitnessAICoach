import React, { useState, useEffect } from 'react';
import { logWorkoutStarted, logWorkoutCompleted } from '../src/utils/analytics';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';

function WorkoutDetailScreenInner({ route, navigation }) {
  const workout = route?.params?.workout || null;
  const [detailedPlan, setDetailedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!workout) {
      setError('No workout data provided.');
      setLoading(false);
      return;
    }
    loadAndGenerate();
  }, []);

  const loadAndGenerate = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in. Please restart the app.');
        setLoading(false);
        return;
      }
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      await generateDetailedWorkout(docSnap.data());
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  const generateDetailedWorkout = async (userData) => {
    try {
      const generateWorkoutFn = httpsCallable(functions, 'generateWorkoutDetail');
      const result = await generateWorkoutFn({ workout, userData });
      setDetailedPlan(result.data);
      logWorkoutStarted(workout?.type || 'unknown');
    } catch (err) {
      setError(err.message || 'Failed to generate workout.');
    } finally {
      setLoading(false);
    }
  };

  if (!workout) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No workout data found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.day}>{workout.day || ''}</Text>
        <Text style={styles.workoutName}>{workout.workout || ''}</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>⏱ {workout.duration || ''}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5A0" />
          <Text style={styles.loadingText}>Generating your detailed workout...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAndGenerate}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryButton, { marginTop: 10, backgroundColor: '#333' }]} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : detailedPlan ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔥 Warm Up — {detailedPlan.warmup?.duration || ''}</Text>
            {(detailedPlan.warmup?.exercises || []).map((ex, i) => (
              <View key={i} style={styles.simpleItem}><Text style={styles.bullet}>•</Text><Text style={styles.simpleText}>{ex}</Text></View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💪 Main Workout</Text>
            {(detailedPlan.mainWorkout || []).map((ex, i) => (
              <View key={i} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNumBadge}><Text style={styles.exerciseNum}>{i + 1}</Text></View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.muscleGroup}>{ex.muscle}</Text>
                  </View>
                </View>
                <View style={styles.exerciseStats}>
                  <View style={styles.statPill}><Text style={styles.statPillLabel}>SETS</Text><Text style={styles.statPillValue}>{ex.sets}</Text></View>
                  <View style={styles.statPill}><Text style={styles.statPillLabel}>REPS</Text><Text style={styles.statPillValue}>{ex.reps}</Text></View>
                  <View style={styles.statPill}><Text style={styles.statPillLabel}>REST</Text><Text style={styles.statPillValue}>{ex.rest}</Text></View>
                </View>
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsLabel}>📋 How to perform:</Text>
                  <Text style={styles.instructionsText}>{ex.instructions}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🧘 Cool Down — {detailedPlan.cooldown?.duration || ''}</Text>
            {(detailedPlan.cooldown?.exercises || []).map((ex, i) => (
              <View key={i} style={styles.simpleItem}><Text style={styles.bullet}>•</Text><Text style={styles.simpleText}>{ex}</Text></View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Coach Tips</Text>
            {(detailedPlan.tips || []).map((tip, i) => (
              <View key={i} style={styles.tipItem}><Text style={styles.tipNum}>{i + 1}</Text><Text style={styles.tipText}>{tip}</Text></View>
            ))}
          </View>
          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesLabel}>Estimated Calories Burned</Text>
            <Text style={styles.caloriesValue}>{detailedPlan.estimatedCalories || 0} kcal</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Could not load workout details.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAndGenerate}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  errorContainer: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#F0F4F8', fontSize: 16, textAlign: 'center', marginBottom: 20 },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  backButton: { marginBottom: 16 },
  backText: { color: '#00E5A0', fontSize: 16, fontWeight: '600' },
  day: { fontSize: 13, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.8, marginBottom: 4 },
  workoutName: { fontSize: 22, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3, marginBottom: 10, lineHeight: 28 },
  durationBadge: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  durationText: { color: '#00E5A0', fontSize: 13, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#F0F4F8', marginTop: 20, marginBottom: 8, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#F0F4F8', marginBottom: 14 },
  simpleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bullet: { color: '#00E5A0', fontSize: 16, marginTop: 1 },
  simpleText: { fontSize: 14, color: '#8A9BB0', flex: 1, lineHeight: 20 },
  exerciseCard: { backgroundColor: '#0E1318', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  exerciseNumBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exerciseNum: { color: '#00E5A0', fontWeight: '800', fontSize: 14 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '700', color: '#F0F4F8', marginBottom: 2 },
  muscleGroup: { fontSize: 12, color: '#8A9BB0' },
  exerciseStats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statPill: { flex: 1, backgroundColor: '#1A2330', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statPillLabel: { fontSize: 9, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 4 },
  statPillValue: { fontSize: 14, fontWeight: '700', color: '#F0F4F8' },
  instructionsBox: { backgroundColor: 'rgba(0,229,160,0.05)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(0,229,160,0.1)' },
  instructionsLabel: { fontSize: 11, fontWeight: '700', color: '#00E5A0', marginBottom: 4 },
  instructionsText: { fontSize: 13, color: '#8A9BB0', lineHeight: 18 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,229,160,0.12)', color: '#00E5A0', fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 22, flexShrink: 0 },
  tipText: { fontSize: 14, color: '#8A9BB0', flex: 1, lineHeight: 20 },
  caloriesCard: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', alignItems: 'center' },
  caloriesLabel: { fontSize: 13, color: '#8A9BB0', marginBottom: 6 },
  caloriesValue: { fontSize: 32, fontWeight: '800', color: '#00E5A0', letterSpacing: -1 },
  retryButton: { backgroundColor: '#00E5A0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, paddingHorizontal: 32 },
  retryText: { color: '#040A07', fontSize: 16, fontWeight: '700' },
});

export default function WorkoutDetailScreen(props) {
  return (
    <ErrorBoundary screenName="WorkoutDetailScreen">
      <WorkoutDetailScreenInner {...props} />
    </ErrorBoundary>
  );
}
