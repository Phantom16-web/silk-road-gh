import { AIcon } from "./AccountIcons"

const DAY = 24 * 3600 * 1000

// Image-first card: the photo carries the card. Heart and a round add button float on top, text stays quiet.
function ProductCard({ item, rate, onSelect, onAddToCart, isFav = false, onToggleFav }) {
  const isDbItem = Boolean(item?._id)
  const sellerName = isDbItem ? item.seller?.name : item.seller
  const university = isDbItem ? item.seller?.university : item.university
  const itemPrice = Number(item.price || item.dailyRate || 0)
  const itemImage = item.image || `https://picsum.photos/seed/${item.id || item._id || "listing"}/600/750`
  const usdPrice = itemPrice / (Number(rate) || 1)
  const rating = Number(item.rating) > 0 ? Number(item.rating) : 0
  const isNew = item.createdAt && Date.now() - new Date(item.createdAt).getTime() < 7 * DAY

  return (
    <article className="hm-card">
      <div className="pic">
        <button type="button" className="shot" onClick={onSelect} aria-label={`View ${item.title || "product details"}`}>
          <img className="bg" src={itemImage} alt="" aria-hidden="true" loading="lazy" />
          <img className="fg" src={itemImage} alt={item.title || "Marketplace listing"} loading="lazy" />
        </button>
        {isNew && <span className="flag">NEW</span>}
        <span className="cat">{item.category || "Marketplace"}</span>
        <button type="button" className={`heart ${isFav ? "on" : ""}`} onClick={onToggleFav} aria-pressed={isFav} aria-label={isFav ? "Remove from saved" : "Save for later"}>
          <AIcon name="heart" size={17} stroke={2.1} />
        </button>
        <button type="button" className="plus" onClick={onAddToCart} aria-label={`Add ${item.title || "item"} to cart`}><AIcon name="plus" size={22} stroke={2.8} /></button>
      </div>
      <div className="body">
        <button type="button" className="ttl" onClick={onSelect}>{item.title || "Untitled listing"}</button>
        <div className="meta">
          <span>{sellerName || "Seller"}</span>
          {university && <><i />{university}</>}
          {rating > 0 && <><i /><span className="star"><AIcon name="star" size={11} stroke={1.5} />{rating}</span></>}
        </div>
        <div className="price"><b>₵{itemPrice.toLocaleString()}</b><span>≈ ${usdPrice.toFixed(2)}</span></div>
      </div>
    </article>
  )
}

export default ProductCard
