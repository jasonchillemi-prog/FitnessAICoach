import { useState, useEffect } from 'react';
import Purchases from 'react-native-purchases';

const BETA_OVERRIDE_PRO = true; // TODO: flip to false before App Store launch

export default function usePro() {
  const [isPro, setIsPro] = useState(BETA_OVERRIDE_PRO || false);
  const [loading, setLoading] = useState(!BETA_OVERRIDE_PRO);

  useEffect(() => {
    if (!BETA_OVERRIDE_PRO) {
      checkProStatus();
    }
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

  return { isPro, loading, refreshPro: BETA_OVERRIDE_PRO ? () => {} : checkProStatus };
}
