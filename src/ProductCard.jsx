function ProductCard({ item, rate, onSelect, onAddToCart }) {
  const isDbItem = Boolean(item?._id)

  const sellerName = isDbItem ? item.seller?.name : item.seller
  const university = isDbItem ? item.seller?.university : item.university
  const itemPrice = Number(item.price || item.dailyRate || 0)
  const itemImage = item.image || `https://picsum.photos/seed/${item.id || item._id || "listing"}/600/450`
  const usdPrice = itemPrice / (Number(rate) || 1)

  return (
    <article
      style={{
        minWidth: 0,
        background: "#111",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #1e1e1e",
        transition: "transform 0.2s, border-color 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)"
        e.currentTarget.style.borderColor = "#383127"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.borderColor = "#1e1e1e"
      }}
    >
      <style>{`
        .sr-product-image { height: 170px !important; }
        @media (min-width: 700px) { .sr-product-image { height: 210px !important; } }
        @media (min-width: 1050px) { .sr-product-image { height: 240px !important; } }
      `}</style>
      {/* Product image: show the whole image without cropping. */}
      <button
        type="button"
        onClick={onSelect}
        aria-label={`View ${item.title || "product details"}`}
        className="sr-product-image"
        style={{
          appearance: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "clamp(130px, 42vw, 180px)",
          padding: 0,
          background: "#161616",
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <img
          src={itemImage}
          alt={item.title || "Marketplace listing"}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </button>

      <div
        style={{
          padding: "clamp(9px, 3vw, 14px)",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "#c8a97e",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "5px",
            overflowWrap: "anywhere",
          }}
        >
          {item.category || "Marketplace"}
        </div>

        <button
          type="button"
          onClick={onSelect}
          style={{
            appearance: "none",
            padding: 0,
            border: 0,
            background: "transparent",
            color: "#f0ede8",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            fontSize: "clamp(12px, 3.5vw, 14px)",
            lineHeight: 1.4,
            fontWeight: 650,
            marginBottom: "6px",
            overflowWrap: "anywhere",
          }}
        >
          {item.title || "Untitled listing"}
        </button>

        <div
          style={{
            fontSize: "12px",
            color: "#777",
            marginBottom: "3px",
            overflowWrap: "anywhere",
          }}
        >
          by {sellerName || "Seller"}
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "#666",
            marginBottom: "8px",
            overflowWrap: "anywhere",
          }}
        >
          {university ? `🎓 ${university} · ` : ""}{item.condition || "N/A"}
        </div>

        {Number(item.rating) > 0 && (
          <div
            aria-label={`Rating ${item.rating} out of 5`}
            style={{ fontSize: "12px", color: "#aaa", marginBottom: "9px" }}
          >
            <span style={{ color: "#c8a97e" }}>
              {"★".repeat(Math.max(0, Math.min(5, Math.round(Number(item.rating)))))}
            </span>{" "}
            {item.rating}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: "6px",
            rowGap: "2px",
            marginTop: "auto",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "clamp(15px, 4.2vw, 18px)",
              lineHeight: 1.3,
              fontWeight: 750,
              color: "#c8a97e",
              overflowWrap: "anywhere",
            }}
          >
            ₵{itemPrice.toLocaleString()}
          </span>
          <span style={{ fontSize: "12px", color: "#777", fontWeight: 400 }}>
            (${usdPrice.toFixed(2)})
          </span>
        </div>

        <button
          type="button"
          onClick={onAddToCart}
          style={{
            marginTop: "11px",
            width: "100%",
            minHeight: "42px",
            background: "#c8a97e",
            color: "#17130e",
            border: "none",
            padding: "10px 8px",
            borderRadius: "8px",
            fontWeight: 750,
            cursor: "pointer",
            fontSize: "13px",
            fontFamily: "inherit",
            touchAction: "manipulation",
          }}
        >
          Add to Cart
        </button>
      </div>
    </article>
  )
}

export default ProductCard
