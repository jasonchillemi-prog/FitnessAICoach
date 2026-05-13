import React, { useState, useEffect } from 'react';
import { Keyboard,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function EditProfileScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [age, setAge] = useState('');
  const [smoker, setSmoker] = useState(null);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState('');
  const [goals, setGoals] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [otherAllergy, setOtherAllergy] = useState('');
  const [workoutTimes, setWorkoutTimes] = useState([]);
  const [busyDays, setBusyDays] = useState([]);

  const goalOptions = [
    'Lose Weight', 'Build Muscle', 'Get Fit', 'Eat Healthier',
    'Increase Endurance', 'Reduce Stress', 'Improve Flexibility', 'Gain Strength'
  ];

  const allergyOptions = [
    'Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'None'
  ];

  const timeOptions = [
    'Early Morning (5-7 AM)', 'Morning (7-9 AM)', 'Midday (11 AM-1 PM)',
    'Afternoon (3-5 PM)', 'Evening (6-8 PM)', 'Late Night (8-10 PM)'
  ];

  const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWeight(data.weight || '');
        setAge(data.age || '');
        setWorkoutsPerWeek(data.workoutsPerWeek || '');
        setSmoker(data.smoker || false);
        setGoals(data.goals || []);
        setAllergies(data.allergies || []);
        setOtherAllergy(data.otherAllergy || '');
        setWorkoutTimes(data.workoutTimes || []);
        setBusyDays(data.busyDays || []);
        if (data.height) {
          const parts = data.height.split('ft ');
          if (parts.length === 2) {
            setHeightFeet(parts[0]);
            setHeightInches(parts[1].replace('in', ''));
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = (goal) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const toggleAllergy = (allergy) => {
    if (allergy === 'None') {
      setAllergies(['None']);
      return;
    }
    const filtered = allergies.filter(a => a !== 'None');
    if (filtered.includes(allergy)) {
      setAllergies(filtered.filter(a => a !== allergy));
    } else {
      setAllergies([...filtered, allergy]);
    }
  };

  const toggleWorkoutTime = (time) => {
    if (workoutTimes.includes(time)) {
      setWorkoutTimes(workoutTimes.filter(t => t !== time));
    } else {
      setWorkoutTimes([...workoutTimes, time]);
    }
  };

  const toggleBusyDay = (day) => {
    if (busyDays.includes(day)) {
      setBusyDays(busyDays.filter(d => d !== day));
    } else {
      setBusyDays([...busyDays, day]);
    }
  };

  const handleSave = async () => {
    if (!weight || !heightFeet || !heightInches || !age || smoker === null || !workoutsPerWeek || goals.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), {
        weight,
        height: `${heightFeet}ft ${heightInches}in`,
        age,
        smoker,
        workoutsPerWeek,
        goals,
        allergies: allergies.length > 0 ? allergies : ['None'],
        otherAllergy,
        workoutTimes,
        busyDays,
      }, { merge: true });
      Alert.alert('Saved!', 'Your profile has been updated. Regenerate your plan to get updated recommendations.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <Text style={styles.label}>Weight (lbs)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 185"
        placeholderTextColor="#888888"
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Height</Text>
      <View style={styles.row}>
        <View style={styles.halfInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Feet (e.g. 5)"
            placeholderTextColor="#888888"
            value={heightFeet}
            onChangeText={setHeightFeet}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Inches (e.g. 8)"
            placeholderTextColor="#888888"
            value={heightInches}
            onChangeText={setHeightInches}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 35"
        placeholderTextColor="#888888"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />

      <Text style={styles.label}>How many days per week do you workout?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 3"
        placeholderTextColor="#888888"
        value={workoutsPerWeek}
        onChangeText={setWorkoutsPerWeek}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Do you smoke?</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.optionButton, smoker === true && styles.optionSelected]}
          onPress={() => setSmoker(true)}
        >
          <Text style={styles.optionText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, smoker === false && styles.optionSelected]}
          onPress={() => setSmoker(false)}
        >
          <Text style={styles.optionText}>No</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Preferred workout times (Select all that apply)</Text>
      <View style={styles.goalContainer}>
        {timeOptions.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.goalButton, workoutTimes.includes(item) && styles.optionSelected]}
            onPress={() => toggleWorkoutTime(item)}
          >
            <Text style={styles.optionText}>
              {workoutTimes.includes(item) ? '✓ ' : ''}{item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Food Allergies (Select all that apply)</Text>
      <View style={styles.goalContainer}>
        {allergyOptions.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.goalButton, allergies.includes(item) && styles.optionSelected]}
            onPress={() => toggleAllergy(item)}
          >
            <Text style={styles.optionText}>
              {allergies.includes(item) ? '✓ ' : ''}{item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Any other allergies or dietary restrictions?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Lactose intolerant, Vegan..."
        placeholderTextColor="#888888"
        value={otherAllergy}
        onChangeText={setOtherAllergy}
      />

      <Text style={styles.label}>What are your goals? (Select all that apply)</Text>
      <View style={styles.goalContainer}>
        {goalOptions.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.goalButton, goals.includes(item) && styles.optionSelected]}
            onPress={() => toggleGoal(item)}
          >
            <Text style={styles.optionText}>
              {goals.includes(item) ? '✓ ' : ''}{item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {goals.length > 0 && (
        <View style={styles.selectedGoals}>
          <Text style={styles.selectedGoalsText}>
            Selected: {goals.join(', ')}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Select your busy days</Text>
      <View style={styles.daysRow}>
        {dayOptions.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayButton, busyDays.includes(day) && styles.optionSelected]}
            onPress={() => toggleBusyDay(day)}
          >
            <Text style={styles.dayText}>{day}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 24 },
  backButton: { color: '#00ff88', fontSize: 16, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  label: { fontSize: 14, color: '#aaaaaa', marginBottom: 8, marginTop: 12 },
  input: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, color: '#ffffff', fontSize: 16, borderWidth: 1, borderColor: '#333333' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  halfInputContainer: { flex: 1 },
  optionButton: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  optionSelected: { borderColor: '#00ff88', backgroundColor: '#003322' },
  optionText: { color: '#ffffff', fontSize: 14, textAlign: 'center' },
  goalContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  goalButton: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333333', width: '47%' },
  selectedGoals: { backgroundColor: '#003322', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#00ff88' },
  selectedGoalsText: { color: '#00ff88', fontSize: 14 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dayButton: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333333', width: 44 },
  dayText: { color: '#ffffff', fontSize: 12 },
  saveButton: { width: '100%', backgroundColor: '#00ff88', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 40 },
  saveButtonText: { color: '#0a0a0a', fontSize: 18, fontWeight: 'bold' },
});