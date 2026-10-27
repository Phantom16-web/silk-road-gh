import React, { useEffect, useRef, useState } from 'react'
import './PaystackCheckoutExperience.css'

/** Mount only when the server-created checkout says paymentMethod === 'paystack'.
 * Never accept a client-supplied amount or infer success from a redirect.
 */
export default function PaystackCheckoutExperience({ apiUrl, checkoutId, claimToken, onVerified }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('ready')
  const [message, setMessage] = useState('Your order is not funded until Paystack confirms the payment.')
  const [url, setUrl] = useState('')
  const busy = useRef(false)
  const endpoint = `${apiUrl.replace(/\/$/, '')}/checkout-paystack/${encodeURIComponent(checkoutId)}`
  const headers = { 'Content-Type': 'application/json', 'x-checkout-token': claimToken }

  async function request(path, body) {
    const response = await fetch(`${endpoint}/${path}`, {
      method: 'POST', headers, ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || `Payment request failed (${response.status}).`)
    return data
  }
  async function initialize() {
    if (busy.current) return
    busy.current = true
    setState('loading')
    try {
      const result = await request('initialize', { email: email.trim() })
      const parsed = new URL(result.authorizationUrl)
      if (parsed.protocol !== 'https:' || !['checkout.paystack.com', 'paystack.com'].includes(parsed.hostname)) {
        throw new Error('Payment provider returned an unexpected checkout address. Contact support.')
      }
      setUrl(parsed.href)
      setState('awaiting')
      setMessage('Paystack is ready. Open the secure checkout, complete payment, then return here to verify.')
    } catch (error) {
      setState('error'); setMessage(error.message)
    } finally { busy.current = false }
  }
  async function verify() {
    if (busy.current) return
    busy.current = true; setState('checking')
    try {
      const result = await request('verify')
      if (result.verified) {
        setState('verified')
        setMessage('Payment verified with Paystack. Your seller orders are funded.')
        onVerified?.(result)
      } else {
        setState('awaiting')
        setMessage(`Paystack has not confirmed payment (${result.providerStatus || 'pending'}). Do not pay twice. Try checking again shortly.`)
      }
    } catch (error) { setState('awaiting'); setMessage(`${error.message} Do not send another payment until support reconciles the first attempt.`) }
    finally { busy.current = false }
  }
  useEffect(() => { setState('ready'); setUrl(''); setMessage('Your order is not funded until Paystack confirms the payment.') }, [checkoutId])
  return <section className="sr-paystack" aria-label="Paystack payment">
    <div className="sr-paystack-top"><span className="sr-paystack-monogram">SR<span>•</span>GH</span><span className="sr-paystack-eyebrow">SECURE PAYMENT / 02</span></div>
    <div className="sr-paystack-content"><div className="sr-paystack-kicker">SILK ROAD / CHECKOUT</div>
      <h2>Pay with <em>confidence.</em></h2>
      <p className="sr-paystack-intro">Pay securely through Paystack. Your seller orders will only be funded after independent server verification.</p>
      {state === 'ready' || state === 'loading' || state === 'error' ? <div className="sr-paystack-fields">
        <label htmlFor="sr-paystack-email">EMAIL FOR PAYMENT RECEIPT</label>
        <input id="sr-paystack-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" maxLength={254} />
        <button type="button" disabled={state === 'loading' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} onClick={initialize}>{state === 'loading' ? 'PREPARING PAYMENT…' : 'PREPARE SECURE PAYMENT ↗'}</button>
      </div> : null}
      {url && state !== 'verified' && <div className="sr-paystack-fields"><a className="sr-paystack-link" href={url} target="_blank" rel="noopener noreferrer">OPEN PAYSTACK CHECKOUT ↗</a><button type="button" className="sr-paystack-secondary" disabled={state === 'checking'} onClick={verify}>{state === 'checking' ? 'VERIFYING WITH PAYSTACK…' : 'I PAID — VERIFY PAYMENT'}</button></div>}
      <div className={`sr-paystack-status sr-paystack-${state}`} role="status"><span className="sr-paystack-pulse"/>{message}</div>
      <p className="sr-paystack-foot">Never share your MoMo PIN or one-time password with Silk Road staff. Payment status is confirmed by the backend, not this screen.</p>
    </div>
  </section>
}
