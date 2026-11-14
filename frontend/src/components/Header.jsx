import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ShoppingCart, X, ChevronDown, Search, Menu } from "lucide-react";
import { loginUser, registerUser, logoutUser, clearUserError } from "../store/slices/userSlice.js";
import { mergeGuestCartIntoAccount } from "../store/slices/cartSlice.js";

const EMPTY_FORM = { identifier: "", name: "", email: "", password: "", phonenumber: "" };

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, status, error } = useSelector((state) => state.user);
  const { products } = useSelector((state) => state.cart);
  const { items: categories } = useSelector((state) => state.categories);
  const cartCount = products.reduce((sum, item) => sum + item.quantity, 0);

  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY_FORM);
  const [authNotice, setAuthNotice] = useState("");

  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openAuthModal = () => {
    dispatch(clearUserError());
    setAuthNotice("");
    setAuthOpen(true);
  };

  const closeAuthModal = () => {
    setAuthOpen(false);
    setAuthNotice("");
    dispatch(clearUserError());
  };

  const toggleAuthMode = () => {
    dispatch(clearUserError());
    setAuthNotice("");
    setForm((prev) => ({ ...prev, password: "" }));
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchValue.trim();
    navigate(trimmed ? `/?keyword=${encodeURIComponent(trimmed)}` : "/");
    setSearchValue("");
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthNotice("");

    if (mode === "login") {
      const id = form.identifier.trim();
      const result = await dispatch(loginUser({ name: id, email: id, password: form.password }));
      if (!result.error) {
        await dispatch(mergeGuestCartIntoAccount());
        setForm(EMPTY_FORM);
        closeAuthModal();
      }
      return;
    }

    const result = await dispatch(
      registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        phonenumber: form.phonenumber,
      })
    );
    if (!result.error) {
      setMode("login");
      setForm((prev) => ({
        ...EMPTY_FORM,
        identifier: prev.email || prev.name,
      }));
      setAuthNotice("Account created! Please log in.");
    }
  };

  return (
    <>
      <div className="bg-emerald text-ink overflow-hidden whitespace-nowrap border-b border-ink">
        <div className="inline-block py-2 text-xs font-bold tracking-widest animate-[scroll_22s_linear_infinite]">
          {Array(6).fill("COMPLIMENTARY SHIPPING OVER ₹999  ✦  MEN'S & UNISEX APPAREL  ✦  URBAN LOOM '26  ✦  ").join("")}
        </div>
      </div>

      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-10 py-4 bg-ink/85 backdrop-blur-md border-b border-[rgba(244,241,234,0.12)]">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden text-paper"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/urban-loom.svg" alt="" className="w-7 h-7 rounded-md" />
            <span className="font-display text-lg tracking-wider text-paper group-hover:text-gold transition-colors">
              URBAN LOOM
            </span>
          </Link>
        </div>

        <ul className="hidden md:flex items-center gap-8 text-paper">
          <li
            className="relative"
            onMouseEnter={() => setShopMenuOpen(true)}
            onMouseLeave={() => setShopMenuOpen(false)}
          >
            <button type="button" className="flex items-center gap-1 text-xs tracking-wider text-paper/70 hover:text-emerald transition-colors">
              SHOP <ChevronDown size={13} />
            </button>
            {shopMenuOpen && (
              <div className="absolute top-full left-0 pt-3 w-48">
                <div className="bg-surface border border-[rgba(244,241,234,0.14)] rounded-xl py-2 shadow-xl">
                  <Link
                    to="/"
                    onClick={() => setShopMenuOpen(false)}
                    className="block px-4 py-2 text-xs text-paper/75 hover:text-emerald hover:bg-ink transition-colors"
                  >
                    All products
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/?category=${cat._id}`}
                      onClick={() => setShopMenuOpen(false)}
                      className="block px-4 py-2 text-xs text-paper/75 hover:text-emerald hover:bg-ink transition-colors capitalize"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </li>
          <li>
            <Link to="/?sort=newest" className="text-xs tracking-wider text-paper/70 hover:text-emerald transition-colors">
              NEW ARRIVALS
            </Link>
          </li>
          <li>
            <Link to="/info/about" className="text-xs tracking-wider text-paper/70 hover:text-gold transition-colors">
              OUR STORY
            </Link>
          </li>
          {isAuthenticated && currentUser?.role === "admin" && (
            <li>
              <Link to="/admin" className="text-xs tracking-wider text-gold font-bold hover:text-emerald transition-colors">
                ADMIN
              </Link>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-4">
          <div className="hidden md:block relative">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onBlur={() => !searchValue && setSearchOpen(false)}
                  placeholder="Search apparel..."
                  className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-full text-xs px-4 py-2 w-48 outline-none focus:border-emerald text-paper"
                />
              </form>
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} className="text-paper hover:text-emerald transition-colors" aria-label="Search">
                <Search size={19} />
              </button>
            )}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3 text-paper text-xs">
              <span className="hidden sm:inline text-gold">Hi, {currentUser?.name}</span>
              <Link to="/orders" className="underline underline-offset-2 hover:text-emerald">
                My orders
              </Link>
              <button type="button" onClick={() => dispatch(logoutUser())} className="underline underline-offset-2 hover:text-emerald">
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              className="border border-paper/80 text-paper text-xs tracking-wide px-5 py-2 rounded-full hover:bg-emerald hover:border-emerald hover:text-ink font-medium transition-colors"
            >
              LOGIN
            </button>
          )}

          <Link to="/cart" className="relative w-10 h-10 rounded-full bg-paper flex items-center justify-center hover:bg-gold transition-colors">
            <ShoppingCart className="w-5 h-5 text-ink" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald text-ink text-[10px] font-bold flex items-center justify-center border border-ink">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-ink border-b border-[rgba(244,241,234,0.14)] px-6 py-5 flex flex-col gap-4">
          <form onSubmit={handleSearchSubmit}>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search apparel..."
              className="w-full bg-surface border border-[rgba(244,241,234,0.2)] rounded-full text-sm px-4 py-2.5 outline-none focus:border-emerald text-paper"
            />
          </form>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-paper/80 tracking-wide"
          >
            All products
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/?category=${cat._id}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-paper/80 tracking-wide capitalize"
            >
              {cat.name}
            </Link>
          ))}
          <Link
            to="/?sort=newest"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-paper/80 tracking-wide"
          >
            New arrivals
          </Link>
          <Link
            to="/info/about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm text-gold tracking-wide"
          >
            Our story
          </Link>
          {isAuthenticated && currentUser?.role === "admin" && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-emerald tracking-wide font-bold"
            >
              Admin panel
            </Link>
          )}
        </div>
      )}

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-xs" onClick={closeAuthModal} />
          <div className="relative bg-surface border border-[rgba(244,241,234,0.16)] w-full max-w-sm rounded-2xl p-7 text-paper mx-4 shadow-2xl">
            <button type="button" onClick={closeAuthModal} className="absolute top-4 right-4 text-paper/50 hover:text-paper">
              <X size={18} />
            </button>
            <h2 className="font-display text-2xl uppercase mb-5 text-paper">
              {mode === "login" ? "Welcome back" : "Join Urban Loom"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "login" ? (
                <input
                  name="identifier"
                  placeholder="Email or username"
                  value={form.identifier}
                  onChange={handleChange}
                  className="w-full bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald"
                  required
                />
              ) : (
                <>
                  <input
                    name="phonenumber"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Phone number"
                    value={form.phonenumber}
                    onChange={handleChange}
                    className="w-full bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald"
                    required
                  />
                  <input
                    name="name"
                    placeholder="Username"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald"
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald"
                    required
                  />
                </>
              )}
              <input
                name="password"
                type="password"
                placeholder="Password"
                minLength={mode === "register" ? 6 : undefined}
                value={form.password}
                onChange={handleChange}
                className="w-full bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald"
                required
              />

              {authNotice && <p className="text-emerald text-xs">{authNotice}</p>}
              {error && <p className="text-crimson text-xs">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-emerald text-ink font-bold text-sm py-2.5 rounded-lg hover:bg-gold transition-colors disabled:opacity-50"
              >
                {status === "loading" ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
              </button>
            </form>

            <p className="text-xs text-paper/55 mt-4 text-center">
              {mode === "login" ? "New to Urban Loom?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={toggleAuthMode}
                className="text-gold underline underline-offset-2"
              >
                {mode === "login" ? "Sign up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
