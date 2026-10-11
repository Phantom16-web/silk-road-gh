import { useEffect } from "react"

function ProductModal({ item, onClose, onCart, toUSD }) {
  useEffect(() => {
    if (!item) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = event => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [item, onClose])

  if (!item) return null

  const isDbItem = !!item._id
  const sellerName = (isDbItem ? item.seller?.name : item.seller) || "Silk Road seller"
  const university = isDbItem ? item.seller?.university : item.university
  const itemImage = item.image || `https://picsum.photos/seed/${item.id || item._id || "silkroad"}/900/700`
  const delivery = Array.isArray(item.delivery) ? item.delivery : []
  const price = Number(item.price) || 0
  const rating = Number(item.rating) || 0
  const description = item.desc || item.description || "No description has been provided for this listing."

  return (
    <>
      <style>{`
        .sr-product-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(0, 0, 0, .78);
          backdrop-filter: blur(5px);
        }
        .sr-product-modal {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          width: min(100%, 920px);
          max-height: min(90vh, 820px);
          overflow: hidden;
          background: #111;
          color: #f0ede8;
          border: 1px solid #292929;
          border-radius: 20px;
          box-shadow: 0 24px 90px rgba(0, 0, 0, .5);
        }
        .sr-product-modal-media {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 420px;
          padding: 24px;
          background: radial-gradient(ellipse at center, #24211d 0%, #171615 55%, #111 100%);
        }
        .sr-product-modal-image {
          display: block;
          width: 100%;
          height: 100%;
          max-height: 650px;
          object-fit: contain;
        }
        .sr-product-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid #ffffff24;
          border-radius: 50%;
          background: #090909c9;
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease;
        }
        .sr-product-modal-close:hover {
          background: #333;
          transform: scale(1.04);
        }
        .sr-product-modal-content {
          min-width: 0;
          overflow-y: auto;
          padding: 30px;
        }
        .sr-product-modal-category {
          margin-bottom: 8px;
          color: #c8a97e;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .sr-product-modal-title {
          margin: 0 0 10px;
          color: #f0ede8;
          font-size: clamp(22px, 2.4vw, 30px);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }
        .sr-product-modal-muted {
          color: #85817b;
          font-size: 13px;
          line-height: 1.6;
        }
        .sr-product-modal-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 16px;
          margin-top: 18px;
        }
        .sr-product-modal-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border: 1px solid #2b2926;
          border-radius: 999px;
          background: #1a1917;
          color: #c8c2b9;
          font-size: 12px;
        }
        .sr-product-modal-description {
          margin-top: 24px;
          padding: 16px;
          border: 1px solid #282623;
          border-radius: 12px;
          background: #191817;
        }
        .sr-product-modal-section-label {
          margin-bottom: 8px;
          color: #8d877e;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .sr-product-modal-description-text {
          margin: 0;
          color: #c0bbb3;
          font-size: 14px;
          line-height: 1.75;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .sr-product-modal-delivery {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
        }
        .sr-product-modal-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 26px;
          padding-top: 20px;
          border-top: 1px solid #2b2926;
        }
        .sr-product-modal-price {
          color: #c8a97e;
          font-size: clamp(24px, 2.5vw, 30px);
          font-weight: 750;
          line-height: 1.15;
          overflow-wrap: anywhere;
        }
        .sr-product-modal-usd {
          margin-top: 6px;
          color: #77716a;
          font-size: 12px;
        }
        .sr-product-modal-cart {
          flex-shrink: 0;
          min-height: 46px;
          padding: 12px 16px;
          border: 0;
          border-radius: 10px;
          background: #c8a97e;
          color: #17130e;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease;
        }
        .sr-product-modal-cart:hover {
          background: #d8bb91;
          transform: translateY(-1px);
        }
        .sr-product-modal-cart:focus-visible,
        .sr-product-modal-close:focus-visible {
          outline: 2px solid #f0d3a7;
          outline-offset: 3px;
        }
        @media (max-width: 680px) {
          .sr-product-modal-overlay {
            align-items: center;
            padding: 12px;
          }
          .sr-product-modal {
            display: flex;
            flex-direction: column;
            width: 100%;
            max-height: 94vh;
            max-height: 94dvh;
            border-radius: 16px;
          }
          .sr-product-modal-media {
            flex: 0 0 auto;
            min-height: 0;
            height: clamp(210px, 34vh, 300px);
            padding: 18px;
          }
          .sr-product-modal-image {
            max-height: 100%;
          }
          .sr-product-modal-content {
            overflow-y: auto;
            padding: 22px 20px 20px;
          }
          .sr-product-modal-title {
            font-size: 23px;
          }
          .sr-product-modal-meta {
            margin-top: 14px;
          }
          .sr-product-modal-description {
            margin-top: 18px;
          }
          .sr-product-modal-bottom {
            align-items: flex-start;
            margin-top: 20px;
            padding-top: 16px;
          }
          .sr-product-modal-cart {
            padding: 12px;
            white-space: nowrap;
          }
        }
        @media (max-width: 380px) {
          .sr-product-modal-content {
            padding-right: 15px;
            padding-left: 15px;
          }
          .sr-product-modal-bottom {
            gap: 10px;
          }
          .sr-product-modal-cart {
            font-size: 12px;
          }
        }
      `}</style>

      <div
        className="sr-product-modal-overlay"
        onClick={onClose}
      >
        <section
          className="sr-product-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${item.title || "Product"} details`}
          onClick={event => event.stopPropagation()}
        >
          <div className="sr-product-modal-media">
            <img
              className="sr-product-modal-image"
              src={itemImage}
              alt={item.title || "Product listing"}
            />
            <button
              type="button"
              className="sr-product-modal-close"
              onClick={onClose}
              aria-label="Close product details"
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="sr-product-modal-content">
            <div className="sr-product-modal-category">
              {item.category || "Marketplace listing"}
            </div>
            <h2 className="sr-product-modal-title">{item.title || "Untitled listing"}</h2>
            <div className="sr-product-modal-muted">
              Listed by <span style={{ color: "#c8c2b9", fontWeight: 650 }}>{sellerName}</span>
            </div>
            {university && (
              <div className="sr-product-modal-muted" style={{ marginTop: 4 }}>
                🎓 {university}
              </div>
            )}

            {(rating > 0 || (item.condition && item.condition !== "N/A")) && (
              <div className="sr-product-modal-meta">
                {rating > 0 && (
                  <div className="sr-product-modal-pill" aria-label={`Rated ${rating} out of 5`}>
                    <span style={{ color: "#c8a97e", letterSpacing: ".04em" }}>
                      {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
                      {"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(rating))))}
                    </span>
                    <span>{rating}</span>
                  </div>
                )}
                {item.condition && item.condition !== "N/A" && (
                  <div className="sr-product-modal-pill">
                    Condition: <strong style={{ color: "#f0ede8" }}>{item.condition}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="sr-product-modal-description">
              <div className="sr-product-modal-section-label">About this item</div>
              <p className="sr-product-modal-description-text">{description}</p>
            </div>

            {delivery.length > 0 && (
              <div className="sr-product-modal-delivery-section">
                <div className="sr-product-modal-section-label" style={{ marginTop: 20 }}>
                  Delivery options
                </div>
                <div className="sr-product-modal-delivery">
                  {delivery.map(option => (
                    <span className="sr-product-modal-pill" key={option}>
                      {option === "Pickup"
                        ? "📍 Campus Pickup"
                        : option === "Rider"
                          ? "🛵 Rider Delivery"
                          : option === "Shipping"
                            ? "📦 Shipping"
                            : option}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="sr-product-modal-bottom">
              <div>
                <div className="sr-product-modal-price">₵{price.toLocaleString()}</div>
                <div className="sr-product-modal-usd">${toUSD(price)} USD</div>
              </div>
              <button
                type="button"
                className="sr-product-modal-cart"
                onClick={() => {
                  onCart(item)
                  onClose()
                }}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default ProductModal
