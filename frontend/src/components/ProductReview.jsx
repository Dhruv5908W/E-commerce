import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import api from "../api/axiosClient.js";
import { addToCart, addGuestItem } from "../store/slices/cartSlice.js";
import ProductCard from "./ProductCart.jsx";

const ProductReview = () => {
  const { productId } = useParams();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.user);
  const { products: cartProducts } = useSelector((state) => state.cart);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [actionError, setActionError] = useState("");
  const [relatedProducts, setRelatedProducts] = useState([]);
  const addedTimerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProduct = async () => {
      setLoading(true);
      setError("");
      setActionError("");
      setProduct(null);
      setSelectedColor(null);
      setSelectedSize(null);
      setAdded(false);
      setRelatedProducts([]);
      window.scrollTo(0, 0);

      try {
        const { data } = await api.get(`/products/${productId}`, { signal: controller.signal });
        const loaded = data.data;
        setProduct(loaded);
        const firstInStock = loaded.variants?.find((v) => v.stock > 0);
        setSelectedColor(firstInStock?.color || loaded.variants?.[0]?.color || null);

        if (loaded.category?._id) {
          try {
            const related = await api.get("/products", {
              params: { category: loaded.category._id, limit: 8 },
              signal: controller.signal,
            });
            setRelatedProducts(
              related.data.data.products.filter((p) => p._id !== productId)
            );
          } catch {
            // related products are a nice-to-have, don't block the page on failure
          }
        }
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          setError(err.response?.data?.message || "Product not found");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      controller.abort();
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, [productId]);

  const colors = useMemo(
    () => (product ? [...new Set((product.variants || []).map((v) => v.color))] : []),
    [product]
  );

  const sizesForSelectedColor = useMemo(
    () => (product ? (product.variants || []).filter((v) => v.color === selectedColor) : []),
    [product, selectedColor]
  );

  const selectedVariant = useMemo(
    () => sizesForSelectedColor.find((v) => v.size === selectedSize),
    [sizesForSelectedColor, selectedSize]
  );

  const handleColorChange = (color) => {
    setSelectedColor(color);
    setSelectedSize(null);
    setActionError("");
  };

  const handleAddToCart = async () => {
    setActionError("");
    if (!selectedVariant) {
      setActionError("Please select a color and size");
      return;
    }
    if (selectedVariant.stock === 0) return;

    setAdding(true);
    if (isAuthenticated) {
      const result = await dispatch(
        addToCart({ productId, variantId: selectedVariant._id })
      );
      if (result.error) {
        setActionError(result.payload || "Failed to add to cart");
      } else {
        setAdded(true);
        if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
        addedTimerRef.current = setTimeout(() => setAdded(false), 2500);
      }
    } else {
      const existingQty =
        cartProducts.find(
          (item) => item.productId?._id === product._id && item.variantId === selectedVariant._id
        )?.quantity || 0;
      if (existingQty + 1 > selectedVariant.stock) {
        setActionError(`Only ${selectedVariant.stock} left in stock for this color/size`);
        setAdding(false);
        return;
      }

      dispatch(
        addGuestItem({
          product,
          variantId: selectedVariant._id,
          color: selectedVariant.color,
          size: selectedVariant.size,
          maxStock: selectedVariant.stock,
        })
      );
      setAdded(true);
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
      addedTimerRef.current = setTimeout(() => setAdded(false), 2500);
    }
    setAdding(false);
  };

  if (loading) {
    return <div className="bg-ink min-h-screen flex items-center justify-center text-sm text-paper/50">Loading...</div>;
  }
  if (error || !product) {
    return <div className="bg-ink min-h-screen flex items-center justify-center text-sm text-crimson">{error || "Product not found"}</div>;
  }

  const hasDiscount = product.discount > 0;
  const finalPrice = hasDiscount
    ? Math.round(product.price - (product.price * product.discount) / 100)
    : product.price;

  return (
    <div className="bg-ink text-paper min-h-screen px-6 md:px-10 py-10">
      <div className="max-w-5xl mx-auto mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-paper/60 hover:text-emerald transition-colors"
        >
          <ArrowLeft size={14} /> Back to collection
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden bg-surface border border-[rgba(244,241,234,0.14)] h-105">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          {hasDiscount && (
            <span className="absolute top-4 left-4 bg-gold text-ink text-xs font-bold px-3 py-1 rounded-full">
              SAVE {product.discount}%
            </span>
          )}
        </div>

        <div>
          {product.category?.name && (
            <Link
              to={`/?category=${product.category._id}`}
              className="inline-block text-[11px] tracking-widest text-gold uppercase border border-gold/30 rounded-full px-3 py-1 mb-3 hover:bg-gold hover:text-ink transition-colors"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="font-display text-3xl md:text-4xl uppercase mb-3">{product.name}</h1>

          <div className="flex items-baseline gap-3 mb-4">
            <div className="font-mono text-2xl text-paper">
              {hasDiscount && <span className="line-through opacity-40 text-base mr-2">₹{product.price}</span>}
              ₹{finalPrice}
            </div>
            {hasDiscount && <span className="text-emerald text-xs font-bold">{product.discount}% off</span>}
          </div>

          <p className="text-paper/65 text-sm leading-relaxed mb-6">{product.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            <div className="bg-surface border border-[rgba(244,241,234,0.1)] rounded-xl p-3">
              <p className="text-paper/45 text-[11px] uppercase tracking-wider mb-1">Fabric</p>
              <p className="font-medium">{product.fabric}</p>
            </div>
            <div className="bg-surface border border-[rgba(244,241,234,0.1)] rounded-xl p-3">
              <p className="text-paper/45 text-[11px] uppercase tracking-wider mb-1">Weight (GSM)</p>
              <p className="font-mono font-medium">{product.gsm} GSM</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-paper/50 text-xs mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`px-4 py-2 rounded-full text-xs capitalize border transition-colors ${
                    selectedColor === color
                      ? "bg-emerald text-ink border-emerald font-bold"
                      : "border-[rgba(244,241,234,0.2)] hover:border-gold"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-paper/50 text-xs mb-2">Size</p>
            <div className="flex gap-2 flex-wrap">
              {sizesForSelectedColor.map((v) => (
                <button
                  type="button"
                  key={v._id || v.size}
                  onClick={() => { setSelectedSize(v.size); setActionError(""); }}
                  disabled={v.stock === 0}
                  className={`w-11 h-11 rounded-full text-xs border transition-colors ${
                    selectedSize === v.size
                      ? "bg-emerald text-ink border-emerald font-bold"
                      : "border-[rgba(244,241,234,0.2)] hover:border-gold"
                  } ${v.stock === 0 ? "opacity-25 cursor-not-allowed line-through" : ""}`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span
              className={`inline-block text-xs font-medium px-3 py-1 rounded-full border ${
                selectedVariant
                  ? selectedVariant.stock > 0
                    ? "text-emerald border-emerald/35 bg-emerald/10"
                    : "text-crimson border-crimson/35 bg-crimson/10"
                  : "text-gold border-gold/30 bg-gold/10"
              }`}
            >
              {selectedVariant
                ? selectedVariant.stock > 0
                  ? `${selectedVariant.stock} in stock`
                  : "Out of stock in this size"
                : "Select a color and size"}
            </span>
          </div>

          {actionError && <p className="text-crimson text-xs mb-4">{actionError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock === 0 || adding}
              className="flex-1 bg-emerald text-ink font-bold py-3.5 rounded-full hover:bg-gold transition-colors disabled:opacity-40"
            >
              {adding ? "Adding..." : added ? "Added to cart ✓" : "Add to cart"}
            </button>
            {added && (
              <Link
                to="/cart"
                className="px-6 py-3.5 rounded-full border border-gold text-gold text-sm font-bold hover:bg-gold hover:text-ink transition-colors flex items-center"
              >
                View cart
              </Link>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-[rgba(244,241,234,0.1)] grid grid-cols-3 gap-2 text-[11px] text-paper/55">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald shrink-0" /> Pre-shrunk
            </div>
            <div className="flex items-center gap-1.5">
              <Truck size={14} className="text-gold shrink-0" /> 24h dispatch
            </div>
            <div className="flex items-center gap-1.5">
              <RefreshCw size={14} className="text-emerald shrink-0" /> 7-day return
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="max-w-5xl mx-auto mt-16 pt-10 border-t border-[rgba(244,241,234,0.14)]">
          <h2 className="font-display text-2xl uppercase mb-6">You might also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductReview;
