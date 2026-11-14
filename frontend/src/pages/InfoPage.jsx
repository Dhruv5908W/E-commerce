import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, MapPin, Clock } from "lucide-react";

const INFO_PAGES = {
  about: {
    eyebrow: "OUR STORY",
    title: "Crafted by Urban Loom",
    lead: "Contemporary men's and unisex apparel built around breathable heavyweight cottons, relaxed tailoring, and enduring everyday staples.",
    sections: [
      {
        heading: "Fabric First Philosophy",
        body: "Every Urban Loom piece starts with fabric weight and hand-feel. From 240+ GSM combed cotton tees to structured twill cargos, we build silhouettes meant to hold their drape wash after wash.",
      },
      {
        heading: "Men's & Unisex Proportions",
        body: "Designed with clean shoulder drops, balanced proportions, and versatile tonal palettes anchored in obsidian, ivory, emerald, and warm gold.",
      },
      {
        heading: "Small-Batch Drops",
        body: "Instead of overproducing seasonal excess, we release focused capsule drops so each garment maintains strict stitching and finishing quality.",
      },
    ],
  },
  contact: {
    eyebrow: "GET IN TOUCH",
    title: "Contact Urban Loom",
    lead: "Questions about sizing, bulk orders, or collaborations? Reach out to our studio team.",
    showContactForm: true,
    sections: [
      {
        heading: "Studio & Support Details",
        body: "Email us at care@urbanloom.store or drop a message using the form below. Our team responds within 24 business hours.",
      },
    ],
  },
  support: {
    eyebrow: "CUSTOMER CARE",
    title: "Customer Support",
    lead: "Need help with an existing order, payment status, or size guidance? We are here Monday to Saturday, 10 AM – 7 PM IST.",
    showContactForm: true,
    sections: [
      {
        heading: "Order Tracking & Cancellations",
        body: "Signed-in shoppers can view live order status and cancel pending orders directly from the My Orders page before dispatch.",
      },
      {
        heading: "Sizing Assistance",
        body: "Prefer an oversized streetwear fit? Take your true size for a relaxed drape or size down once for a closer, tailored look.",
      },
    ],
  },
  shipping: {
    eyebrow: "DELIVERY & RETURNS",
    title: "Shipping & Returns",
    lead: "Complimentary pan-India shipping on orders above ₹999 and hassle-free 7-day exchanges.",
    sections: [
      {
        heading: "Dispatch & Delivery Timelines",
        body: "Orders are quality-checked and dispatched within 24–48 business hours. Metro deliveries typically arrive in 2–4 days; rest of India in 4–7 days.",
      },
      {
        heading: "Cash on Delivery & Online Payments",
        body: "Pay securely via Razorpay (UPI, cards, netbanking) or opt for Cash on Delivery at checkout.",
      },
      {
        heading: "7-Day Returns & Exchanges",
        body: "Unused garments with original tags intact are eligible for size exchange or refund within 7 days of delivery.",
      },
    ],
  },
  faqs: {
    eyebrow: "HELP CENTER",
    title: "Frequently Asked Questions",
    lead: "Quick answers on Urban Loom sizing, garment care, payments, and order management.",
    sections: [
      {
        heading: "Are Urban Loom fits true to size?",
        body: "Our tees and overshirts feature a modern relaxed cut. Check the fabric & GSM notes on each product page for structure details.",
      },
      {
        heading: "How should I wash heavyweight GSM garments?",
        body: "Machine wash cold inside-out on a gentle cycle and line dry in shade to preserve color depth and collar shape.",
      },
      {
        heading: "Can I cancel my order after placing it?",
        body: "Yes — any order still in PENDING status can be cancelled in one click from your My Orders page, automatically restoring variant stock.",
      },
    ],
  },
  terms: {
    eyebrow: "LEGAL",
    title: "Terms & Conditions",
    lead: "Guidelines governing orders, pricing, and usage of the Urban Loom storefront.",
    sections: [
      {
        heading: "Orders & Stock Availability",
        body: "All orders are subject to real-time variant stock availability. Prices displayed on product cards include any active percentage discount.",
      },
      {
        heading: "Payments & Cancellations",
        body: "Online payments are processed via Razorpay test/live gateways. Orders may be cancelled prior to dispatch from the My Orders dashboard.",
      },
    ],
  },
  privacy: {
    eyebrow: "LEGAL",
    title: "Privacy Policy",
    lead: "How Urban Loom handles account details, delivery addresses, and order records.",
    sections: [
      {
        heading: "Information We Collect",
        body: "We store only the name, email, phone number, and shipping addresses required to authenticate your session and fulfill your orders.",
      },
      {
        heading: "Security & Cookies",
        body: "Passwords are hashed with bcrypt and sessions use HTTP-only authentication cookies. Payment details are never stored on our servers.",
      },
    ],
  },
};

const NAV_TABS = [
  { slug: "about", label: "About" },
  { slug: "contact", label: "Contact" },
  { slug: "support", label: "Support" },
  { slug: "shipping", label: "Shipping & Returns" },
  { slug: "faqs", label: "FAQs" },
  { slug: "terms", label: "Terms" },
  { slug: "privacy", label: "Privacy" },
];

const InfoPage = () => {
  const { slug } = useParams();
  const page = INFO_PAGES[slug] || INFO_PAGES.about;
  const activeSlug = INFO_PAGES[slug] ? slug : "about";

  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setContactForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="bg-ink text-paper min-h-screen px-6 md:px-10 py-10">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-paper/60 hover:text-emerald transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to collection
        </Link>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-8 border-b border-[rgba(244,241,234,0.12)]">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.slug}
              to={`/info/${tab.slug}`}
              onClick={() => setSubmitted(false)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs tracking-wide border transition-colors ${
                activeSlug === tab.slug
                  ? "bg-emerald text-ink border-emerald font-bold"
                  : "border-[rgba(244,241,234,0.16)] text-paper/70 hover:border-gold hover:text-paper"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <span className="text-xs tracking-widest text-gold font-bold uppercase">{page.eyebrow}</span>
        <h1 className="font-display text-4xl md:text-5xl uppercase mt-2 mb-4">{page.title}</h1>
        <p className="text-paper/70 text-sm md:text-base leading-relaxed max-w-2xl mb-10">{page.lead}</p>

        <div className="grid gap-5">
          {page.sections.map((section) => (
            <div
              key={section.heading}
              className="bg-surface border border-[rgba(244,241,234,0.12)] rounded-2xl p-6"
            >
              <h2 className="font-medium text-base text-paper mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald" />
                {section.heading}
              </h2>
              <p className="text-sm text-paper/65 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {page.showContactForm && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-surface border border-[rgba(244,241,234,0.12)] rounded-2xl p-6 flex flex-col gap-4 text-xs text-paper/70">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-emerald shrink-0 mt-0.5" />
                <div>
                  <p className="text-paper font-medium mb-0.5">Email</p>
                  <p>care@urbanloom.store</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="text-paper font-medium mb-0.5">Studio</p>
                  <p>Bengaluru &amp; New Delhi, India</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-emerald shrink-0 mt-0.5" />
                <div>
                  <p className="text-paper font-medium mb-0.5">Hours</p>
                  <p>Mon – Sat, 10:00 AM – 7:00 PM</p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleContactSubmit}
              className="md:col-span-2 bg-surface border border-[rgba(244,241,234,0.12)] rounded-2xl p-6 flex flex-col gap-3"
            >
              <h3 className="font-display text-xl uppercase mb-1">Send us a note</h3>
              {submitted && (
                <div className="flex items-center gap-2 text-xs text-emerald bg-ink border border-emerald/40 rounded-xl px-4 py-3 mb-1">
                  <CheckCircle2 size={15} />
                  Thanks for reaching out! Our Urban Loom team will reply shortly.
                </div>
              )}
              <input
                placeholder="Your name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
                className="bg-ink border border-[rgba(244,241,234,0.18)] rounded-lg p-3 text-sm outline-none focus:border-emerald"
              />
              <input
                type="email"
                placeholder="Your email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
                className="bg-ink border border-[rgba(244,241,234,0.18)] rounded-lg p-3 text-sm outline-none focus:border-emerald"
              />
              <textarea
                rows={4}
                placeholder="How can we help?"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                required
                className="bg-ink border border-[rgba(244,241,234,0.18)] rounded-lg p-3 text-sm outline-none focus:border-emerald resize-none"
              />
              <button
                type="submit"
                className="bg-emerald text-ink font-bold text-sm py-3 rounded-full hover:bg-gold transition-colors"
              >
                Send message
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPage;
