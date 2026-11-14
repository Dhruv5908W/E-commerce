import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Trash2 } from "lucide-react";
import { fetchCategories } from "../../store/slices/categorySlice.js";
import api from "../../api/axiosClient.js";

const AdminEditProduct = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items: categories } = useSelector((state) => state.categories);

  const [form, setForm] = useState(null);
  const [variants, setVariants] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    dispatch(fetchCategories());
    const loadProduct = async () => {
      try {
        const { data } = await api.get(`/products/${productId}`);
        const p = data.data;
        setForm({
          name: p.name, price: p.price, description: p.description,
          fabric: p.fabric, gsm: p.gsm, discount: p.discount, category: p.category?._id || p.category || "",
        });
        setVariants(p.variants.map((v) => ({ ...v, stock: String(v.stock) })));
        setPreview(p.imageUrl);
      } catch (err) {
        setMessage(err.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [productId, dispatch]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const addVariantRow = () => setVariants((prev) => [...prev, { color: "", size: "", stock: "" }]);
  const removeVariantRow = (index) => setVariants((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const cleanedVariants = variants
      .filter((v) => v.color.trim() && v.size.trim() && v.stock !== "")
      .map((v) => ({ color: v.color.trim(), size: v.size.trim(), stock: Number(v.stock) }));

    if (cleanedVariants.length === 0) {
      setStatus("error");
      setMessage("Add at least one complete color/size/stock variant");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("variants", JSON.stringify(cleanedVariants));
    if (imageFile) formData.append("imageUrl", imageFile);

    try {
      await api.patch(`/products/${productId}`, formData);
      setStatus("success");
      setMessage("Product updated successfully");
      setTimeout(() => navigate("/admin/products"), 800);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || "Failed to update product");
    }
  };

  if (loading) return <p className="text-paper/50 text-sm">Loading...</p>;
  if (!form) return <p className="text-crimson text-sm">{message}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl uppercase mb-6">Edit product</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="text-xs text-paper/55 block mb-2">Product image</label>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 rounded-xl bg-surface border border-[rgba(244,241,234,0.14)] flex items-center justify-center overflow-hidden">
              {preview && <img src={preview} alt="preview" className="w-full h-full object-cover" />}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="text-xs text-paper/70" />
          </div>
        </div>

        <input name="name" placeholder="Product name" value={form.name} onChange={handleChange} required
          className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald" />

        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required rows={3}
          className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald resize-none" />

        <div className="grid grid-cols-2 gap-4">
          <input name="price" type="number" min="0" placeholder="Price (₹)" value={form.price} onChange={handleChange} required
            className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald" />
          <input name="discount" type="number" min="0" max="100" placeholder="Discount %" value={form.discount} onChange={handleChange}
            className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald" />
          <input name="fabric" placeholder="Fabric" value={form.fabric} onChange={handleChange} required
            className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald" />
          <input name="gsm" type="number" min="0" placeholder="GSM" value={form.gsm} onChange={handleChange} required
            className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald" />
        </div>

        <select name="category" value={form.category} onChange={handleChange} required
          className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald">
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>{cat.name}</option>
          ))}
        </select>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-paper/55">Color / size / stock variants</label>
            <button type="button" onClick={addVariantRow} className="text-xs text-gold flex items-center gap-1 hover:underline">
              <Plus size={14} /> Add variant
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {variants.map((variant, index) => (
              <div key={variant._id || index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <input placeholder="Color" value={variant.color} onChange={(e) => handleVariantChange(index, "color", e.target.value)}
                  className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-xs outline-none focus:border-emerald" />
                <input placeholder="Size" value={variant.size} onChange={(e) => handleVariantChange(index, "size", e.target.value)}
                  className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-xs outline-none focus:border-emerald" />
                <input type="number" min="0" placeholder="Stock" value={variant.stock} onChange={(e) => handleVariantChange(index, "stock", e.target.value)}
                  className="bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-2.5 text-xs outline-none focus:border-emerald" />
                <button type="button" onClick={() => removeVariantRow(index)} disabled={variants.length === 1}
                  className="w-8 h-8 flex items-center justify-center text-paper/45 hover:text-crimson disabled:opacity-20">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {message && <p className={`text-xs ${status === "error" ? "text-crimson" : "text-emerald"}`}>{message}</p>}

        <button type="submit" disabled={status === "loading"}
          className="bg-emerald text-ink font-bold py-3 rounded-full hover:bg-gold transition-colors disabled:opacity-50">
          {status === "loading" ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
};

export default AdminEditProduct;
