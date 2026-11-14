import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, Sparkles, Layers, Truck } from "lucide-react";
import api from "../api/axiosClient.js";
import ProductCard from "../components/ProductCart.jsx";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "priceLow", label: "Price: Low to High" },
  { value: "priceHigh", label: "Price: High to Low" },
];

const Home = () => {
  const { items: categories } = useSelector((state) => state.categories);
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get("category") || "all";
  const keyword = searchParams.get("keyword") || "";
  const sort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  // draft values for the price inputs so typing doesn't refetch on every keystroke -
  // only committed to the URL (and re-synced here if changed elsewhere) on "Apply"
  const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);
  useEffect(() => {
    setMinPriceDraft(minPrice);
    setMaxPriceDraft(maxPrice);
  }, [minPrice, maxPrice]);

  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // whenever any actual filter (not pagination) changes, reset back to page 1.
  // this runs DURING render (React's documented pattern for "adjusting state when
  // a prop/derived value changes") rather than in a useEffect, so the reset and the
  // isLoading flip land in the exact same commit - no frame is ever painted with
  // "products: []" and "isLoading: false" at the same time, which is what caused
  // the old flash of "no products found" when switching categories.
  const filterKey = `${activeCategory}|${keyword}|${sort}|${minPrice}|${maxPrice}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(true);
    setFetchError("");
  }

  const updateFilters = (updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      });
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setIsLoading(true);
      setFetchError("");
      try {
        const params = { page, limit: 12 };
        if (activeCategory !== "all") params.category = activeCategory;
        if (keyword) params.keyword = keyword;
        if (sort !== "newest") params.sort = sort;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;

        const { data } = await api.get("/products", { params, signal: controller.signal });
        const incoming = data.data.products || [];
        setTotalProducts(data.data.totalProducts ?? incoming.length);
        setProducts((prev) => {
          if (page === 1) return incoming;
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...incoming.filter((p) => !seen.has(p._id))];
        });
        setHasMore(Boolean(data.data.hasMore));
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          setFetchError(err.response?.data?.message || "Failed to load products");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [page, activeCategory, keyword, sort, minPrice, maxPrice, reloadNonce]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !fetchError) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, fetchError]);

  const handlePriceSubmit = (e) => {
    e.preventDefault();
    updateFilters({ minPrice: minPriceDraft, maxPrice: maxPriceDraft });
  };

  const scrollToCatalog = () => {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-ink text-paper min-h-screen">
      <section className="relative overflow-hidden px-6 md:px-10 pt-14 pb-14 border-b border-[rgba(244,241,234,0.12)]">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-gold/30 text-gold text-[11px] font-bold tracking-widest mb-6">
            <Sparkles size={12} /> AUTUMN / WINTER &apos;26 • MEN&apos;S &amp; UNISEX
          </div>

          <h1 className="font-display uppercase leading-[0.94] text-[12vw] md:text-7xl tracking-tight">
            Tailored for<br />
            <span className="text-emerald">every</span>{" "}
            <span className="text-gold">urban move.</span>
          </h1>

          <p className="mt-5 max-w-lg text-paper/70 text-sm md:text-base leading-relaxed">
            Urban Loom crafts men&apos;s and unisex everyday essentials — heavyweight fabrics, clean tailored drapes, and small-batch finishes built to outlast trends.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-2 bg-emerald text-ink font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-full hover:bg-gold transition-colors"
            >
              Explore collection <ArrowRight size={15} />
            </button>
            <Link
              to="/?sort=newest"
              className="inline-flex items-center gap-2 border border-[rgba(244,241,234,0.22)] text-paper text-xs tracking-wider uppercase px-6 py-3.5 rounded-full hover:border-gold hover:text-gold transition-colors"
            >
              New arrivals
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-[rgba(244,241,234,0.1)] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-surface/70 border border-[rgba(244,241,234,0.08)] rounded-xl px-4 py-3">
              <Layers size={18} className="text-emerald shrink-0" />
              <div>
                <p className="text-xs font-bold text-paper">240+ GSM Fabrics</p>
                <p className="text-[11px] text-paper/50">Combed cottons &amp; structured twills</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface/70 border border-[rgba(244,241,234,0.08)] rounded-xl px-4 py-3">
              <Sparkles size={18} className="text-gold shrink-0" />
              <div>
                <p className="text-xs font-bold text-paper">Men&apos;s &amp; Unisex Cuts</p>
                <p className="text-[11px] text-paper/50">Relaxed, boxy &amp; tailored silhouettes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface/70 border border-[rgba(244,241,234,0.08)] rounded-xl px-4 py-3">
              <Truck size={18} className="text-emerald shrink-0" />
              <div>
                <p className="text-xs font-bold text-paper">Free Shipping ₹999+</p>
                <p className="text-[11px] text-paper/50">COD &amp; instant online checkout</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="catalog" className="px-6 md:px-10 py-8 flex flex-col gap-5 max-w-6xl mx-auto">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => updateFilters({ category: "all" })}
            className={`shrink-0 px-6 py-2.5 rounded-full text-xs tracking-wider font-medium border transition-colors ${
              activeCategory === "all"
                ? "bg-emerald text-ink border-emerald font-bold"
                : "border-[rgba(244,241,234,0.16)] hover:border-gold"
            }`}
          >
            ALL
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat._id}
              onClick={() => updateFilters({ category: cat._id })}
              className={`shrink-0 px-6 py-2.5 rounded-full text-xs tracking-wider uppercase font-medium border transition-colors ${
                activeCategory === cat._id
                  ? "bg-emerald text-ink border-emerald font-bold"
                  : "border-[rgba(244,241,234,0.16)] hover:border-gold"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-full text-xs px-4 py-2.5 outline-none focus:border-emerald"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <form onSubmit={handlePriceSubmit} className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Min ₹"
              value={minPriceDraft}
              onChange={(e) => setMinPriceDraft(e.target.value)}
              className="w-24 bg-surface border border-[rgba(244,241,234,0.2)] rounded-full text-xs px-4 py-2.5 outline-none focus:border-emerald font-mono"
            />
            <span className="text-paper/30 text-xs">–</span>
            <input
              type="number"
              min="0"
              placeholder="Max ₹"
              value={maxPriceDraft}
              onChange={(e) => setMaxPriceDraft(e.target.value)}
              className="w-24 bg-surface border border-[rgba(244,241,234,0.2)] rounded-full text-xs px-4 py-2.5 outline-none focus:border-emerald font-mono"
            />
            <button
              type="submit"
              className="text-xs font-bold tracking-wide px-4 py-2.5 rounded-full bg-gold text-ink hover:bg-emerald transition-colors"
            >
              Apply
            </button>
          </form>

          {(keyword || minPrice || maxPrice || sort !== "newest" || activeCategory !== "all") && (
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
              className="text-xs text-paper/55 underline underline-offset-2 hover:text-gold"
            >
              Clear all filters
            </button>
          )}
        </div>

        {keyword && (
          <p className="text-xs text-paper/55">
            Showing results for <span className="text-gold font-medium">"{keyword}"</span>
          </p>
        )}
      </section>

      <section className="px-6 md:px-10 pb-20 max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8 border-b border-[rgba(244,241,234,0.12)] pb-5">
          <div>
            <span className="text-[11px] tracking-widest text-gold uppercase">Curated Drop</span>
            <h2 className="font-display text-3xl uppercase">Fresh in</h2>
          </div>
          <span className="text-xs text-paper/55 tracking-wide font-mono">
            {products.length}{totalProducts > products.length ? ` / ${totalProducts}` : ""} items
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>

        {fetchError && (
          <div className="text-center py-12">
            <p className="text-crimson text-sm mb-3">{fetchError}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="text-xs font-bold px-5 py-2 rounded-full bg-emerald text-ink hover:bg-gold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !fetchError && products.length === 0 && (
          <p className="text-center text-paper/45 py-16 text-sm">No products found. Try different filters.</p>
        )}

        {isLoading && (
          <p className="text-center text-paper/45 py-10 text-sm tracking-wide">Loading collection...</p>
        )}

        <div ref={sentinelRef} className="h-1" />
      </section>
    </div>
  );
};

export default Home;
