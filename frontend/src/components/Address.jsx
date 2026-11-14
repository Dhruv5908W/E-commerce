import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosClient.js";

const emptyForm = {
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  district: "",
};

const Address = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadAddresses = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/addresses");
      setAddresses(data.data);
      const defaultAddr = data.data.find((a) => a.isDefault) || data.data[0];
      setSelectedId(defaultAddr?._id || null);
      if (data.data.length === 0) setShowForm(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load saved addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/addresses", form);
      setAddresses((prev) => [...prev, data.data]);
      setSelectedId(data.data._id);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    setError("");
    try {
      await api.patch(`/addresses/${addressId}/default`);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a._id === addressId })));
      setSelectedId(addressId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update default address");
    }
  };

  const handleDeleteAddress = async (addressId) => {
    setError("");
    try {
      await api.delete(`/addresses/${addressId}`);
      await loadAddresses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete address");
    }
  };

  const handleContinue = () => {
    if (!selectedId) {
      setError("Select or add an address to continue");
      return;
    }
    navigate("/payment", { state: { addressId: selectedId } });
  };

  return (
    <div className="bg-ink text-paper min-h-screen px-6 md:px-10 py-10">
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className="px-4 py-1.5 rounded-full border border-[rgba(244,241,234,0.2)] text-paper/50 text-xs">1. CART</span>
        <span className="text-paper/30 text-xs">.......</span>
        <span className="px-4 py-1.5 rounded-full bg-emerald text-ink text-xs font-bold">2. ADDRESS</span>
        <span className="text-paper/30 text-xs">.......</span>
        <span className="px-4 py-1.5 rounded-full border border-[rgba(244,241,234,0.2)] text-paper/50 text-xs">3. PAYMENT</span>
      </div>

      <div className="max-w-2xl mx-auto">
        <h2 className="font-display text-2xl uppercase mb-5">Deliver to</h2>

        {loading && <p className="text-paper/50 text-sm mb-4">Loading addresses...</p>}

        <div className="flex flex-col gap-3 mb-6">
          {addresses.map((addr) => (
            <label
              key={addr._id}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                selectedId === addr._id ? "border-emerald bg-surface" : "border-[rgba(244,241,234,0.14)]"
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={selectedId === addr._id}
                onChange={() => setSelectedId(addr._id)}
                className="mt-1 accent-emerald"
              />
              <div className="text-sm flex-1">
                <p>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}</p>
                <p className="text-paper/60">{addr.district}, {addr.city}, {addr.state} - {addr.pincode}</p>
                <p className="text-paper/60">{addr.country} • {addr.phoneNumber}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs">
                  {addr.isDefault ? (
                    <span className="text-gold font-medium">Default</span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleSetDefault(addr._id); }}
                      className="text-paper/55 underline hover:text-emerald"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleDeleteAddress(addr._id); }}
                    className="text-paper/45 underline hover:text-crimson"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </label>
          ))}
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs underline underline-offset-2 text-gold hover:text-emerald mb-6 block"
          >
            + Add a new address
          </button>
        )}

        {showForm && (
          <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-3 bg-surface border border-[rgba(244,241,234,0.14)] rounded-2xl p-5 mb-6">
            <input name="phoneNumber" type="tel" inputMode="numeric" placeholder="Phone number" value={form.phoneNumber} onChange={handleChange} required className="col-span-2 bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="addressLine1" placeholder="Address line 1" value={form.addressLine1} onChange={handleChange} required className="col-span-2 bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="addressLine2" placeholder="Address line 2 (optional)" value={form.addressLine2} onChange={handleChange} className="col-span-2 bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="district" placeholder="District" value={form.district} onChange={handleChange} required className="bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="city" placeholder="City" value={form.city} onChange={handleChange} required className="bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="state" placeholder="State" value={form.state} onChange={handleChange} required className="bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="pincode" type="text" inputMode="numeric" placeholder="Pincode" value={form.pincode} onChange={handleChange} required className="bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />
            <input name="country" placeholder="Country" value={form.country} onChange={handleChange} required className="col-span-2 bg-ink border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-sm outline-none focus:border-emerald" />

            <div className="col-span-2 flex gap-3 mt-1">
              <button type="submit" disabled={saving} className="flex-1 bg-paper text-ink font-bold text-sm py-2.5 rounded-lg hover:bg-emerald transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save address"}
              </button>
              {addresses.length > 0 && (
                <button type="button" onClick={() => setShowForm(false)} className="px-5 text-xs text-paper/60 underline">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {error && <p className="text-crimson text-xs mb-4">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full bg-emerald text-ink font-bold py-3 rounded-full hover:bg-gold transition-colors"
        >
          Proceed to payment
        </button>
      </div>
    </div>
  );
};

export default Address;
