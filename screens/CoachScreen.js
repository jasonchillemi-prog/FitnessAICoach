import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert
} from 'react-native';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';
const SUGGESTED_QUESTIONS = [
  "What should I eat before my workout?",
  "How do I stay motivated?",
  "Can you adjust my meal plan?",
  "What's the best exercise for weight loss?",
];

function CoachScreenInner() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! 👋 I'm your KineticIQ AI coach. I know your full plan — goals, workouts, meals, and progress. Ask me anything or say 'update my plan' and I'll make changes for you!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [userData, setUserData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [lastSuggestion, setLastSuggestion] = useState(null);
  const scrollRef = useRef(null);

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
        setPlan(docSnap.data().savedPlan);
      }
    } catch (e) {
      console.log('Error loading user data:', e);
    }
  };

  const applyToPlan = async () => {
    if (!lastSuggestion || !userData) return;
    setUpdatingPlan(true);
    try {
      const applyFn = httpsCallable(functions, 'applyCoachSuggestion');
      const result = await applyFn({ suggestion: lastSuggestion, userData });
      const parsed = result.data;
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { savedPlan: parsed }, { merge: true });
      setPlan(parsed);
      setLastSuggestion(null);
      const successMsg = { role: 'assistant', content: '✅ Done! Your plan has been updated based on my suggestion. Check your Dashboard to see the changes!' };
      setMessages(prev => [...prev, successMsg]);
      Alert.alert('Plan Updated! 🎉', 'Your Dashboard has been updated with the changes.');
    } catch (error) {
      Alert.alert('Error updating plan', error.message);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const sendMessage = async (messageText) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || loading) return;
    setInput('');
    Keyboard.dismiss();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const systemPrompt = userData ? `You are KineticIQ, a personalized AI fitness and nutrition coach. Here is your client's profile:
- Weight: ${userData.weight} lbs
- Height: ${userData.height}
- Age: ${userData.age}
- Smoker: ${userData.smoker ? 'Yes' : 'No'}
- Goals: ${userData.goals ? userData.goals.join(', ') : 'Not specified'}
- Workouts per week: ${userData.workoutsPerWeek}
- Allergies: ${userData.allergies ? userData.allergies.join(', ') : 'None'}
- Preferred workout times: ${userData.workoutTimes ? userData.workoutTimes.join(', ') : 'Any'}
- Busy days: ${userData.busyDays ? userData.busyDays.join(', ') : 'None'}
Be encouraging, specific, and concise. Keep responses to 3-5 sentences. If you make a specific suggestion that could update their plan, end your response with [SUGGESTION: brief description of the change].` : 'You are KineticIQ, a helpful AI fitness coach.';

      const coachChatFn = httpsCallable(functions, 'coachChat');
      const result = await coachChatFn({ 
        messages: newMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        userData 
      });
      const reply = result.data.reply;
      const suggestionMatch = reply.match(/\[SUGGESTION: (.+?)\]/);
      if (suggestionMatch) {
        setLastSuggestion(suggestionMatch[1]);
      }
      const cleanReply = reply.replace(/\[SUGGESTION: .+?\]/, '').trim();
      setMessages([...newMessages, { role: 'assistant', content: cleanReply }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry I had trouble responding. Please try again!' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>K</Text>
          </View>
          <View>
            <Text style={styles.title}>AI Coach</Text>
            <Text style={styles.subtitle}>Powered by KineticIQ · Can update your plan</Text>
          </View>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {messages.length === 1 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>QUICK QUESTIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SUGGESTED_QUESTIONS.map((q, index) => (
              <TouchableOpacity key={index} style={styles.suggestionChip} onPress={() => sendMessage(q)}>
                <Text style={styles.suggestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View key={index} style={[styles.messageRow, msg.role === 'user' ? styles.userRow : styles.assistantRow]}>
            {msg.role === 'assistant' && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>K</Text>
              </View>
            )}
            <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.assistantRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>K</Text>
            </View>
            <View style={[styles.assistantBubble, styles.typingBubble]}>
              <Text style={styles.typingText}>Thinking...</Text>
              <ActivityIndicator size="small" color="#00E5A0" style={{ marginLeft: 8 }} />
            </View>
          </View>
        )}
        {lastSuggestion && !loading && (
          <TouchableOpacity style={styles.applyButton} onPress={applyToPlan} disabled={updatingPlan}>
            {updatingPlan ? (
              <ActivityIndicator color="#040A07" />
            ) : (
              <>
                <Text style={styles.applyButtonIcon}>✨</Text>
                <Text style={styles.applyButtonText}>Apply suggestion to my plan</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask your coach anything..."
          placeholderTextColor="#4A5A6A"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: '#00E5A0', fontWeight: '800', fontSize: 18 },
  title: { fontSize: 20, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: '#8A9BB0', marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00E5A0' },
  suggestionsContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  suggestionsTitle: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 10 },
  suggestionChip: { backgroundColor: '#111820', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  suggestionText: { color: '#00E5A0', fontSize: 13, fontWeight: '500' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { color: '#00E5A0', fontWeight: '800', fontSize: 13 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  assistantBubble: { backgroundColor: '#111820', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  assistantText: { color: '#F0F4F8' },
  userText: { color: '#F0F4F8' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  typingText: { color: '#8A9BB0', fontSize: 14 },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', marginHorizontal: 16 },
  applyButtonIcon: { fontSize: 18 },
  applyButtonText: { color: '#00E5A0', fontSize: 15, fontWeight: '700' },
  inputContainer: { flexDirection: 'row', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#111820', borderRadius: 12, padding: 14, color: '#F0F4F8', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', maxHeight: 100 },
  sendButton: { backgroundColor: '#00E5A0', borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#1A2330' },
  sendButtonText: { color: '#040A07', fontWeight: '800', fontSize: 22 },
});
export default function CoachScreen() {
  return (
    <ErrorBoundary screenName="CoachScreen">
      <CoachScreenInner />
    </ErrorBoundary>
  );
}