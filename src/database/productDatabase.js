// ============================================================
// DATABASE LAYER
// ============================================================
// This is the ONLY place that touches the actual product data.
// Controllers and Services NEVER access `products` directly.
// Think of this as a stand-in for a real database (PostgreSQL,
// MongoDB, etc.). Swapping it out won't touch any other layer.
// ============================================================

const path = require("path");

// ---- Seed data from db.json --------------------------------
// We load the JSON file at startup to pre-populate the
// in-memory array. Changes made via the API are kept in
// memory only (the file on disk is not overwritten).
//
// db.json lives at the project root (two levels above this file).
// ----------------------------------------------------------------
const dbPath = path.join(__dirname, "..", "..", "db.json");
const seedData = require(dbPath);

// In-memory "database" — seeded from db.json
const products = seedData.map((p) => ({ ...p })); // shallow copy each entry

// Derive the next available ID from the highest existing ID
let nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;

// --------------------------------------------------
// READ
// --------------------------------------------------

// Return a shallow copy so callers can't mutate the array
function getAllProducts() {
    return [...products];
}

// Find one product by ID (returns undefined if not found)
function getProductById(id) {
    return products.find((product) => product.id === id);
}

// --------------------------------------------------
// CREATE
// --------------------------------------------------

function createProduct(productData) {
    const newProduct = {
        id: nextId++,           // assign the next available ID
        name: productData.name,
        price: productData.price,
    };

    products.push(newProduct);  // save to "database"
    return newProduct;
}

// --------------------------------------------------
// FULL UPDATE (PUT — replace the whole product)
// --------------------------------------------------

function updateProduct(id, productData) {
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
        return null; // not found
    }

    // Replace the existing entry completely
    products[index] = { id, name: productData.name, price: productData.price };
    return products[index];
}

// --------------------------------------------------
// PARTIAL UPDATE (PATCH — update only supplied fields)
// --------------------------------------------------

function patchProduct(id, updates) {
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
        return null; // not found
    }

    // Merge existing data with the new partial updates
    products[index] = { ...products[index], ...updates };
    return products[index];
}

// --------------------------------------------------
// DELETE
// --------------------------------------------------

function deleteProduct(id) {
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
        return null; // not found
    }

    // Remove the product and return it so callers know what was deleted
    const deleted = products[index];
    products.splice(index, 1);
    return deleted;
}

// Export all database functions
module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    patchProduct,
    deleteProduct,
};
