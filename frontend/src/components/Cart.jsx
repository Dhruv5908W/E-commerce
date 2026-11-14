import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus } from "lucide-react";
import {
  fetchCart,
  addToCart,
  removeFromCart,
  decreaseCartQuantity,
  addGuestItem,
  removeGuestItem,
  decreaseGuestItem,
  unitPriceOf,
} from "../store/slices/cartSlice.js";

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, totalPrice, status, error } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.user);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCart());
  }, [dispatch, isAuthenticated]);

  const validProducts = products.filter((item) => item.productId && item.productId._id);
  const isInitialLoading = status === "loading" && validProducts.length === 0;
  const isEmpty = status !== "loading" && validProducts.length === 0;

  const increase = (item) => {
    const productId = item.productId._id;
    if (isAuthenticated) {
      dispatch(addToCart({ productId, variantId: item.variantId }));
    } else {
      dispatch(addGuestItem({ product: item.productId, variantId: item.variantId, color: item.color, size: item.size }));
    }
  };

  const decrease = (item) => {
    const productId = item.productId._id;
    if (isAuthenticated) {
      dispatch(decreaseCartQuantity({ productId, variantId: item.variantId }));
    } else {
      dispatch(decreaseGuestItem({ productId, variantId: item.variantId }));
    }
  };

  const remove = (item) => {
    const productId = item.productId._id;
    if (isAuthenticated) {
      dispatch(removeFromCart({ productId, variantId: item.variantId }));
    } else {
      dispatch(removeGuestItem({ productId, variantId: item.variantId }));
    }
  };

  const handleProceed = () => {
    if (validProducts.length === 0) return;
    if (!isAuthenticated) {
      setCheckoutError("Please login using the LOGIN button above to continue to checkout.");
      return;
    }
    navigate("/address");
  };

  return (
    <div className="bg-ink text-paper min-h-screen px-6 md:px-10 py-10">
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className="px-4 py-1.5 rounded-full bg-emerald text-ink text-xs font-bold">1. CART</span>
        <span className="text-paper/30 text-xs">.......</span>
        <span className="px-4 py-1.5 rounded-full border border-[rgba(244,241,234,0.2)] text-paper/50 text-xs">2. ADDRESS</span>
        <span className="text-paper/30 text-xs">.......</span>
        <span className="px-4 py-1.5 rounded-full border border-[rgba(244,241,234,0.2)] text-paper/50 text-xs">3. PAYMENT</span>
      </div>

      {isInitialLoading ? (
        <div className="text-center py-24 text-paper/50 text-sm">Loading your cart...</div>
      ) : isEmpty ? (
        <div className="text-center py-24">
          <p className="text-paper/55 mb-6">Your cart is empty.</p>
          <Link to="/" className="inline-block bg-emerald text-ink px-6 py-3 rounded-full text-sm font-bold hover:bg-gold transition-colors">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="md:col-span-2 flex flex-col gap-4">
            {error && (
              <p className="text-crimson text-xs bg-surface border border-crimson/40 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            {validProducts.map((item) => {
              const unitPrice = unitPriceOf(item.productId);
              const hasDiscount = item.productId.discount > 0;
              return (
                <div key={`${item.productId._id}-${item.variantId}`} className="flex gap-4 bg-surface border border-[rgba(244,241,234,0.12)] rounded-2xl p-4">
                  <Link to={`/product/${item.productId._id}`} className="shrink-0">
                    <img
                      src={item.productId.imageUrl}
                      alt={item.productId.name}
                      className="w-28 h-28 rounded-xl object-cover"
                    />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link to={`/product/${item.productId._id}`} className="font-medium mb-1 block hover:text-emerald transition-colors">
                        {item.productId.name}
                      </Link>
                      <p className="text-xs text-paper/50 capitalize mb-1">{item.color} • {item.size}</p>
                      <p className="font-mono text-sm text-paper/85">
                        {hasDiscount && (
                          <span className="line-through opacity-40 text-xs mr-1.5">₹{item.productId.price}</span>
                        )}
                        ₹{unitPrice}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => decrease(item)}
                        className="w-7 h-7 rounded-full border border-[rgba(244,241,234,0.2)] flex items-center justify-center hover:border-emerald"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-mono text-sm w-4 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => increase(item)}
                        className="w-7 h-7 rounded-full border border-[rgba(244,241,234,0.2)] flex items-center justify-center hover:border-emerald"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="self-start w-9 h-9 rounded-full bg-paper flex items-center justify-center hover:bg-crimson transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} className="text-ink" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-surface border border-[rgba(244,241,234,0.12)] rounded-2xl p-6 h-fit">
            <h2 className="font-display text-xl uppercase mb-5 pb-4 border-b border-[rgba(244,241,234,0.12)]">
              Price details
            </h2>
            <div className="flex justify-between text-sm mb-3 text-paper/70">
              <span>Items ({validProducts.reduce((sum, i) => sum + i.quantity, 0)})</span>
              <span className="font-mono">₹{totalPrice}</span>
            </div>
            <div className="flex justify-between text-sm mb-3 text-paper/70">
              <span>Shipping</span>
              <span className="font-mono text-emerald">FREE</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-4 pt-4 border-t border-[rgba(244,241,234,0.12)]">
              <span>Cart total</span>
              <span className="font-mono text-gold">₹{totalPrice}</span>
            </div>

            {checkoutError && <p className="text-crimson text-xs mt-4">{checkoutError}</p>}

            <button
              type="button"
              onClick={handleProceed}
              disabled={validProducts.length === 0}
              className="w-full mt-6 bg-emerald text-ink font-bold py-3 rounded-full hover:bg-gold transition-colors disabled:opacity-40"
            >
              {isAuthenticated ? "Proceed to address" : "Login to checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
