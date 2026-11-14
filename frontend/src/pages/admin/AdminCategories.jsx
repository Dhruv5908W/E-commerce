import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategories } from "../../store/slices/categorySlice.js";
import api from "../../api/axiosClient.js";

const AdminCategories = () => {
  const dispatch = useDispatch();
  const { items: categories, status } = useSelector((state) => state.categories);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.post("/categories", { name: name.trim() });
      setName("");
      dispatch(fetchCategories());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create category");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="font-display text-3xl uppercase mb-6">Categories</h1>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 bg-surface border border-[rgba(244,241,234,0.2)] rounded-lg p-3 text-sm outline-none focus:border-emerald"
        />
        <button type="submit" disabled={creating}
          className="bg-emerald text-ink font-bold px-5 rounded-lg hover:bg-gold transition-colors disabled:opacity-50">
          {creating ? "..." : "Add"}
        </button>
      </form>

      {error && <p className="text-crimson text-xs mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        {status === "loading" && <p className="text-paper/45 text-sm">Loading...</p>}
        {categories.map((cat) => (
          <div key={cat._id} className="bg-surface border border-[rgba(244,241,234,0.14)] rounded-lg p-3 text-sm capitalize">
            {cat.name}
          </div>
        ))}
        {categories.length === 0 && status !== "loading" && (
          <p className="text-paper/45 text-sm">No categories yet — add your first one above.</p>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
