# Urban Loom — Contemporary Apparel E-Commerce Platform

[![React](https://img.shields.io/badge/React-19.2.0-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF?style=flat&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Redux_Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.12.0-764ABC?style=flat&logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.19-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-02042B?style=flat&logo=razorpay&logoColor=528FF0)](https://razorpay.com/)

> **Urban Loom** is a full-stack MERN e-commerce web application engineered for contemporary apparel. Built with modern web standards (React 19, Vite 7, Tailwind CSS v4, Express 5, and MongoDB Mongoose), the project demonstrates scalable e-commerce architecture, atomic inventory management, secure double-token authentication, dual payment processing (Razorpay + COD), and an administrative control panel.

---

## Table of Contents

- [Key Highlights](#key-highlights)
- [Architecture & Design](#architecture--design)
- [Features](#features)
  - [Customer Storefront](#customer-storefront)
  - [Cart & Checkout Flow](#cart--checkout-flow)
  - [Admin Management Suite](#admin-management-suite)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Setup](#installation--setup)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Clone Repository](#2-clone-repository)
  - [3. Backend Setup](#3-backend-setup)
  - [4. Frontend Setup](#4-frontend-setup)
  - [5. Seed Sample Products](#5-seed-sample-products)
- [Environment Variables Guide](#environment-variables-guide)
- [REST API Reference](#rest-api-reference)
- [College Presentation & Viva Talking Points](#college-presentation--viva-talking-points)
- [License & Acknowledgments](#license--acknowledgments)

---

## Key Highlights

- **Atomic Stock Management**: Eliminates race conditions and Mongoose `VersionError` crashes during concurrent checkouts using sequential atomic MongoDB `$inc` operations with rollbacks.
- **Resilient Cloud SDK Integrations**: ImageKit, Razorpay, and Nodemailer clients are configured with lazy-loading proxies so missing external credentials will not prevent local server boots or viva evaluation.
- **Double-Token JWT Security**: Implements short-lived `AccessToken` and long-lived `RefreshToken` stored in `HttpOnly` and `SameSite` cookies with automated silent token rotation via Axios response interceptors.
- **Guest-to-Account Cart Merging**: Guests can curate carts in browser `localStorage`; upon registration or login, items are merged into their MongoDB cloud cart with real-time stock clamping.
- **Contemporary Design Language**: Styled with Tailwind CSS v4 using an Obsidian (`#0B1110`), Surface (`#131D1B`), Emerald (`#10B981`), and Gold (`#F0C44C`) palette.

---

## Architecture & Design

```mermaid
flowchart TD
    Client["Client Browser (React 19 + Redux Toolkit + Vite 7)"]
    API["Express 5 REST API Gateway (:5000)"]
    DB[("MongoDB (Mongoose ODM)")]
    CloudCDN["ImageKit (Product Media CDN)"]
    PaymentGW["Razorpay API (HMAC SHA-256)"]
    MailService["Nodemailer (SMTP Service)"]

    Client -->|Axios withCredentials + JWT Cookies| API
    API -->|Schema Validation & Atomic $inc| DB
    API -->|Image Upload & CDN URLs| CloudCDN
    API -->|Order Creation & Signature Verification| PaymentGW
    API -->|Password Reset Emails| MailService
