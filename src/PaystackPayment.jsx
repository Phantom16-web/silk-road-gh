import { useEffect } from "react"

export default function PaystackPayment({ email, amount, publicKey, onSuccess, onClose, metadata }) {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    document.body.appendChild(script)
    return () => document.body.removeChild(script)
  }, [])

  const handlePay = () => {
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: email,
      amount: amount * 100, // Paystack uses pesewas (like kobo)
      currency: "GHS",
      metadata: metadata || {},
      callback: (response) => {
        onSuccess(response)
      },
      onClose: () => {
        onClose()
      }
    })
    handler.openIframe()
  }

  return (
    <button
      onClick={handlePay}
      style={{
        width: "100%",
        background: "#ffd700",
        border: "none",
        padding: "14px",
        borderRadius: "10px",
        fontWeight: "700",
        cursor: "pointer",
        fontSize: "15px",
        color: "#000",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px"
      }}>
      📱 Pay with MTN MoMo via Paystack
    </button>
  )
}