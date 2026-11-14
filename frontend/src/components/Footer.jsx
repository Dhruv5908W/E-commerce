import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-ink text-paper border-t border-[rgba(244,241,234,0.12)] px-6 md:px-10 py-14">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
            <img src="/urban-loom.svg" alt="" className="w-6 h-6 rounded-md" />
            <span className="font-display text-lg tracking-wider">URBAN LOOM</span>
          </Link>
          <p className="text-paper/55 text-xs leading-relaxed">
            Men's &amp; unisex contemporary apparel crafted with heavyweight fabrics and clean everyday silhouettes.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          <span className="text-gold/80 tracking-wider font-medium mb-1">BRAND</span>
          <Link to="/info/about" className="text-paper/75 hover:text-emerald transition-colors">About us</Link>
          <Link to="/info/contact" className="text-paper/75 hover:text-emerald transition-colors">Contact</Link>
          <Link to="/?sort=newest" className="text-paper/75 hover:text-emerald transition-colors">New arrivals</Link>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          <span className="text-gold/80 tracking-wider font-medium mb-1">SUPPORT</span>
          <Link to="/info/support" className="text-paper/75 hover:text-emerald transition-colors">Customer support</Link>
          <Link to="/info/shipping" className="text-paper/75 hover:text-emerald transition-colors">Shipping &amp; returns</Link>
          <Link to="/info/faqs" className="text-paper/75 hover:text-emerald transition-colors">FAQs</Link>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          <span className="text-gold/80 tracking-wider font-medium mb-1">POLICIES &amp; ACCOUNT</span>
          <Link to="/info/terms" className="text-paper/75 hover:text-emerald transition-colors">Terms &amp; conditions</Link>
          <Link to="/info/privacy" className="text-paper/75 hover:text-emerald transition-colors">Privacy policy</Link>
          <Link to="/orders" className="text-paper/75 hover:text-emerald transition-colors">Track my orders</Link>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-[rgba(244,241,234,0.08)] text-[11px] text-paper/40 flex flex-wrap gap-2 justify-between">
        <span>© 2026 Urban Loom. All rights reserved.</span>
        <span>Men's &amp; Unisex Apparel • Heavyweight Craft</span>
      </div>
    </footer>
  );
};

export default Footer;
