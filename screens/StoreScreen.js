import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';

const products = [
  {
    id: 1,
    emoji: '🥤',
    badge: 'BEST FOR YOUR PLAN',
    name: 'Whey Isolate Protein',
    desc: '25g protein per scoop, low carb, fast absorbing. Perfect post-workout recovery.',
    price: 49.99,
    category: 'Protein'
  },
  {
    id: 2,
    emoji: '🍫',
    badge: 'HIGH PROTEIN SNACK',
    name: 'Protein Bars (12-pack)',
    desc: '20g protein, low sugar. Perfect mid-day snack to hit your macros.',
    price: 32.99,
    category: 'Snacks'
  },
  {
    id: 3,
    emoji: '💊',
    badge: 'RECOVERY',
    name: 'Creatine Monohydrate',
    desc: 'Pure micronized creatine for strength and endurance gains.',
    price: 24.99,
    category: 'Supplements'
  },
  {
    id: 4,
    emoji: '🧃',
    badge: 'PRE-WORKOUT',
    name: 'Clean Pre-Workout',
    desc: 'No artificial dyes. Caffeine + beta-alanine for focus and performance.',
    price: 39.99,
    category: 'Supplements'
  },
  {
    id: 5,
    emoji: '🐟',
    badge: 'ESSENTIAL',
    name: 'Omega-3 Fish Oil',
    desc: 'Heart health, inflammation reduction, and joint recovery support.',
    price: 18.99,
    category: 'Supplements'
  },
  {
    id: 6,
    emoji: '🥜',
    badge: 'MEAL PREP',
    name: 'Mixed Nut Variety Pack',
    desc: 'Healthy fats and protein for on-the-go snacking.',
    price: 22.99,
    category: 'Snacks'
  },
  {
    id: 7,
    emoji: '🌿',
    badge: 'IMMUNITY',
    name: 'Multivitamin Pack',
    desc: 'Complete daily vitamins and minerals to support your active lifestyle.',
    price: 29.99,
    category: 'Supplements'
  },
  {
    id: 8,
    emoji: '🍵',
    badge: 'RECOVERY',
    name: 'Magnesium & ZMA',
    desc: 'Improves sleep quality and muscle recovery overnight.',
    price: 19.99,
    category: 'Supplements'
  },
];

export default function StoreScreen() {
  const [cart, setCart] = useState([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Protein', 'Supplements', 'Snacks'];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    Alert.alert('Added to Cart! 🛒', `${product.name} has been added to your cart.`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Add some products to your cart first!');
      return;
    }
    Alert.alert(
      'Order Placed! 🎉',
      `Your order of $${getCartTotal()} has been placed and will be shipped to your address. Expected delivery: 3-5 business days.`,
      [{ text: 'Great!', onPress: () => { setCart([]); setCartVisible(false); } }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Store</Text>
            <Text style={styles.subtitle}>Recommended for your plan</Text>
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

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>KineticIQ Picks 🏆</Text>
          <Text style={styles.bannerSub}>Curated supplements matched to your goals · Free shipping over $50</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.productsGrid}>
          {filteredProducts.map(product => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productEmoji}>
                <Text style={styles.emojiText}>{product.emoji}</Text>
              </View>
              <View style={styles.productBody}>
                <View style={styles.badgeContainer}>
                  <Text style={styles.productBadge}>{product.badge}</Text>
                </View>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDesc}>{product.desc}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>${product.price}</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => addToCart(product)}
                  >
                    <Text style={styles.addButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={cartVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Cart 🛒</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
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
                        <Text style={styles.cartItemPrice}>${item.price} x {item.quantity}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                        <Text style={styles.removeButton}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.cartTotal}>
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888888' },
  cartButton: { position: 'relative', padding: 8 },
  cartIcon: { fontSize: 28 },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#00ff88', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#0a0a0a', fontSize: 11, fontWeight: 'bold' },
  banner: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#333333' },
  bannerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  bannerSub: { fontSize: 13, color: '#888888' },
  categoryScroll: { marginBottom: 20 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a1a', marginRight: 8, borderWidth: 1, borderColor: '#333333' },
  categoryTabActive: { backgroundColor: '#003322', borderColor: '#00ff88' },
  categoryText: { color: '#888888', fontSize: 14, fontWeight: '600' },
  categoryTextActive: { color: '#00ff88' },
  productsGrid: { gap: 16 },
  productCard: { backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#333333' },
  productEmoji: { height: 120, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 56 },
  productBody: { padding: 16 },
  badgeContainer: { marginBottom: 8 },
  productBadge: { fontSize: 10, fontWeight: '700', color: '#00ff88', backgroundColor: '#003322', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start', letterSpacing: 0.5 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 },
  productDesc: { fontSize: 13, color: '#888888', lineHeight: 18, marginBottom: 14 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontSize: 22, fontWeight: 'bold', color: '#00ff88' },
  addButton: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#00ff88', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#00ff88', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#141414', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: '#333333' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
  modalClose: { fontSize: 18, color: '#888888', padding: 4 },
  emptyCart: { alignItems: 'center', padding: 40 },
  emptyCartText: { fontSize: 18, color: '#ffffff', fontWeight: 'bold', marginBottom: 8 },
  emptyCartSub: { fontSize: 14, color: '#888888' },
  cartItems: { maxHeight: 300 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333333', gap: 12 },
  cartItemEmoji: { fontSize: 28 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  cartItemPrice: { fontSize: 13, color: '#888888' },
  removeButton: { fontSize: 20 },
  cartTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#333333', marginTop: 8 },
  cartTotalLabel: { fontSize: 16, color: '#888888', fontWeight: '600' },
  cartTotalAmount: { fontSize: 24, fontWeight: 'bold', color: '#00ff88' },
  checkoutButton: { backgroundColor: '#00ff88', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  checkoutButtonText: { color: '#0a0a0a', fontSize: 18, fontWeight: 'bold' },
});