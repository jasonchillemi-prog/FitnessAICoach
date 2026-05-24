import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';

function HistorySection({ history, getMoodEmoji }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.historyHeaderRow} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.cardTitle}>Recent History</Text>
        <Text style={styles.collapseArrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && history.slice(0, 7).map((item, index) => (
        <View key={index} style={styles.historyItem}>
          <View style={styles.historyLeft}>
            <Text style={styles.historyDate}>{item.date}</Text>
            <Text style={styles.historyMood}>{getMoodEmoji(item.moodLevel)}</Text>
          </View>
          <View style={styles.historyRight}>
            <View style={[styles.historyBadge, item.workedOut ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.historyBadgeText}>{item.workedOut ? '💪 Workout' : '❌ Rest'}</Text>
            </View>
            <View style={[styles.historyBadge, item.followedMeals ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.historyBadgeText}>{item.followedMeals ? '🥗 On track' : '❌ Off plan'}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function ProgressScreenInner() {
  const [loading, setLoading] = useState(true);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [workedOut, setWorkedOut] = useState(null);
  const [followedMeals, setFollowedMeals] = useState(null);
  const [moodLevel, setMoodLevel] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

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
      } else {
        setTodayCheckin(null);
        setWorkedOut(null);
        setFollowedMeals(null);
        setMoodLevel(null);
      }
      const checkinsRef = collection(db, 'checkins');
      const q = query(checkinsRef);
      const querySnap = await getDocs(q);
      const allCheckins = [];
      querySnap.forEach(doc => {
        if (doc.id.startsWith(user.uid)) {
          allCheckins.push(doc.data());
        }
      });
      allCheckins.sort((a, b) => new Date(b.date) - new Date(a.date));
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
      if (sorted[i].workedOut || sorted[i].followedMeals) count++;
      else break;
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
      Alert.alert('Great job! 🎉', 'Your progress has been saved. Keep it up!');
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
        <ActivityIndicator size="large" color="#00E5A0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>DAY STREAK</Text>
          <Text style={styles.statEmoji}>🔥</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{history.length}</Text>
          <Text style={styles.statLabel}>TOTAL DAYS</Text>
          <Text style={styles.statEmoji}>📅</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{getAdherenceRate()}%</Text>
          <Text style={styles.statLabel}>ADHERENCE</Text>
          <Text style={styles.statEmoji}>🎯</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Check-in</Text>
        {todayCheckin ? (
          <View style={styles.completedContainer}>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ Checked in today!</Text>
            </View>
            <View style={styles.completedDetails}>
              <View style={styles.completedRow}>
                <Text style={styles.completedLabel}>Worked out</Text>
                <Text style={styles.completedValue}>{todayCheckin.workedOut ? '💪 Yes' : '❌ No'}</Text>
              </View>
              <View style={styles.completedRow}>
                <Text style={styles.completedLabel}>Followed meal plan</Text>
                <Text style={styles.completedValue}>{todayCheckin.followedMeals ? '🥗 Yes' : '❌ No'}</Text>
              </View>
              <View style={styles.completedRow}>
                <Text style={styles.completedLabel}>Mood</Text>
                <Text style={styles.completedValue}>{getMoodEmoji(todayCheckin.moodLevel)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.question}>Did you workout today?</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity style={[styles.optionButton, workedOut === true && styles.optionSelected]} onPress={() => setWorkedOut(true)}>
                <Text style={styles.optionEmoji}>💪</Text>
                <Text style={[styles.optionText, workedOut === true && styles.optionTextSelected]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, workedOut === false && styles.optionSelectedRed]} onPress={() => setWorkedOut(false)}>
                <Text style={styles.optionEmoji}>❌</Text>
                <Text style={[styles.optionText, workedOut === false && styles.optionTextSelected]}>No</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.question}>Did you follow your meal plan?</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity style={[styles.optionButton, followedMeals === true && styles.optionSelected]} onPress={() => setFollowedMeals(true)}>
                <Text style={styles.optionEmoji}>🥗</Text>
                <Text style={[styles.optionText, followedMeals === true && styles.optionTextSelected]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, followedMeals === false && styles.optionSelectedRed]} onPress={() => setFollowedMeals(false)}>
                <Text style={styles.optionEmoji}>❌</Text>
                <Text style={[styles.optionText, followedMeals === false && styles.optionTextSelected]}>No</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.question}>How are you feeling today?</Text>
            <View style={styles.moodRow}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity key={level} style={[styles.moodButton, moodLevel === level && styles.moodSelected]} onPress={() => setMoodLevel(level)}>
                  <Text style={styles.moodEmoji}>{getMoodEmoji(level)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveCheckin} disabled={saving}>
              {saving ? <ActivityIndicator color="#040A07" /> : <Text style={styles.saveButtonText}>Save Check-in</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {history.length > 0 && (
        <HistorySection history={history} getMoodEmoji={getMoodEmoji} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#8A9BB0', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#111820', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginTop: 4 },
  statEmoji: { fontSize: 16, marginTop: 6 },
  card: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#F0F4F8', marginBottom: 16, letterSpacing: 0.3 },
  completedContainer: { alignItems: 'center' },
  completedBadge: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', marginBottom: 16 },
  completedBadgeText: { color: '#00E5A0', fontWeight: '700', fontSize: 14 },
  completedDetails: { width: '100%', gap: 10 },
  completedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  completedLabel: { fontSize: 14, color: '#8A9BB0' },
  completedValue: { fontSize: 14, color: '#F0F4F8', fontWeight: '600' },
  question: { fontSize: 14, color: '#F0F4F8', marginBottom: 10, marginTop: 8, fontWeight: '500' },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  optionButton: { flex: 1, backgroundColor: '#1A2330', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  optionSelected: { borderColor: '#00E5A0', backgroundColor: 'rgba(0,229,160,0.08)' },
  optionSelectedRed: { borderColor: '#FF4D6A', backgroundColor: 'rgba(255,77,106,0.08)' },
  optionEmoji: { fontSize: 18 },
  optionText: { color: '#8A9BB0', fontSize: 15, fontWeight: '600' },
  optionTextSelected: { color: '#F0F4F8' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  moodButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1A2330', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  moodSelected: { borderColor: '#00E5A0', backgroundColor: 'rgba(0,229,160,0.12)' },
  moodEmoji: { fontSize: 26 },
  saveButton: { width: '100%', backgroundColor: '#00E5A0', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#040A07', fontSize: 16, fontWeight: '700' },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  collapseArrow: { color: '#00E5A0', fontSize: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDate: { fontSize: 13, color: '#8A9BB0' },
  historyMood: { fontSize: 16 },
  historyRight: { flexDirection: 'row', gap: 6 },
  historyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeGreen: { backgroundColor: 'rgba(0,229,160,0.12)' },
  badgeRed: { backgroundColor: 'rgba(255,77,106,0.08)' },
  historyBadgeText: { fontSize: 11, color: '#F0F4F8', fontWeight: '500' },
});

export default function ProgressScreen() {
  return (
    <ErrorBoundary screenName="ProgressScreen">
      <ProgressScreenInner />
    </ErrorBoundary>
  );
}
