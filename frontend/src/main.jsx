import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import SessionBootstrap from "./components/SessionBootstrap.jsx";

import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";

import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Cart from "./components/Cart.jsx";
import Address from "./components/Address.jsx";
import Payment from "./components/Payment.jsx";
import ProductReview from "./components/ProductReview.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import InfoPage from "./pages/InfoPage.jsx";
import NotFound from "./pages/NotFound.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminProducts from "./pages/admin/AdminProduct.jsx";
import AdminUploadProduct from "./pages/admin/AdminUploadProduct.jsx";
import AdminEditProduct from "./pages/admin/AdminEditProduct.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="product/:productId" element={<ProductReview />} />
        <Route path="cart" element={<Cart />} />
        <Route path="info/:slug" element={<InfoPage />} />

        <Route element={<RequireAuth />}>
          <Route path="address" element={<Address />} />
          <Route path="payment" element={<Payment />} />
          <Route path="orders" element={<MyOrders />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminProducts />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="upload" element={<AdminUploadProduct />} />
          <Route path="edit/:productId" element={<AdminEditProduct />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
      </Route>
    </>
  )
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <SessionBootstrap>
        <RouterProvider router={router} />
      </SessionBootstrap>
    </Provider>
  </StrictMode>
);
