import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { addToCart, addGuestItem } from "../store/slices/cartSlice.js";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.user);
  const { products: cartProducts } = useSelector((state) => state.cart);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 1800);
    return () => clearTimeout(timer);
  }, [feedback]);

  const variants = product.variants || [];
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const uniqueColors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const hasDiscount = product.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (totalStock === 0) return;

    // if there's more than one color/size option, send them to the detail page to choose
    const inStockVariants = variants.filter((v) => v.stock > 0);
    if (inStockVariants.length > 1) {
      navigate(`/product/${product._id}`);
      return;
    }

    const variant = inStockVariants[0];
    if (!variant) return;

    if (isAuthenticated) {
      const result = await dispatch(addToCart({ productId: product._id, variantId: variant._id }));
      if (result.error) setFeedback(result.payload || "Out of stock");
      else setFeedback("Added ✓");
    } else {
      const existingQty =
        cartProducts.find(
          (item) => item.productId?._id === product._id && item.variantId === variant._id
        )?.quantity || 0;
      if (existingQty + 1 > variant.stock) {
        setFeedback(`Only ${variant.stock} left`);
        return;
      }
      dispatch(
        addGuestItem({
          product,
          variantId: variant._id,
          color: variant.color,
          size: variant.size,
          maxStock: variant.stock,
        })
      );
      setFeedback("Added ✓");
    }
  };

  return (
    <Link
      to={`/product/${product._id}`}
      className="group block bg-surface border border-[rgba(244,241,234,0.12)] rounded-2xl p-3.5 transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald/70 hover:shadow-[0_12px_30px_rgba(16,185,129,0.08)]"
    >
      <div className="relative h-52 rounded-xl mb-3.5 overflow-hidden bg-linear-to-br from-[#1a2926] to-[#111917]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-paper/20 text-xs tracking-wider">
            [ image ]
          </div>
        )}

        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 bg-gold text-ink text-[11px] font-bold px-2.5 py-1 rounded-full">
            -{product.discount}%
          </span>
        )}
        {totalStock > 0 && totalStock <= 5 && (
          <span className="absolute top-2.5 right-2.5 bg-ink/85 border border-gold/50 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full">
            Low stock
          </span>
        )}
        {totalStock === 0 && (
          <span className="absolute inset-0 bg-ink/75 flex items-center justify-center text-xs tracking-widest font-bold text-paper/80">
            SOLD OUT
          </span>
        )}
      </div>

      <h3 className="text-[15px] font-medium mb-1 truncate group-hover:text-emerald transition-colors">
        {product.name}
      </h3>

      <p className="text-[11px] text-paper/45 mb-2.5 truncate">
        {product.fabric}{product.gsm ? ` • ${product.gsm} GSM` : ""}
      </p>

      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[15px] text-paper">
          {hasDiscount && (
            <span className="line-through opacity-40 text-xs mr-1.5">₹{product.price}</span>
          )}
          ₹{finalPrice}
        </div>
        {uniqueColors.length > 0 && (
          <span className="text-[11px] text-paper/45">
            {uniqueColors.length} {uniqueColors.length === 1 ? "color" : "colors"}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={totalStock === 0}
        className="w-full py-2 rounded-full text-xs font-bold tracking-wide bg-paper text-ink transition-colors hover:bg-emerald disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {totalStock === 0 ? "OUT OF STOCK" : feedback || "ADD TO CART"}
      </button>
    </Link>
  );
};

export default ProductCard;
