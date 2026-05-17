import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function WorkoutDetailScreen({ route, navigation }) {
  const { workout } = route.params;
  const [detailedPlan, setDetailedPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAndGenerate(); }, []);

  const loadAndGenerate = async () => {
    try {
      const user = auth.currentUser;
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      await generateDetailedWorkout(docSnap.data());
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const generateDetailedWorkout = async (user) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': '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', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: `Create a detailed workout. User: ${user?.weight}lbs, Goals: ${user?.goals?.join(', ')}, ${user?.workoutsPerWeek} days/week.\nWorkout: ${workout.workout}\nDuration: ${workout.duration}\nDay: ${workout.day}\nRespond ONLY with valid JSON:\n{"warmup":{"duration":"5 mins","exercises":["ex1","ex2"]},"mainWorkout":[{"name":"Name","sets":3,"reps":"10-12","rest":"60 sec","muscle":"Chest","instructions":"How to do it."}],"cooldown":{"duration":"5 mins","exercises":["stretch1"]},"tips":["tip1"],"estimatedCalories":250}` }]
        })
      });
      const rawText = await response.text();
      const data = JSON.parse(rawText);
      if (data.error) { Alert.alert('Error', data.error.message); return; }
      const t = data.content[0].text;
      const parsed = JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
      setDetailedPlan(parsed);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.day}>{workout.day}</Text>
        <Text style={styles.workoutName}>{workout.workout}</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>⏱ {workout.duration}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5A0" />
          <Text style={styles.loadingText}>Generating your detailed workout...</Text>
        </View>
      ) : detailedPlan ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔥 Warm Up — {detailedPlan.warmup.duration}</Text>
            {detailedPlan.warmup.exercises.map((ex, i) => (
              <View key={i} style={styles.simpleItem}><Text style={styles.bullet}>•</Text><Text style={styles.simpleText}>{ex}</Text></View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💪 Main Workout</Text>
            {detailedPlan.mainWorkout.map((ex, i) => (
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
            <Text style={styles.cardTitle}>🧘 Cool Down — {detailedPlan.cooldown.duration}</Text>
            {detailedPlan.cooldown.exercises.map((ex, i) => (
              <View key={i} style={styles.simpleItem}><Text style={styles.bullet}>•</Text><Text style={styles.simpleText}>{ex}</Text></View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💡 Coach Tips</Text>
            {detailedPlan.tips.map((tip, i) => (
              <View key={i} style={styles.tipItem}><Text style={styles.tipNum}>{i + 1}</Text><Text style={styles.tipText}>{tip}</Text></View>
            ))}
          </View>
          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesLabel}>Estimated Calories Burned</Text>
            <Text style={styles.caloriesValue}>{detailedPlan.estimatedCalories} kcal</Text>
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
