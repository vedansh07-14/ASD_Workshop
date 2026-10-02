// ============================================================
// APP CONFIGURATION
// ============================================================
// app.js is responsible for creating and configuring the Express
// application. It does NOT start the server — that is server.js.
//
// Separating these two files makes testing easier: you can import
// `app` in tests without binding a port.
// ============================================================

const express = require("express");

const app = express();

// ---- Built-in middleware ------------------------------------
// Parse incoming JSON request bodies (needed for POST / PUT / PATCH)
app.use(express.json());

// ---- Root route ---------------------------------------------
// Simple health-check / API index — no business logic needed,
// so it lives here rather than in its own controller.
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Express Cache Workshop API is running",
        endpoints: {
            "GET /products":        "Get all products",
            "GET /products/:id":    "Get a product by ID",
            "POST /products":       "Create a product",
            "PUT /products/:id":    "Replace a product",
            "PATCH /products/:id":  "Update part of a product",
            "DELETE /products/:id": "Delete a product",
        },
    });
});

// ---- Product routes -----------------------------------------
const productRoutes = require("./routes/productRoutes");

// Mount all product routes under "/"
// So "/products" and "/products/:id" work as-is
app.use("/", productRoutes);

// ---- 404 handler --------------------------------------------
// If no route matched, return a JSON 404 response
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

module.exports = app;
