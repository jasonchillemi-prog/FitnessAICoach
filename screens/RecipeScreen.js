import React, { useState, useEffect } from 'react';
import { logRecipeViewed } from '../src/utils/analytics';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';

const isRateLimited = (e) => e?.code === 'functions/resource-exhausted';

function RecipeScreenInner({ route, navigation }) {
  const meal = route?.params?.meal || null;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!meal) {
      setError('No meal data provided.');
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
      const data = docSnap.data();
      await generateRecipe(data);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  const generateRecipe = async (userData) => {
    try {
      const generateRecipeFn = httpsCallable(functions, 'generateRecipe');
      const result = await generateRecipeFn({ meal, userData });
      setRecipe(result.data);
      logRecipeViewed(meal?.food || 'unknown');
    } catch (err) {
      setError(
        isRateLimited(err)
          ? "You've reached your daily recipe limit. It resets at midnight UTC — try again tomorrow!"
          : err.message || 'Failed to generate recipe.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!meal) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No meal data found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
        <Text style={styles.mealType}>{meal.meal || ''}</Text>
        <Text style={styles.mealName}>{meal.food || ''}</Text>
        <View style={styles.calBadge}>
          <Text style={styles.calText}>🔥 {meal.calories || 0} kcal</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00E5A0" />
          <Text style={styles.loadingText}>Generating your recipe...</Text>
          <Text style={styles.loadingSubText}>AI is creating a personalized recipe for you</Text>
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
      ) : recipe ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaLabel}>Prep</Text>
              <Text style={styles.metaValue}>{recipe.prepTime || '-'}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaIcon}>🍳</Text>
              <Text style={styles.metaLabel}>Cook</Text>
              <Text style={styles.metaValue}>{recipe.cookTime || '-'}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaIcon}>🍽️</Text>
              <Text style={styles.metaLabel}>Serves</Text>
              <Text style={styles.metaValue}>{recipe.servings || '-'}</Text>
            </View>
          </View>

          <View style={styles.nutritionRow}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutritionInfo?.calories || recipe.calories || '-'}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutritionInfo?.protein || recipe.macros?.protein || '-'}</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutritionInfo?.carbs || recipe.macros?.carbs || '-'}</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{recipe.nutritionInfo?.fat || recipe.macros?.fat || '-'}</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🛒 Ingredients</Text>
            {(recipe.ingredients || []).map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <Text style={styles.ingredientAmount}>{typeof ing === 'string' ? '' : (ing.amount || '')}</Text>
                <Text style={styles.ingredientItem}>{typeof ing === 'string' ? ing : (ing.item || '')}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Instructions</Text>
            {(recipe.instructions || []).map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {recipe.tips ? (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Chef's Tip</Text>
              <Text style={styles.tipsText}>{recipe.tips}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Could not load recipe.</Text>
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
  mealType: { fontSize: 13, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.8, marginBottom: 4 },
  mealName: { fontSize: 20, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3, marginBottom: 10, lineHeight: 26 },
  calBadge: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  calText: { color: '#00E5A0', fontSize: 13, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#F0F4F8', marginTop: 20, marginBottom: 8, textAlign: 'center' },
  loadingSubText: { fontSize: 14, color: '#8A9BB0', textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metaPill: { flex: 1, backgroundColor: '#111820', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  metaIcon: { fontSize: 20, marginBottom: 4 },
  metaLabel: { fontSize: 10, color: '#8A9BB0', fontWeight: '600', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, color: '#F0F4F8', fontWeight: '700', marginTop: 2 },
  nutritionRow: { flexDirection: 'row', backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', justifyContent: 'space-between' },
  nutritionItem: { alignItems: 'center' },
  nutritionValue: { fontSize: 18, fontWeight: '800', color: '#00E5A0' },
  nutritionLabel: { fontSize: 11, color: '#8A9BB0', marginTop: 2 },
  card: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#F0F4F8', marginBottom: 14 },
  ingredientRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 },
  ingredientAmount: { fontSize: 14, fontWeight: '600', color: '#00E5A0', width: 80 },
  ingredientItem: { fontSize: 14, color: '#F0F4F8', flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { color: '#00E5A0', fontWeight: '800', fontSize: 13 },
  stepText: { fontSize: 14, color: '#8A9BB0', flex: 1, lineHeight: 20 },
  tipsCard: { backgroundColor: 'rgba(0,229,160,0.05)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', marginBottom: 16 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#00E5A0', marginBottom: 8 },
  tipsText: { fontSize: 14, color: '#8A9BB0', lineHeight: 20 },
  retryButton: { backgroundColor: '#00E5A0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, paddingHorizontal: 32 },
  retryText: { color: '#040A07', fontSize: 16, fontWeight: '700' },
});

export default function RecipeScreen(props) {
  return (
    <ErrorBoundary screenName="RecipeScreen">
      <RecipeScreenInner {...props} />
    </ErrorBoundary>
  );
}
