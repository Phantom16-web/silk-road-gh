import { AIcon } from "./AccountIcons"

function ProductCard({ item, rate, onSelect, onAddToCart }) {
  const isDbItem = Boolean(item?._id)
  const sellerName = isDbItem ? item.seller?.name : item.seller
  const university = isDbItem ? item.seller?.university : item.university
  const itemPrice = Number(item.price || item.dailyRate || 0)
  const itemImage = item.image || `https://picsum.photos/seed/${item.id || item._id || "listing"}/600/450`
  const usdPrice = itemPrice / (Number(rate) || 1)
  const rating = Number(item.rating) > 0 ? Number(item.rating) : 0

  return (
    <article className="hm-card">
      <button type="button" className="pic" onClick={onSelect} aria-label={`View ${item.title || "product details"}`}>
        <img className="bg" src={itemImage} alt="" aria-hidden="true" loading="lazy" />
        <img className="fg" src={itemImage} alt={item.title || "Marketplace listing"} loading="lazy" />
        <span className="cat">{item.category || "Marketplace"}</span>
      </button>
      <div className="body">
        <button type="button" className="ttl" onClick={onSelect}>{item.title || "Untitled listing"}</button>
        <div className="by">
          <span>by <b>{sellerName || "Seller"}</b></span>
          {university && <span className="campus"><AIcon name="graduation" size={11} stroke={2.2} />{university}</span>}
        </div>
        {(rating > 0 || item.condition) && (
          <div className="stars">
            {rating > 0 && <><AIcon name="star" size={13} stroke={1.5} /><b>{rating}</b></>}
            {item.condition && <span>{rating > 0 ? "· " : ""}{item.condition}</span>}
          </div>
        )}
        <div className="price"><b>₵{itemPrice.toLocaleString()}</b><span>≈ ${usdPrice.toFixed(2)}</span></div>
        <button type="button" className="add" onClick={onAddToCart}><AIcon name="cart" size={16} />Add to cart</button>
      </div>
    </article>
  )
}

export default ProductCard
