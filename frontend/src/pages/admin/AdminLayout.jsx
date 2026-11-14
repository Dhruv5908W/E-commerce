import { NavLink, Outlet, Link } from "react-router-dom";

const links = [
  { to: "/admin/products", label: "Products" },
  { to: "/admin/upload", label: "Upload product" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
];

const AdminLayout = () => {
  return (
    <div className="bg-ink text-paper min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden border-b border-[rgba(244,241,234,0.14)] px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gold tracking-widest font-bold">URBAN LOOM ADMIN</span>
          <Link to="/" className="font-display text-xs tracking-wide text-paper/70 hover:text-emerald">
            ← BACK TO SITE
          </Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto no-scrollbar">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive ? "bg-emerald text-ink font-bold" : "text-paper/70 bg-surface"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <aside className="w-56 shrink-0 border-r border-[rgba(244,241,234,0.14)] px-5 py-8 hidden md:block">
        <Link to="/" className="font-display text-sm tracking-wide block mb-8 text-paper/60 hover:text-emerald">
          ← BACK TO SITE
        </Link>
        <p className="text-xs text-gold tracking-widest font-bold mb-4">URBAN LOOM ADMIN</p>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-emerald text-ink font-bold" : "text-paper/70 hover:bg-surface"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-6 md:px-10 py-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
