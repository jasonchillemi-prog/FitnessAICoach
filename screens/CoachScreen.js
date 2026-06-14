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
import NetInfo from '@react-native-community/netinfo';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';
import { savePlan, saveUserData, loadUserData as loadCachedUserData } from '../src/utils/offlineCache';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import usePro from '../hooks/usePro';

const isRateLimited = (e) =>
  e?.code === 'functions/resource-exhausted' ||
  e?.code === 'resource-exhausted' ||
  /resource|limit/i.test(e?.message);

const SUGGESTED_QUESTIONS = [
  "What should I eat before my workout?",
  "How do I stay motivated?",
  "Can you adjust my meal plan?",
  "What's the best exercise for weight loss?",
];

function CoachScreenInner() {
  const navigation = useNavigation();
  const { isPro, loading: proLoading } = usePro();

  useEffect(() => {
    if (!proLoading && !isPro) {
      navigation.replace('Paywall');
    }
  }, [isPro, proLoading]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [userData, setUserData] = useState(null);
  const [plan, setPlan] = useState(null);
  const planRef = useRef(null);
  const [isOffline, setIsOffline] = useState(false);
  const scrollRef = useRef(null);

  // Track connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected || state.isInternetReachable === false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => { planRef.current = plan; }, [plan]);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setPlan(data.savedPlan);
        await saveUserData(data);
      }
    } catch (e) {
      console.log('Firestore load failed, trying cache:', e);
      const cached = await loadCachedUserData();
      if (cached) {
        setUserData(cached);
        setPlan(cached.savedPlan);
      }
    }
  };

  const applyToPlan = async (suggestion, currentPlan, currentMessages) => {
    if (!suggestion || !userData) return;
    if (isOffline) {
      Alert.alert('You\'re offline', 'Applying plan changes requires an internet connection.');
      return;
    }
    setUpdatingPlan(true);
    // Show applying toast in chat
    const applyingMsg = { role: 'assistant', content: '⏳ Applying your plan update...' };
    const messagesWithApplying = [...currentMessages, applyingMsg];
    setMessages(messagesWithApplying);
    try {
      const applyFn = httpsCallable(functions, 'applyCoachSuggestion');
      const result = await applyFn({ suggestion, userData, currentPlan });
      const parsed = result.data;
      const user = auth.currentUser;
      const mergedPlan = { ...currentPlan, ...parsed };
      if (parsed.groceryList && currentPlan.groceryList) {
        const existingItems = new Set(parsed.groceryList.map(i => i.toLowerCase().trim()));
        const userAddedItems = currentPlan.groceryList.filter(i => !existingItems.has(i.toLowerCase().trim()));
        const combined = [...parsed.groceryList, ...userAddedItems];
        mergedPlan.groceryList = combined.filter((item, index) =>
          combined.findIndex(i => i.toLowerCase().trim() === item.toLowerCase().trim()) === index
        );
      }
      await setDoc(doc(db, 'users', user.uid), { savedPlan: mergedPlan }, { merge: true });
      await savePlan(mergedPlan);
      setPlan(mergedPlan);
      // Replace applying message with success message
      const successMsg = { role: 'assistant', content: '✅ Done! Your plan has been updated. Check your Dashboard to see the changes!' };
      setMessages(prev => [...prev.slice(0, -1), successMsg]);
    } catch (error) {
      const errorContent = isRateLimited(error)
        ? "You've reached your daily plan update limit. It resets at midnight UTC — try again tomorrow! 🌙"
        : "❌ Sorry, I couldn't update your plan right now. Please try again.";
      const errorMsg = { role: 'assistant', content: errorContent };
      setMessages(prev => [...prev.slice(0, -1), errorMsg]);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const sendMessage = async (messageText) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || loading) return;

    if (isOffline) {
      Alert.alert('You\'re offline', 'Your AI coach requires an internet connection.');
      return;
    }

    setInput('');
    Keyboard.dismiss();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const coachChatFn = httpsCallable(functions, 'coachChat');
      const result = await coachChatFn({
        messages: newMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        userData
      });
      const reply = result.data.reply;
      const suggestionMatch = reply.match(/\[SUGGESTION: (.+?)\]/);
      const cleanReply = reply.replace(/\[SUGGESTION: .+?\]/, '').trim();
      const messagesWithReply = [...newMessages, { role: 'assistant', content: cleanReply }];
      setMessages(messagesWithReply);
      // Auto-apply if suggestion detected
      if (suggestionMatch) {
        setTimeout(() => {
          applyToPlan(suggestionMatch[1], planRef.current, messagesWithReply);
        }, 800);
      }
    } catch (error) {
      const errorContent = isRateLimited(error)
        ? "You've reached your daily chat limit. It resets at midnight UTC — try again tomorrow! 🌙"
        : 'Sorry, I had trouble responding. Please try again!';
      setMessages([...newMessages, { role: 'assistant', content: errorContent }]);
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
        <View style={[styles.onlineDot, isOffline && styles.offlineDot]} />
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📵 You're offline — coach unavailable</Text>
        </View>
      )}

      {messages.length === 0 && !isOffline && (
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
        <View style={[styles.messageRow, styles.assistantRow]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>K</Text>
          </View>
          <View style={[styles.bubble, styles.assistantBubble]}>
            <Text style={[styles.bubbleText, styles.assistantText]}>
              {"Hey! 👋 I'm your KineticIQ AI coach. I know your full plan — goals, workouts, meals, and progress. Ask me anything or say 'update my plan' and I'll make changes for you!"}
            </Text>
          </View>
        </View>
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
        {updatingPlan && (
          <View style={styles.assistantRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>K</Text>
            </View>
            <View style={[styles.assistantBubble, styles.typingBubble]}>
              <Text style={styles.typingText}>Updating your plan...</Text>
              <ActivityIndicator size="small" color="#00E5A0" style={{ marginLeft: 8 }} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, isOffline && styles.inputContainerDisabled]}>
        <TextInput
          style={[styles.input, isOffline && styles.inputDisabled]}
          placeholder={isOffline ? 'Connect to internet to chat...' : 'Ask your coach anything...'}
          placeholderTextColor="#4A5A6A"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          editable={!isOffline}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading || isOffline) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading || isOffline}
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
  offlineDot: { backgroundColor: '#FF3B30' },
  offlineBanner: { backgroundColor: 'rgba(255,59,48,0.08)', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,59,48,0.15)', alignItems: 'center' },
  offlineBannerText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
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
  inputContainer: { flexDirection: 'row', padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', gap: 10, alignItems: 'flex-end' },
  inputContainerDisabled: { opacity: 0.5 },
  input: { flex: 1, backgroundColor: '#111820', borderRadius: 12, padding: 14, color: '#F0F4F8', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', maxHeight: 100 },
  inputDisabled: { color: '#4A5A6A' },
  sendButton: { backgroundColor: '#00E5A0', borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#1A2330' },
  sendButtonText: { color: '#040A07', fontWeight: '800', fontSize: 22 },
});

export default function CoachScreen(props) {
  return (
    <ErrorBoundary screenName="CoachScreen">
      <CoachScreenInner {...props} />
    </ErrorBoundary>
  );
}
