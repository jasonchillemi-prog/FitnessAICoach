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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleResetPlan = async () => {
    Alert.alert(
      'Reset Plan',
      'This will clear your current plan so you can generate a new one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              await setDoc(doc(db, 'users', user.uid), { savedPlan: null }, { merge: true });
              Alert.alert('Done!', 'Your plan has been reset. Go to Dashboard to generate a new one.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
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
      <Text style={styles.title}>My Profile</Text>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {auth.currentUser?.email?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.email}>{auth.currentUser?.email}</Text>
      </View>
      {userData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.weight}</Text>
              <Text style={styles.statLabel}>lbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.height}</Text>
              <Text style={styles.statLabel}>height</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.age}</Text>
              <Text style={styles.statLabel}>years old</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.workoutsPerWeek}</Text>
              <Text style={styles.statLabel}>days/week</Text>
            </View>
          </View>
        </View>
      )}
      {userData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Goals</Text>
          <View style={styles.tagsContainer}>
            {userData.goals && userData.goals.map((goal, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {userData && userData.allergies && userData.allergies[0] !== 'None' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food Allergies</Text>
          <View style={styles.tagsContainer}>
            {userData.allergies.map((allergy, index) => (
              <View key={index} style={[styles.tag, styles.tagRed]}>
                <Text style={styles.tagText}>{allergy}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {userData && userData.workoutTimes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferred Workout Times</Text>
          <View style={styles.tagsContainer}>
            {userData.workoutTimes.map((time, index) => (
              <View key={index} style={[styles.tag, styles.tagBlue]}>
                <Text style={styles.tagText}>{time}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {userData && userData.busyDays && userData.busyDays.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Busy Days</Text>
          <View style={styles.tagsContainer}>
            {userData.busyDays.map((day, index) => (
              <View key={index} style={[styles.tag, styles.tagGray]}>
                <Text style={styles.tagText}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Settings</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>Edit Profile</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleResetPlan}>
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionText}>Reset My Plan</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔔</Text>
          <Text style={styles.actionText}>Notifications</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⭐</Text>
          <Text style={styles.actionText}>Upgrade to Pro</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionText}>Contact Support</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      <Text style={styles.version}>KineticIQ v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 24 },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#003322', borderWidth: 2, borderColor: '#00ff88', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#00ff88' },
  email: { fontSize: 15, color: '#888888' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333333' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#00ff88', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { flex: 1, minWidth: '40%', backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  statLabel: { fontSize: 12, color: '#888888', marginTop: 4 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#003322', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#00ff88' },
  tagRed: { backgroundColor: '#2a0a0a', borderColor: '#ff4444' },
  tagBlue: { backgroundColor: '#0a1a2a', borderColor: '#4488ff' },
  tagGray: { backgroundColor: '#1a1a1a', borderColor: '#555555' },
  tagText: { color: '#ffffff', fontSize: 13, fontWeight: '500' },
  actionsCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333333' },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#333333' },
  actionIcon: { fontSize: 20, marginRight: 14 },
  actionText: { flex: 1, fontSize: 15, color: '#ffffff' },
  actionArrow: { fontSize: 20, color: '#888888' },
  logoutButton: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#ff4444' },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', color: '#555555', fontSize: 12 },
});
