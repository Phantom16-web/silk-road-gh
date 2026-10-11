function ProductCard({
  item,
  rate,
  onSelect,
  onAddToCart,
}) {
  const isDbItem = !!item._id

  const sellerName = isDbItem
    ? item.seller?.name
    : item.seller

  const university = isDbItem
    ? item.seller?.university
    : item.university

  const itemPrice = item.price || item.dailyRate || 0

  const itemImage =
    item.image ||
    `https://picsum.photos/seed/${item.id}/300/200`

  return (
    <div
      style={{
        background: "#111",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #1e1e1e",
        transition: "transform 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)"
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)"
      }}
    >
      {/* Product image */}
      <div
        style={{
          width: "100%",
          height: "180px",
          background: "#161616",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: "pointer",
        }}
        onClick={onSelect}
      >
        <img
          src={itemImage}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Product information */}
      <div style={{ padding: "14px" }}>
        {/* Category */}
        <div
          style={{
            fontSize: "11px",
            color: "#c8a97e",
            fontWeight: "600",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          {item.category}
        </div>

        {/* Product title */}
        <div
          onClick={onSelect}
          style={{
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "4px",
            color: "#f0ede8",
            cursor: "pointer",
          }}
        >
          {item.title}
        </div>

        {/* Seller */}
        <div
          style={{
            fontSize: "12px",
            color: "#666",
            marginBottom: "2px",
          }}
        >
          by {sellerName}
        </div>

        {/* University and condition */}
        <div
          style={{
            fontSize: "11px",
            color: "#555",
            marginBottom: "6px",
          }}
        >
          🎓 {university} · {item.condition || "N/A"}
        </div>

        {/* Rating */}
        {item.rating > 0 && (
          <div
            style={{
              fontSize: "13px",
              color: "#aaa",
              marginBottom: "10px",
            }}
          >
            {"★".repeat(Math.round(item.rating))}{" "}
            {item.rating}
          </div>
        )}

        {/* Price */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "#c8a97e",
          }}
        >
          ₵{itemPrice.toLocaleString()}

          <span
            style={{
              fontSize: "13px",
              color: "#666",
              fontWeight: "400",
            }}
          >
            {" "}
            (${(itemPrice / (rate || 1)).toFixed(2)})
          </span>
        </div>

        {/* Add to cart */}
        <button
          onClick={onAddToCart}
          style={{
            marginTop: "10px",
            width: "100%",
            background: "#c8a97e",
            border: "none",
            padding: "9px",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  )
}

export default ProductCard
