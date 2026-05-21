import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { requestPermissions, getOrCreateCalendar, addMealsToCalendar, addWorkoutsToCalendar } from '../services/calendarService';

function CoachBanner({ message }) {
  const [expanded, setExpanded] = useState(false);
  const preview = message.length > 80 ? message.substring(0, 80) + '...' : message;
  return (
    <TouchableOpacity style={bannerStyles.banner} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <View style={bannerStyles.bannerLeft}>
        <Text style={bannerStyles.bannerIcon}>💬</Text>
        <View style={bannerStyles.bannerText}>
          <Text style={bannerStyles.bannerTitle}>Coach Says</Text>
          <Text style={bannerStyles.bannerMessage}>{expanded ? message : preview}</Text>
        </View>
      </View>
      <Text style={bannerStyles.bannerArrow}>{expanded ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

const bannerStyles = StyleSheet.create({
  banner: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bannerLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  bannerIcon: { fontSize: 20 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#00E5A0', marginBottom: 4 },
  bannerMessage: { fontSize: 13, color: '#8A9BB0', lineHeight: 18 },
  bannerArrow: { color: '#00E5A0', fontSize: 12, marginLeft: 8 },
});
function MealsSection({ meals, todayName, navigation }) {
  const [expanded, setExpanded] = useState(false);
  const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  return (
    <View style={mealSectionStyles.card}>
      <TouchableOpacity style={mealSectionStyles.header} onPress={() => setExpanded(!expanded)}>
        <View style={mealSectionStyles.headerLeft}>
          <Text style={mealSectionStyles.title}>Today's Meals</Text>
          <Text style={mealSectionStyles.icon}>🥗</Text>
        </View>
        <View style={mealSectionStyles.headerRight}>
          <Text style={mealSectionStyles.cals}>{totalCals} kcal</Text>
          <Text style={mealSectionStyles.arrow}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && meals.map((item, index) => (
        <TouchableOpacity key={index} style={mealSectionStyles.mealItem} onPress={() => navigation.navigate('Recipe', { meal: item })}>
          <View style={mealSectionStyles.mealLeft}>
            <Text style={mealSectionStyles.mealName}>{item.meal}</Text>
            <Text style={mealSectionStyles.mealTime}>{item.time}</Text>
            <Text style={mealSectionStyles.mealFood}>{item.food}</Text>
          </View>
          <View style={mealSectionStyles.mealRight}>
            <Text style={mealSectionStyles.mealCal}>{item.calories}</Text>
            <Text style={mealSectionStyles.mealCalUnit}>kcal</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const mealSectionStyles = StyleSheet.create({
  card: { backgroundColor: '#111820', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#F0F4F8' },
  icon: { fontSize: 18 },
  cals: { fontSize: 13, color: '#00E5A0', fontWeight: '600' },
  arrow: { color: '#00E5A0', fontSize: 12 },
  mealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  mealLeft: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#F0F4F8' },
  mealTime: { fontSize: 12, color: '#4A5A6A', marginTop: 2 },
  mealFood: { fontSize: 13, color: '#8A9BB0', marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealCal: { fontSize: 16, fontWeight: '700', color: '#00E5A0' },
  mealCalUnit: { fontSize: 11, color: '#4A5A6A' },
});

function GroceryListSection({ groceryList, groceryChecked, toggleGrocery }) {
  const [expanded, setExpanded] = useState(false);
  const checkedCount = Object.values(groceryChecked).filter(Boolean).length;
  return (
    <View style={groceryStyles.card}>
      <TouchableOpacity style={groceryStyles.header} onPress={() => setExpanded(!expanded)}>
        <View style={groceryStyles.headerLeft}>
          <Text style={groceryStyles.title}>Grocery List</Text>
          <Text style={groceryStyles.icon}>🛒</Text>
        </View>
        <View style={groceryStyles.headerRight}>
          {checkedCount > 0 && (
            <View style={groceryStyles.badge}>
              <Text style={groceryStyles.badgeText}>{checkedCount}/{groceryList.length}</Text>
            </View>
          )}
          <Text style={groceryStyles.arrow}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={groceryStyles.list}>
          {groceryList.map((item, index) => (
            <TouchableOpacity key={index} style={groceryStyles.row} onPress={() => toggleGrocery(index)}>
              <View style={[groceryStyles.checkbox, groceryChecked[index] && groceryStyles.checkboxDone]}>
                {groceryChecked[index] && <Text style={groceryStyles.checkmark}>✓</Text>}
              </View>
              <Text style={[groceryStyles.text, groceryChecked[index] && groceryStyles.textDone]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const groceryStyles = StyleSheet.create({
  card: { backgroundColor: '#111820', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#F0F4F8' },
  icon: { fontSize: 18 },
  badge: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  badgeText: { color: '#00E5A0', fontSize: 12, fontWeight: '600' },
  arrow: { color: '#00E5A0', fontSize: 12 },
  list: { paddingHorizontal: 18, paddingBottom: 18, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#00E5A0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone: { backgroundColor: '#00E5A0' },
  checkmark: { color: '#040A07', fontSize: 13, fontWeight: 'bold' },
  text: { fontSize: 14, color: '#8A9BB0', flex: 1 },
  textDone: { textDecorationLine: 'line-through', color: '#4A5A6A' },
});
export default function DashboardScreen({ navigation, route }) {
  const [userData, setUserData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [groceryChecked, setGroceryChecked] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  useEffect(() => {
    if (route?.params?.planGenerated) {
      loadUserData();
    }
  }, [route?.params?.planGenerated]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Has savedPlan:', !!data.savedPlan);
        setUserData(data);
        setPlan(data.savedPlan || null);
        if (data.groceryChecked) setGroceryChecked(data.groceryChecked);
        if (data.completedWorkouts) {
          const weekKey = getWeekKey();
          setCompletedWorkouts(data.completedWorkouts[weekKey] || {});
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getWeekKey = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = () => {
    const email = auth.currentUser?.email || '';
    const name = email.split('@')[0].split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const toggleWorkout = async (index) => {
    const newCompleted = { ...completedWorkouts, [index]: !completedWorkouts[index] };
    setCompletedWorkouts(newCompleted);
    try {
      const user = auth.currentUser;
      const weekKey = getWeekKey();
      await setDoc(doc(db, 'users', user.uid), { completedWorkouts: { [weekKey]: newCompleted } }, { merge: true });
    } catch (error) {
      console.log('Error saving workout:', error);
    }
  };

  const toggleGrocery = async (index) => {
    const newChecked = { ...groceryChecked, [index]: !groceryChecked[index] };
    setGroceryChecked(newChecked);
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { groceryChecked: newChecked }, { merge: true });
    } catch (error) {
      console.log('Error saving grocery:', error);
    }
  };

  const getWorkoutsCompleted = () => Object.values(completedWorkouts).filter(Boolean).length;

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const getTodaysMeals = () => {
    if (!plan) return [];
    const dayMap = {
      'Monday': plan.mondayMeals,
      'Tuesday': plan.tuesdayMeals,
      'Wednesday': plan.wednesdayMeals,
      'Thursday': plan.thursdayMeals,
      'Friday': plan.fridayMeals,
      'Saturday': plan.saturdayMeals,
      'Sunday': plan.sundayMeals,
    };
    return dayMap[todayName] || plan.mondayMeals || plan.dailyMeals || [];
  };

  const analyzeAndAdaptPlan = async () => {
    if (!plan) return;
    const completed = getWorkoutsCompleted();
    const total = plan.weeklyWorkouts.length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    let adaptMessage = '';
    let intensity = '';
    if (rate >= 80) { adaptMessage = `Amazing! You completed ${completed}/${total} workouts (${Math.round(rate)}%). Your plan will be upgraded!`; intensity = 'increase'; }
    else if (rate < 50) { adaptMessage = `You completed ${completed}/${total} workouts (${Math.round(rate)}%). Your plan will be adjusted to be more manageable!`; intensity = 'decrease'; }
    else { adaptMessage = `Good effort! You completed ${completed}/${total} workouts (${Math.round(rate)}%). Keep it up!`; intensity = 'maintain'; }
    Alert.alert('Weekly Analysis', adaptMessage, [
      { text: 'Keep Current Plan', style: 'cancel' },
      {
        text: intensity === 'maintain' ? 'OK' : 'Adapt My Plan',
        onPress: async () => {
          if (intensity === 'maintain') return;
          setGeneratingPlan(true);
          try {
            const busyDays = userData.busyDays && userData.busyDays.length > 0 ? userData.busyDays.join(', ') : 'None';
            const intensityPrompt = intensity === 'increase' ? 'INCREASE workout intensity.' : 'DECREASE workout intensity.';
            const generatePlanFn = httpsCallable(functions, 'generatePlan');
            const result = await generatePlanFn({ userData: { ...userData, busyDays: userData.busyDays }, busyDays });
            const parsed = result.data;
            setPlan(parsed);
            setCompletedWorkouts({});
            setGroceryChecked({});
            const user = auth.currentUser;
            await setDoc(doc(db, 'users', user.uid), { savedPlan: parsed }, { merge: true });
            Alert.alert('Plan Updated!', 'Your plan has been adapted.');
          } catch (error) {
            Alert.alert('Error', error.message);
          } finally {
            setGeneratingPlan(false);
          }
        }
      }
    ]);
  };

  const generatePlan = async () => {
    setGeneratingPlan(true);
    try {
      const busyDays = userData.busyDays && userData.busyDays.length > 0 ? userData.busyDays.join(', ') : 'None';
      const age = userData.birthday ? (() => {
        const p = userData.birthday.split('/');
        const bm = parseInt(p[0]); const bd = parseInt(p[1]); const by = parseInt(p[2]);
        const t = new Date(); let a = t.getFullYear() - by;
        if (t.getMonth()+1 < bm || (t.getMonth()+1 === bm && t.getDate() < bd)) a--;
        return a;
      })() : userData.age;

      const generatePlanFn = httpsCallable(functions, 'generatePlan');
      const result = await generatePlanFn({ userData, busyDays });
      const parsed = result.data;
      setPlan(parsed);
      setCompletedWorkouts({});
      setGroceryChecked({});
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { savedPlan: parsed }, { merge: true });
    } catch (error) {
      console.log('Generate plan error:', error.code, error.message);
      Alert.alert('Error generating plan', error.message);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const addToCalendar = async () => {
    try {
      const permissions = await requestPermissions();
      if (!permissions.calendar) { Alert.alert('Permission Required', 'Please allow calendar access.'); return; }
      const calendarId = await getOrCreateCalendar();
      await addMealsToCalendar(getTodaysMeals(), calendarId);
      await addWorkoutsToCalendar(plan.weeklyWorkouts, calendarId, userData.workoutTimes || []);
      Alert.alert('Success!', 'Your meals and workouts have been added to your calendar!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5A0" />
      </View>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, <Text style={styles.greetingName}>{getFirstName()}</Text></Text>
        </View>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {userData && plan && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>WEIGHT</Text>
            <Text style={styles.statValue}>{userData.weight}<Text style={styles.statUnit}> lbs</Text></Text>
            <Text style={styles.statChange}>Current</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>WORKOUTS</Text>
            <Text style={styles.statValue}>{getWorkoutsCompleted()}<Text style={styles.statUnit}>/{plan.weeklyWorkouts.length}</Text></Text>
            <Text style={styles.statChangeGood}>This week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CALORIES</Text>
            <Text style={styles.statValue}>{plan.dailyCalories}<Text style={styles.statUnit}> kcal</Text></Text>
            <Text style={styles.statChange}>Daily target</Text>
          </View>
        </View>
      )}

      {!plan && (
        <TouchableOpacity style={styles.generateButton} onPress={generatePlan} disabled={generatingPlan}>
          {generatingPlan ? (
            <View style={styles.generatingContainer}>
              <ActivityIndicator color="#040A07" />
              <Text style={styles.generatingText}>Building your plan...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>Generate My AI Plan 🤖</Text>
          )}
        </TouchableOpacity>
      )}

      {plan && (
        <>
          <CoachBanner message={plan.coachMessage} />

          <View style={styles.card}>
            <View style={styles.workoutHeader}>
              <Text style={styles.cardTitle}>Weekly Workouts</Text>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>{getWorkoutsCompleted()}/{plan.weeklyWorkouts.length} done</Text>
              </View>
            </View>
            {plan.weeklyWorkouts.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.workoutItem, completedWorkouts[index] && styles.workoutItemDone]} onPress={() => navigation.navigate('WorkoutDetail', { workout: item })}>
                <TouchableOpacity style={[styles.workoutNum, completedWorkouts[index] && styles.workoutNumDone]} onPress={() => toggleWorkout(index)}>
                  <Text style={[styles.workoutNumText, completedWorkouts[index] && styles.workoutNumTextDone]}>
                    {completedWorkouts[index] ? '✓' : index + 1}
                  </Text>
                </TouchableOpacity>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutDay, completedWorkouts[index] && styles.textFaded]}>{item.day}</Text>
                  <Text style={[styles.workoutDetail, completedWorkouts[index] && styles.textFaded]}>{item.workout}</Text>
                  <Text style={styles.workoutDuration}>⏱ {item.duration}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <MealsSection meals={getTodaysMeals()} todayName={todayName} navigation={navigation} />

          <GroceryListSection groceryList={plan.groceryList} groceryChecked={groceryChecked} toggleGrocery={toggleGrocery} />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButtonOrange} onPress={analyzeAndAdaptPlan}>
              <Text style={styles.actionButtonText}>📊 Analyze Week</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButtonBlue} onPress={addToCalendar}>
              <Text style={styles.actionButtonText}>📅 Add to Calendar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.regenerateButton} onPress={() => { setPlan(null); generatePlan(); }}>
            <Text style={styles.regenerateText}>Regenerate Plan</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F0F4F8', marginBottom: 4 },
  greetingName: { color: '#00E5A0' },
  dateText: { fontSize: 12, color: '#4A5A6A', textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#111820', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#F0F4F8', letterSpacing: -0.5 },
  statUnit: { fontSize: 11, color: '#8A9BB0', fontWeight: '400' },
  statChange: { fontSize: 11, color: '#8A9BB0', marginTop: 4 },
  statChangeGood: { fontSize: 11, color: '#00E5A0', marginTop: 4 },
  generateButton: { backgroundColor: '#00E5A0', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 20 },
  generateButtonText: { color: '#040A07', fontSize: 17, fontWeight: '700' },
  generatingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generatingText: { color: '#040A07', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F0F4F8', letterSpacing: 0.3 },
  cardIcon: { fontSize: 18 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressPill: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  progressPillText: { color: '#00E5A0', fontSize: 12, fontWeight: '600' },
  workoutItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 },
  workoutItemDone: { opacity: 0.5 },
  workoutNum: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  workoutNumDone: { backgroundColor: '#00E5A0', borderColor: '#00E5A0' },
  workoutNumText: { fontSize: 13, fontWeight: '700', color: '#00E5A0' },
  workoutNumTextDone: { color: '#040A07' },
  workoutInfo: { flex: 1 },
  workoutDay: { fontSize: 14, fontWeight: '600', color: '#F0F4F8', marginBottom: 2 },
  workoutDetail: { fontSize: 13, color: '#8A9BB0', marginBottom: 4, lineHeight: 18 },
  workoutDuration: { fontSize: 12, color: '#4A5A6A' },
  textFaded: { color: '#4A5A6A', textDecorationLine: 'line-through' },
  mealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  mealLeft: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#F0F4F8' },
  mealTime: { fontSize: 12, color: '#4A5A6A', marginTop: 2 },
  mealFood: { fontSize: 13, color: '#8A9BB0', marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealCal: { fontSize: 16, fontWeight: '700', color: '#00E5A0' },
  mealCalUnit: { fontSize: 11, color: '#4A5A6A' },
  groceryListContainer: { gap: 8 },
  groceryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  groceryCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#00E5A0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groceryCheckboxDone: { backgroundColor: '#00E5A0' },
  groceryCheckmark: { color: '#040A07', fontSize: 13, fontWeight: 'bold' },
  groceryText: { fontSize: 14, color: '#8A9BB0', flex: 1 },
  groceryTextDone: { textDecorationLine: 'line-through', color: '#4A5A6A' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionButtonOrange: { flex: 1, backgroundColor: '#1A2330', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FFB547' },
  actionButtonBlue: { flex: 1, backgroundColor: '#1A2330', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#4D9FFF' },
  actionButtonText: { color: '#F0F4F8', fontSize: 13, fontWeight: '600' },
  regenerateButton: { backgroundColor: '#111820', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  regenerateText: { color: '#00E5A0', fontSize: 15, fontWeight: '600' },
});
