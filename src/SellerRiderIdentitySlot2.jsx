import { useEffect, useState } from 'react';
import RiderIdentityCheck from './RiderIdentityCheck';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** For Account.jsx seller notifications: pass the notification's n.orderId (local ID).
 * Resolves the database ID before invoking the authenticated seller verification API.
 */
export default function SellerRiderIdentitySlot({ localOrderId }) {
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const token = localStorage.getItem('silkroad_token') || localStorage.getItem('token') || '';

  useEffect(() => {
    let cancelled = false;
    setOrderId('');
    setError('');
    if (!localOrderId || !token) return;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/orders/by-local-id/${encodeURIComponent(localOrderId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 404) return;
        if (!response.ok) throw new Error('Unable to resolve order for rider verification');
        const body = await response.json();
        const order = body.order || body;
        if (!order?._id || !/^[a-f\d]{24}$/i.test(String(order._id))) {
          throw new Error('The order lookup did not provide a valid database order ID');
        }
        if (!cancelled) setOrderId(String(order._id));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [localOrderId, token, refresh]);

  if (!localOrderId || !token) return null;
  return <div style={{marginTop: 12}}>
    {error && <p role="alert" style={{color:'#fca5a5'}}>{error} <button onClick={() => setRefresh(v => v+1)}>Retry</button></p>}
    {orderId && <RiderIdentityCheck orderId={orderId} token={token} apiBase={`${API_URL}/group-rider-funding`} />}
  </div>;
}
