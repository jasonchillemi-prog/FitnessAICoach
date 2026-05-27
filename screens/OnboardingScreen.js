import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { db, auth, functions, httpsCallable } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';

const TOTAL_STEPS = 9;

function OnboardingScreenInner({ navigation }) {
  const [step, setStep] = useState(1);
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState('');
  const [smoker, setSmoker] = useState(null);
  const [goals, setGoals] = useState([]);
  const [goalDescription, setGoalDescription] = useState('');
  const [analyzedGoals, setAnalyzedGoals] = useState(null);
  const [analyzingGoals, setAnalyzingGoals] = useState(false);
  const [workoutTimes, setWorkoutTimes] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [otherAllergy, setOtherAllergy] = useState('');
  const [busyDays, setBusyDays] = useState([]);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  const goalOptions = [
    { label: 'Lose Weight', icon: '🔥' },
    { label: 'Build Muscle', icon: '💪' },
    { label: 'Get Fit', icon: '🏃' },
    { label: 'Eat Healthier', icon: '🥗' },
    { label: 'Increase Endurance', icon: '⚡' },
    { label: 'Reduce Stress', icon: '🧘' },
    { label: 'Improve Flexibility', icon: '🤸' },
    { label: 'Gain Strength', icon: '🏋️' },
  ];

  const timeOptions = [
    { label: 'Early Morning', sub: '5-7 AM', icon: '🌅' },
    { label: 'Morning', sub: '7-9 AM', icon: '☀️' },
    { label: 'Midday', sub: '11 AM-1 PM', icon: '🌤' },
    { label: 'Afternoon', sub: '3-5 PM', icon: '🌇' },
    { label: 'Evening', sub: '6-8 PM', icon: '🌆' },
    { label: 'Late Night', sub: '8-10 PM', icon: '🌙' },
  ];

  const allergyOptions = ['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'None'];
  const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const workoutOptions = [
    { value: '0', label: "I don't workout" },
    { value: '1', label: '1 day' },
    { value: '2', label: '2 days' },
    { value: '3', label: '3 days' },
    { value: '4', label: '4 days' },
    { value: '5', label: '5 days' },
    { value: '6', label: '6 days' },
    { value: '7', label: '7 days' },
  ];

  const toggleItem = (item, list, setList) => {
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  const toggleAllergy = (allergy) => {
    if (allergy === 'None') { setAllergies(['None']); return; }
    const filtered = allergies.filter(a => a !== 'None');
    if (filtered.includes(allergy)) setAllergies(filtered.filter(a => a !== allergy));
    else setAllergies([...filtered, allergy]);
  };

  const analyzeGoals = async () => {
    if (!goalDescription.trim()) return;
    setAnalyzingGoals(true);
    try {
      const analyzeGoalsFn = httpsCallable(functions, 'analyzeGoals');
      const result = await analyzeGoalsFn({ goalDescription });
      setAnalyzedGoals(result.data);
    } catch (error) {
      Alert.alert('Error', 'Could not analyze goals. Please try again.');
    } finally {
      setAnalyzingGoals(false);
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!weight || !heightFeet || !heightInches || !age) { Alert.alert('Please fill in all fields'); return false; }
        return true;
      case 2:
        if (!workoutsPerWeek) { Alert.alert('Please select how many days you workout'); return false; }
        return true;
      case 3:
        if (smoker === null) { Alert.alert('Please answer this question'); return false; }
        return true;
      case 4:
        if (goals.length === 0) { Alert.alert('Please select at least one goal'); return false; }
        return true;
      case 6:
        if (workoutTimes.length === 0) { Alert.alert('Please select at least one workout time'); return false; }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    Keyboard.dismiss();
    if (!validateStep()) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      const userData = {
        weight, height: `${heightFeet}ft ${heightInches}in`, age, smoker, workoutsPerWeek,
        goals, goalDescription, analyzedGoals,
        allergies: allergies.length > 0 ? allergies : ['None'],
        otherAllergy, workoutTimes, busyDays,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid), userData);

      const generatePlanFn = httpsCallable(functions, 'generatePlan');
      const result = await generatePlanFn({ userData, busyDays: busyDays.join(', ') });
      await setDoc(doc(db, 'users', user.uid), { savedPlan: result.data }, { merge: true });
      navigation.navigate('Main', { planGenerated: true });
    } catch (error) {
      Alert.alert('Error saving data', error.message);
      setSaving(false);
    }
  };

  const renderProgressDots = () => (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[styles.progressDot, i < step && styles.progressDotActive]} />
      ))}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 1 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>Let's start with the basics</Text>
            <Text style={styles.stepSub}>Tell us about yourself so we can build your perfect plan</Text>
            <Text style={styles.label}>WEIGHT (LBS)</Text>
            <TextInput style={styles.input} placeholder="e.g. 185" placeholderTextColor="#4A5A6A" value={weight} onChangeText={setWeight} keyboardType="numeric" />
            <Text style={styles.label}>HEIGHT</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Feet" placeholderTextColor="#4A5A6A" value={heightFeet} onChangeText={setHeightFeet} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Inches" placeholderTextColor="#4A5A6A" value={heightInches} onChangeText={setHeightInches} keyboardType="numeric" />
            </View>
            <Text style={styles.label}>DATE OF BIRTH</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#4A5A6A"
              value={birthday}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '');
                let formatted = cleaned;
                if (cleaned.length >= 3 && cleaned.length <= 4) {
                  formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                } else if (cleaned.length >= 5) {
                  formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
                }
                setBirthday(formatted);
                const parts = formatted.split('/');
                if (parts.length === 3 && parts[2].length === 4) {
                  const birthMonth = parseInt(parts[0]);
                  const birthDay = parseInt(parts[1]);
                  const birthYear = parseInt(parts[2]);
                  const today = new Date();
                  let calculatedAge = today.getFullYear() - birthYear;
                  if (today.getMonth() + 1 < birthMonth ||
                    (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) {
                    calculatedAge--;
                  }
                  setAge(String(calculatedAge));
                }
              }}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            {age ? <Text style={styles.calculatedAge}>Age: {age} years old</Text> : null}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 2 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>How active are you right now?</Text>
            <Text style={styles.stepSub}>How many days per week do you currently workout?</Text>
            <View style={styles.workoutGrid}>
              {workoutOptions.map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.workoutOption, workoutsPerWeek === opt.value && styles.optionActive]} onPress={() => setWorkoutsPerWeek(opt.value)}>
                  <Text style={[styles.workoutOptionValue, workoutsPerWeek === opt.value && styles.optionActiveText]}>{opt.value === '0' ? '🛋️' : opt.value}</Text>
                  <Text style={[styles.workoutOptionLabel, workoutsPerWeek === opt.value && styles.optionActiveText]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 3 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>Do you smoke or Vape?</Text>
            <Text style={styles.stepSub}>This helps us calibrate your cardio capacity and recovery time</Text>
            <View style={styles.smokerGrid}>
              {[
                { label: 'Yes', icon: '🚬', value: 'yes' },
                { label: 'No', icon: '🚭', value: 'no' },
              ].map(opt => (
                <TouchableOpacity key={opt.value} style={[styles.smokerOption, smoker === opt.value && styles.optionActive]} onPress={() => setSmoker(opt.value)}>
                  <Text style={styles.smokerIcon}>{opt.icon}</Text>
                  <View>
                    <Text style={[styles.smokerLabel, smoker === opt.value && styles.optionActiveText]}>{opt.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 4 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>What are your goals?</Text>
            <Text style={styles.stepSub}>Select all that apply — we'll build your plan around these</Text>
            <View style={styles.goalGrid}>
              {goalOptions.map(opt => (
                <TouchableOpacity key={opt.label} style={[styles.goalOption, goals.includes(opt.label) && styles.optionActive]} onPress={() => toggleItem(opt.label, goals, setGoals)}>
                  <Text style={styles.goalIcon}>{opt.icon}</Text>
                  <Text style={[styles.goalLabel, goals.includes(opt.label) && styles.optionActiveText]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 5 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>Describe your goals in your own words</Text>
            <Text style={styles.stepSub}>Tell us what you want to accomplish — our AI will analyze it and set your targets</Text>
            <View style={styles.examplePrompts}>
              <Text style={styles.exampleTitle}>TAP AN EXAMPLE TO GET STARTED:</Text>
              <TouchableOpacity style={styles.examplePrompt} onPress={() => { setGoalDescription("I want to lose 30 pounds in 6 months and have enough energy to play with my kids without getting tired"); setAnalyzedGoals(null); }}>
                <Text style={styles.examplePromptText}>"I want to lose 30 pounds in 6 months and have enough energy to play with my kids"</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.examplePrompt} onPress={() => { setGoalDescription("I want to build muscle and get to 180 pounds while dropping my body fat. I want to be strong enough to bench press 225 by summer"); setAnalyzedGoals(null); }}>
                <Text style={styles.examplePromptText}>"I want to build muscle, get to 180 lbs and bench press 225 by summer"</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.goalInput}
              placeholder="Type your goals here in your own words..."
              placeholderTextColor="#4A5A6A"
              value={goalDescription}
              onChangeText={(text) => { setGoalDescription(text); setAnalyzedGoals(null); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
            />
            {analyzingGoals && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator color="#00E5A0" />
                <Text style={styles.analyzingText}>AI is analyzing your goals...</Text>
              </View>
            )}
            {analyzedGoals && !analyzingGoals && (
              <View style={styles.analyzedContainer}>
                <Text style={styles.analyzedTitle}>🤖 AI understood your goals:</Text>
                {analyzedGoals.targetWeight && <View style={styles.analyzedItem}><Text style={styles.analyzedIcon}>⚖️</Text><Text style={styles.analyzedText}>Target weight: {analyzedGoals.targetWeight}</Text></View>}
                {analyzedGoals.timeline && <View style={styles.analyzedItem}><Text style={styles.analyzedIcon}>📅</Text><Text style={styles.analyzedText}>Timeline: {analyzedGoals.timeline}</Text></View>}
                {analyzedGoals.energyGoal && <View style={styles.analyzedItem}><Text style={styles.analyzedIcon}>⚡</Text><Text style={styles.analyzedText}>Energy: {analyzedGoals.energyGoal}</Text></View>}
                {analyzedGoals.strengthGoal && <View style={styles.analyzedItem}><Text style={styles.analyzedIcon}>💪</Text><Text style={styles.analyzedText}>Strength: {analyzedGoals.strengthGoal}</Text></View>}
                {analyzedGoals.otherGoals && <View style={styles.analyzedItem}><Text style={styles.analyzedIcon}>🎯</Text><Text style={styles.analyzedText}>{analyzedGoals.otherGoals}</Text></View>}
                <TouchableOpacity onPress={() => { setAnalyzedGoals(null); setGoalDescription(''); }} style={styles.rewriteButton}>
                  <Text style={styles.rewriteButtonText}>Rewrite my goals</Text>
                </TouchableOpacity>
              </View>
            )}
            {!analyzedGoals && !analyzingGoals && goalDescription.length > 20 && (
              <TouchableOpacity style={styles.analyzeButton} onPress={analyzeGoals}>
                <Text style={styles.analyzeButtonText}>🤖 Analyze My Goals</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 6 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>When do you prefer to workout?</Text>
            <Text style={styles.stepSub}>Select all times that work for you</Text>
            <View style={styles.timeGrid}>
              {timeOptions.map(opt => (
                <TouchableOpacity key={opt.label} style={[styles.timeOption, workoutTimes.includes(opt.label) && styles.optionActive]} onPress={() => toggleItem(opt.label, workoutTimes, setWorkoutTimes)}>
                  <Text style={styles.timeIcon}>{opt.icon}</Text>
                  <Text style={[styles.timeLabel, workoutTimes.includes(opt.label) && styles.optionActiveText]}>{opt.label}</Text>
                  <Text style={styles.timeSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 7:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 7 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>Any Food Allergies or foods you won't eat?</Text>
            <Text style={styles.stepSub}>We'll make sure your meal plan is safe and enjoyable for you</Text>

            <Text style={styles.label}>COMMON ALLERGIES</Text>
            <View style={styles.allergyGrid}>
              {allergyOptions.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.allergyOption, allergies.includes(opt) && styles.optionActive]}
                  onPress={() => toggleAllergy(opt)}
                >
                  <Text style={[styles.allergyLabel, allergies.includes(opt) && styles.optionActiveText]}>
                    {allergies.includes(opt) ? '✓ ' : ''}{opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {allergies.length > 0 && !allergies.includes('None') && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedInfoText}>Selected: {allergies.join(', ')}</Text>
              </View>
            )}

            <Text style={styles.label}>OTHER ALLERGIES OR DIETARY RESTRICTIONS</Text>
            <TextInput
              style={styles.goalInput}
              placeholder="Type any other allergies, intolerances or dietary needs... (e.g. Vegan, Lactose intolerant, Low sodium)"
              placeholderTextColor="#4A5A6A"
              value={otherAllergy}
              onChangeText={setOtherAllergy}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {(allergies.includes('None') || (allergies.length === 0 && !otherAllergy)) && (
              <TouchableOpacity
                style={[styles.allergyOption, styles.noneOption, allergies.includes('None') && styles.optionActive]}
                onPress={() => { setAllergies(['None']); setOtherAllergy(''); }}
              >
                <Text style={[styles.allergyLabel, allergies.includes('None') && styles.optionActiveText]}>
                  {allergies.includes('None') ? '✓ ' : ''}No allergies or restrictions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      case 8:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepLabel}>STEP 8 OF {TOTAL_STEPS}</Text>
            <Text style={styles.stepTitle}>What are your busy days?</Text>
            <Text style={styles.stepSub}>We'll avoid scheduling workouts on these days</Text>
            <View style={styles.daysGrid}>
              {dayOptions.map(day => (
                <TouchableOpacity key={day} style={[styles.dayOption, busyDays.includes(day) && styles.optionActive]} onPress={() => toggleItem(day, busyDays, setBusyDays)}>
                  <Text style={[styles.dayLabel, busyDays.includes(day) && styles.optionActiveText]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {busyDays.length > 0 && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedInfoText}>Busy: {busyDays.join(', ')}</Text>
              </View>
            )}
          </View>
        );
      case 9:
        return (
          <View style={styles.generatingContainer}>
            {saving ? (
              <>
                <ActivityIndicator size="large" color="#00E5A0" style={{ marginBottom: 24 }} />
                <Text style={styles.generatingTitle}>Building your plan...</Text>
                <Text style={styles.generatingText}>KineticIQ AI is analyzing your profile</Text>
                <View style={styles.generatingSteps}>
                  <Text style={styles.generatingStep}>✓ Analyzing body composition & goals</Text>
                  <Text style={styles.generatingStep}>✓ Calibrating cardio based on profile</Text>
                  <Text style={styles.generatingStep}>✓ Calculating personalized macros</Text>
                  <Text style={styles.generatingStep}>✓ Building weekly meal plan</Text>
                  <Text style={styles.generatingStep}>✓ Scheduling your calendar</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.generatingEmoji}>🎉</Text>
                <Text style={styles.generatingTitle}>You're all set!</Text>
                <Text style={styles.generatingText}>Your profile is ready. Let's generate your personalized plan!</Text>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>Build My Plan →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
        {renderProgressDots()}
        {renderStep()}
      </ScrollView>
      {step < TOTAL_STEPS && (
        <View style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.nextButton, step === 1 && styles.nextButtonFull]} onPress={nextStep}>
            <Text style={styles.nextButtonText}>{step === TOTAL_STEPS - 1 ? 'Almost done →' : 'Continue →'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 120 },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#1A2330' },
  progressDotActive: { backgroundColor: '#00E5A0' },
  stepContainer: { flex: 1 },
  stepLabel: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.8, marginBottom: 12 },
  stepTitle: { fontSize: 28, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5, lineHeight: 34, marginBottom: 8 },
  stepSub: { fontSize: 14, color: '#8A9BB0', lineHeight: 20, marginBottom: 28 },
  label: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#111820', borderRadius: 10, padding: 14, color: '#F0F4F8', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  workoutGrid: { gap: 10 },
  workoutOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111820', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 14 },
  workoutOptionValue: { fontSize: 22, fontWeight: '800', color: '#F0F4F8', width: 36, textAlign: 'center' },
  workoutOptionLabel: { fontSize: 15, fontWeight: '600', color: '#8A9BB0' },
  optionActive: { borderColor: '#00E5A0', backgroundColor: 'rgba(0,229,160,0.08)' },
  optionActiveText: { color: '#00E5A0' },
  smokerGrid: { gap: 10 },
  smokerOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111820', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 12 },
  smokerIcon: { fontSize: 24 },
  smokerLabel: { fontSize: 15, fontWeight: '600', color: '#F0F4F8' },
  smokerSub: { fontSize: 12, color: '#8A9BB0', marginTop: 2 },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalOption: { width: '47%', backgroundColor: '#111820', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
  goalIcon: { fontSize: 28, marginBottom: 8 },
  goalLabel: { fontSize: 13, fontWeight: '600', color: '#F0F4F8', textAlign: 'center' },
  examplePrompts: { marginBottom: 16 },
  exampleTitle: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', marginBottom: 10, letterSpacing: 0.5 },
  examplePrompt: { backgroundColor: '#111820', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.15)' },
  examplePromptText: { fontSize: 13, color: '#00E5A0', lineHeight: 18, fontStyle: 'italic' },
  goalInput: { backgroundColor: '#111820', borderRadius: 12, padding: 16, color: '#F0F4F8', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', minHeight: 100, marginBottom: 16, textAlignVertical: 'top' },
  analyzingContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: '#111820', borderRadius: 10, marginBottom: 16 },
  analyzingText: { color: '#8A9BB0', fontSize: 14 },
  analyzedContainer: { backgroundColor: 'rgba(0,229,160,0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', marginBottom: 16 },
  analyzedTitle: { fontSize: 14, fontWeight: '700', color: '#00E5A0', marginBottom: 12 },
  analyzedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  analyzedIcon: { fontSize: 18 },
  analyzedText: { fontSize: 14, color: '#F0F4F8', flex: 1 },
  rewriteButton: { marginTop: 8, alignItems: 'center' },
  rewriteButtonText: { color: '#8A9BB0', fontSize: 13 },
  analyzeButton: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  analyzeButtonText: { color: '#00E5A0', fontSize: 15, fontWeight: '700' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeOption: { width: '47%', backgroundColor: '#111820', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
  timeIcon: { fontSize: 28, marginBottom: 8 },
  timeLabel: { fontSize: 13, fontWeight: '600', color: '#F0F4F8', textAlign: 'center' },
  timeSub: { fontSize: 11, color: '#8A9BB0', marginTop: 4 },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  allergyOption: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#111820', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  allergyLabel: { fontSize: 14, fontWeight: '600', color: '#F0F4F8' }, noneOption: { width: '100%', marginTop: 8 },
  daysGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dayOption: { flex: 1, height: 52, backgroundColor: '#111820', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  dayLabel: { fontSize: 12, fontWeight: '700', color: '#F0F4F8' },
  selectedInfo: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  selectedInfoText: { color: '#00E5A0', fontSize: 13, fontWeight: '500' },
  generatingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  generatingEmoji: { fontSize: 64, marginBottom: 24 },
  generatingTitle: { fontSize: 26, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' },
  generatingText: { fontSize: 14, color: '#8A9BB0', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  generatingSteps: { gap: 10, alignSelf: 'stretch' },
  generatingStep: { fontSize: 14, color: '#00E5A0', backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: 'rgba(0,229,160,0.15)' },
  submitButton: { backgroundColor: '#00E5A0', borderRadius: 12, padding: 18, alignItems: 'center', width: '100%' },
  submitButtonText: { color: '#040A07', fontSize: 17, fontWeight: '700' },
  buttonRow: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 24, paddingBottom: 40, backgroundColor: '#080C10', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  backButton: { backgroundColor: '#111820', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 20 },
  backButtonText: { color: '#8A9BB0', fontSize: 15, fontWeight: '600' },
  nextButton: { flex: 1, backgroundColor: '#00E5A0', borderRadius: 12, padding: 16, alignItems: 'center' },
  nextButtonFull: { flex: 1 },
  nextButtonText: { color: '#040A07', fontSize: 16, fontWeight: '700' },
nextButtonText: { color: '#040A07', fontSize: 16, fontWeight: '700' },
  calculatedAge: { fontSize: 13, color: '#00E5A0', marginTop: -10, marginBottom: 16 },
});

export default function OnboardingScreen(props) {
  return (
    <ErrorBoundary screenName="OnboardingScreen">
      <OnboardingScreenInner {...props} />
    </ErrorBoundary>
  );
}
