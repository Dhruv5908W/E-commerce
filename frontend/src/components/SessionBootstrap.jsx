import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "../store/slices/userSlice.js";
import { fetchCart, loadGuestCartFromStorage } from "../store/slices/cartSlice.js";
import { fetchCategories } from "../store/slices/categorySlice.js";

export function SessionBootstrap({ children }) {
  const dispatch = useDispatch();
  const { authChecked, isAuthenticated } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchCurrentUser());
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!authChecked) return;
    if (isAuthenticated) {
      dispatch(fetchCart());
    } else {
      dispatch(loadGuestCartFromStorage());
    }
  }, [authChecked, isAuthenticated, dispatch]);

  return children;
}

export default SessionBootstrap;
