import { useState, useEffect } from 'react';
import Purchases from 'react-native-purchases';

export default function usePro() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProStatus();
  }, []);

  async function checkProStatus() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      setIsPro(customerInfo.entitlements.active['pro'] !== undefined);
    } catch (e) {
      console.log('RevenueCat checkProStatus error:', e);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }

  return { isPro, loading, refreshPro: checkProStatus };
}
