import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const ALL_PRODUCTS = [
  { id: 1, emoji: '🥤', badge: 'PROTEIN', name: 'Whey Isolate Protein', desc: '25g protein per scoop, low carb, fast absorbing.', price: 49.99, category: 'Protein', tags: ['lose weight', 'build muscle', 'gain strength'] },
  { id: 2, emoji: '🍫', badge: 'SNACK', name: 'Protein Bars (12-pack)', desc: '20g protein, low sugar. Perfect mid-day snack.', price: 32.99, category: 'Snacks', tags: ['lose weight', 'build muscle', 'get fit'] },
  { id: 3, emoji: '💊', badge: 'RECOVERY', name: 'Creatine Monohydrate', desc: 'Pure micronized creatine for strength and endurance.', price: 24.99, category: 'Supplements', tags: ['build muscle', 'gain strength', 'increase endurance'] },
  { id: 4, emoji: '🧃', badge: 'PRE-WORKOUT', name: 'Clean Pre-Workout', desc: 'No artificial dyes. Caffeine + beta-alanine.', price: 39.99, category: 'Supplements', tags: ['get fit', 'increase endurance', 'gain strength'] },
  { id: 5, emoji: '🐟', badge: 'ESSENTIAL', name: 'Omega-3 Fish Oil', desc: 'Heart health, inflammation reduction, joint recovery.', price: 18.99, category: 'Supplements', tags: ['lose weight', 'get fit', 'reduce stress'] },
  { id: 6, emoji: '🥜', badge: 'MEAL PREP', name: 'Mixed Nut Variety Pack', desc: 'Healthy fats and protein for on-the-go snacking.', price: 22.99, category: 'Snacks', tags: ['eat healthier', 'lose weight'] },
  { id: 7, emoji: '🌿', badge: 'IMMUNITY', name: 'Multivitamin Pack', desc: 'Complete daily vitamins and minerals.', price: 29.99, category: 'Supplements', tags: ['get fit', 'eat healthier', 'reduce stress'] },
  { id: 8, emoji: '🍵', badge: 'RECOVERY', name: 'Magnesium & ZMA', desc: 'Improves sleep quality and muscle recovery.', price: 19.99, category: 'Supplements', tags: ['build muscle', 'reduce stress', 'gain strength'] },
  { id: 9, emoji: '🧴', badge: 'HYDRATION', name: 'Electrolyte Mix', desc: 'Stay hydrated during intense workouts.', price: 24.99, category: 'Supplements', tags: ['increase endurance', 'get fit'] },
  { id: 10, emoji: '🍃', badge: 'WEIGHT LOSS', name: 'Green Tea Extract', desc: 'Natural metabolism booster and antioxidant.', price: 16.99, category: 'Supplements', tags: ['lose weight', 'eat healthier'] },
  { id: 11, emoji: '🥛', badge: 'PROTEIN', name: 'Plant-Based Protein', desc: 'Vegan friendly, 22g protein per serving.', price: 44.99, category: 'Protein', tags: ['eat healthier', 'build muscle'] },
  { id: 12, emoji: '⚡', badge: 'ENERGY', name: 'BCAA Amino Acids', desc: 'Reduces muscle soreness, speeds recovery.', price: 34.99, category: 'Supplements', tags: ['build muscle', 'gain strength', 'increase endurance'] },
];

export default function StoreScreen() {
  const [cart, setCart] = useState([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('For You');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const categories = ['For You', 'All', 'Protein', 'Supplements', 'Snacks'];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());
    } catch (e) {
      console.log('Error loading user:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedProducts = () => {
    if (!userData || !userData.goals) return ALL_PRODUCTS.slice(0, 6);
    const userGoals = userData.goals.map(g => g.toLowerCase());
    const scored = ALL_PRODUCTS.map(product => {
      const matchScore = product.tags.filter(tag => userGoals.some(goal => goal.includes(tag) || tag.includes(goal))).length;
      return { ...product, score: matchScore };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 6);
  };

  const getFilteredProducts = () => {
    if (selectedCategory === 'For You') return getRecommendedProducts();
    if (selectedCategory === 'All') return ALL_PRODUCTS;
    return ALL_PRODUCTS.filter(p => p.category === selectedCategory);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    Alert.alert('Added! 🛒', `${product.name} added to cart.`);
  };

  const removeFromCart = (productId) => setCart(cart.filter(item => item.id !== productId));
  const getCartTotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) { Alert.alert('Cart is empty', 'Add some products first!'); return; }
    Alert.alert('Order Placed! 🎉', `Your order of $${getCartTotal()} has been placed. Expected delivery: 3-5 business days.`,
      [{ text: 'Great!', onPress: () => { setCart([]); setCartVisible(false); } }]
    );
  };

  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Store</Text>
            <Text style={styles.subtitle}>
              {selectedCategory === 'For You' && userData?.goals
                ? `Based on your goals: ${userData.goals.slice(0, 2).join(', ')}`
                : 'Curated for your fitness goals'}
            </Text>
          </View>
          <TouchableOpacity style={styles.cartButton} onPress={() => setCartVisible(true)}>
            <Text style={styles.cartIcon}>🛒</Text>
            {getCartCount() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {selectedCategory === 'For You' && userData?.goals && (
          <View style={styles.banner}>
            <Text style={styles.bannerTag}>PERSONALIZED FOR YOU 🎯</Text>
            <Text style={styles.bannerTitle}>Based on your goals</Text>
            <Text style={styles.bannerSub}>Products matched to: {userData.goals.join(', ')}</Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat === 'For You' ? '⭐ For You' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#00E5A0" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map(product => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productEmoji}>
                  <Text style={styles.emojiText}>{product.emoji}</Text>
                  {selectedCategory === 'For You' && product.score > 0 && (
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>✓ Matches your goals</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productBody}>
                  <Text style={styles.productBadge}>{product.badge}</Text>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDesc}>{product.desc}</Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>${product.price}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => addToCart(product)}>
                      <Text style={styles.addButtonText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={cartVisible} animationType="slide" transparent={true} onRequestClose={() => setCartVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Cart</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartEmoji}>🛒</Text>
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <Text style={styles.emptyCartSub}>Add some products to get started!</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartItems}>
                  {cart.map(item => (
                    <View key={item.id} style={styles.cartItem}>
                      <Text style={styles.cartItemEmoji}>{item.emoji}</Text>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        <Text style={styles.cartItemPrice}>${item.price} × {item.quantity}</Text>
                      </View>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item.id)}>
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.cartTotalRow}>
                  <Text style={styles.cartTotalLabel}>Total</Text>
                  <Text style={styles.cartTotalAmount}>${getCartTotal()}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                  <Text style={styles.checkoutButtonText}>Place Order →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#8A9BB0', marginTop: 4, maxWidth: 250 },
  cartButton: { position: 'relative', padding: 8 },
  cartIcon: { fontSize: 26 },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#00E5A0', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#040A07', fontSize: 11, fontWeight: '800' },
  banner: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  bannerTag: { fontSize: 10, fontWeight: '700', color: '#00E5A0', letterSpacing: 1, marginBottom: 6 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3 },
  bannerSub: { fontSize: 12, color: '#8A9BB0', marginTop: 4 },
  categoryScroll: { marginBottom: 20 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111820', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  categoryTabActive: { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: 'rgba(0,229,160,0.25)' },
  categoryText: { color: '#8A9BB0', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#00E5A0' },
  productsGrid: { gap: 14 },
  productCard: { backgroundColor: '#111820', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  productEmoji: { height: 110, backgroundColor: '#1A2330', alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 52 },
  matchBadge: { position: 'absolute', bottom: 8, backgroundColor: 'rgba(0,229,160,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,229,160,0.3)' },
  matchBadgeText: { color: '#00E5A0', fontSize: 10, fontWeight: '700' },
  productBody: { padding: 14 },
  productBadge: { fontSize: 10, fontWeight: '700', color: '#00E5A0', letterSpacing: 0.8, marginBottom: 6 },
  productName: { fontSize: 15, fontWeight: '700', color: '#F0F4F8', marginBottom: 6 },
  productDesc: { fontSize: 13, color: '#8A9BB0', lineHeight: 18, marginBottom: 12 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 22, fontWeight: '800', color: '#00E5A0', letterSpacing: -0.5 },
  addButton: { backgroundColor: '#1A2330', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#00E5A0', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111820', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#1A2330', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#F0F4F8' },
  modalClose: { fontSize: 18, color: '#8A9BB0', padding: 4 },
  emptyCart: { alignItems: 'center', padding: 40 },
  emptyCartEmoji: { fontSize: 48, marginBottom: 12 },
  emptyCartText: { fontSize: 18, color: '#F0F4F8', fontWeight: '700', marginBottom: 8 },
  emptyCartSub: { fontSize: 14, color: '#8A9BB0' },
  cartItems: { maxHeight: 300 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 },
  cartItemEmoji: { fontSize: 28 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: '#F0F4F8', marginBottom: 4 },
  cartItemPrice: { fontSize: 13, color: '#8A9BB0' },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A2330', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#8A9BB0', fontSize: 12 },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', marginTop: 8 },
  cartTotalLabel: { fontSize: 16, color: '#8A9BB0', fontWeight: '600' },
  cartTotalAmount: { fontSize: 26, fontWeight: '800', color: '#00E5A0', letterSpacing: -0.5 },
  checkoutButton: { backgroundColor: '#00E5A0', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  checkoutButtonText: { color: '#040A07', fontSize: 17, fontWeight: '700' },
});
