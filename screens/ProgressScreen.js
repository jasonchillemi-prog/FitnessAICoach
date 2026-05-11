import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [workedOut, setWorkedOut] = useState(null);
  const [followedMeals, setFollowedMeals] = useState(null);
  const [moodLevel, setMoodLevel] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const user = auth.currentUser;
      const checkinRef = doc(db, 'checkins', `${user.uid}_${today}`);
      const checkinSnap = await getDoc(checkinRef);
      if (checkinSnap.exists()) {
        const data = checkinSnap.data();
        setTodayCheckin(data);
        setWorkedOut(data.workedOut);
        setFollowedMeals(data.followedMeals);
        setMoodLevel(data.moodLevel);
      }

      const checkinsRef = collection(db, 'checkins');
      const q = query(checkinsRef, orderBy('date', 'desc'));
      const querySnap = await getDocs(q);
      const allCheckins = [];
      querySnap.forEach(doc => {
        if (doc.id.startsWith(user.uid)) {
          allCheckins.push(doc.data());
        }
      });
      setHistory(allCheckins);
      calculateStreak(allCheckins);
    } catch (error) {
      console.log('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (checkins) => {
    let count = 0;
    const sorted = [...checkins].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].workedOut || sorted[i].followedMeals) {
        count++;
      } else {
        break;
      }
    }
    setStreak(count);
  };

  const saveCheckin = async () => {
    if (workedOut === null || followedMeals === null || moodLevel === null) {
      Alert.alert('Error', 'Please answer all questions before saving');
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      const checkinData = {
        userId: user.uid,
        date: today,
        workedOut,
        followedMeals,
        moodLevel,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'checkins', `${user.uid}_${today}`), checkinData);
      setTodayCheckin(checkinData);
      Alert.alert('Great job!', 'Your progress has been saved. Keep it up!');
      loadProgress();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const getMoodEmoji = (level) => {
    const moods = { 1: '😔', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
    return moods[level] || '😐';
  };

  const getAdherenceRate = () => {
    if (history.length === 0) return 0;
    const successful = history.filter(c => c.workedOut || c.followedMeals).length;
    return Math.round((successful / history.length) * 100);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress Tracker</Text>
      <Text style={styles.subtitle}>{new Date().toDateString()}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{streak}</Text>
          <Text style={styles.statLabel}>Day Streak 🔥</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{history.length}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{getAdherenceRate()}%</Text>
          <Text style={styles.statLabel}>Adherence</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Check-in</Text>

        {todayCheckin ? (
          <View style={styles.completedCheckin}>
            <Text style={styles.completedText}>✅ Already checked in today!</Text>
            <Text style={styles.completedDetail}>Worked out: {todayCheckin.workedOut ? 'Yes' : 'No'}</Text>
            <Text style={styles.completedDetail}>Followed meal plan: {todayCheckin.followedMeals ? 'Yes' : 'No'}</Text>
            <Text style={styles.completedDetail}>Mood: {getMoodEmoji(todayCheckin.moodLevel)}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.question}>Did you workout today?</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.optionButton, workedOut === true && styles.optionSelected]}
                onPress={() => setWorkedOut(true)}
              >
                <Text style={styles.optionText}>💪 Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, workedOut === false && styles.optionSelected]}
                onPress={() => setWorkedOut(false)}
              >
                <Text style={styles.optionText}>❌ No</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.question}>Did you follow your meal plan?</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.optionButton, followedMeals === true && styles.optionSelected]}
                onPress={() => setFollowedMeals(true)}
              >
                <Text style={styles.optionText}>🥗 Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, followedMeals === false && styles.optionSelected]}
                onPress={() => setFollowedMeals(false)}
              >
                <Text style={styles.optionText}>❌ No</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.question}>How are you feeling today?</Text>
            <View style={styles.moodRow}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.moodButton, moodLevel === level && styles.moodSelected]}
                  onPress={() => setMoodLevel(level)}
                >
                  <Text style={styles.moodEmoji}>{getMoodEmoji(level)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveCheckin} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <Text style={styles.saveButtonText}>Save Check-in</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {history.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent History</Text>
          {history.slice(0, 7).map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDate}>{item.date}</Text>
              <Text style={styles.historyDetail}>
                {item.workedOut ? '💪' : '❌'} {item.followedMeals ? '🥗' : '❌'} {getMoodEmoji(item.moodLevel)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 60 },
  centered: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888888', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#00ff88' },
  statLabel: { fontSize: 12, color: '#888888', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#333333' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#00ff88', marginBottom: 16 },
  question: { fontSize: 15, color: '#ffffff', marginBottom: 10, marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  optionButton: { flex: 1, backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  optionSelected: { borderColor: '#00ff88', backgroundColor: '#003322' },
  optionText: { color: '#ffffff', fontSize: 15 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  moodButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333333' },
  moodSelected: { borderColor: '#00ff88', backgroundColor: '#003322' },
  moodEmoji: { fontSize: 24 },
  saveButton: { width: '100%', backgroundColor: '#00ff88', borderRadius: 12, padding: 18, alignItems: 'center' },
  saveButtonText: { color: '#0a0a0a', fontSize: 18, fontWeight: 'bold' },
  completedCheckin: { alignItems: 'center', padding: 16 },
  completedText: { fontSize: 18, color: '#00ff88', fontWeight: 'bold', marginBottom: 12 },
  completedDetail: { fontSize: 15, color: '#ffffff', marginBottom: 6 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333333' },
  historyDate: { fontSize: 14, color: '#aaaaaa' },
  historyDetail: { fontSize: 18 },
});