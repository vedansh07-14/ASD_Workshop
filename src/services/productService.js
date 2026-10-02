// ============================================================
// SERVICE LAYER
// ============================================================
// The service layer sits between the Controller and the Database.
//
// Its job is to contain BUSINESS LOGIC — rules about how the
// application works — separate from HTTP concerns (req/res) and
// raw data access (the database).
//
// In this workshop the business logic is intentionally minimal
// so the architecture stays easy to follow.
//
// Flow:  Controller → Service → Database
// ============================================================

const productDatabase = require("../database/productDatabase");

// --------------------------------------------------
// GET all products
// --------------------------------------------------

function getProducts() {
    return productDatabase.getAllProducts();
}

// --------------------------------------------------
// GET a single product by ID
// --------------------------------------------------

function getProduct(id) {
    // IDs are stored as numbers, but URL params arrive as strings.
    // Convert once here so the database layer always receives a number.
    const numericId = parseInt(id, 10);
    return productDatabase.getProductById(numericId);
}

// --------------------------------------------------
// CREATE a new product
// --------------------------------------------------

function createProduct(productData) {
    // Basic validation lives here — not in the controller, not in the DB
    if (!productData.name || productData.price === undefined) {
        throw new Error("Product must have a name and a price");
    }

    if (typeof productData.price !== "number" || productData.price < 0) {
        throw new Error("Price must be a non-negative number");
    }

    return productDatabase.createProduct(productData);
}

// --------------------------------------------------
// FULL UPDATE — replace all fields (PUT)
// --------------------------------------------------

function updateProduct(id, productData) {
    if (!productData.name || productData.price === undefined) {
        throw new Error("Product must have a name and a price");
    }

    if (typeof productData.price !== "number" || productData.price < 0) {
        throw new Error("Price must be a non-negative number");
    }

    const numericId = parseInt(id, 10);
    return productDatabase.updateProduct(numericId, productData);
}

// --------------------------------------------------
// PARTIAL UPDATE — change only supplied fields (PATCH)
// --------------------------------------------------

function patchProduct(id, updates) {
    // Validate price only if it was actually sent in the request
    if (updates.price !== undefined) {
        if (typeof updates.price !== "number" || updates.price < 0) {
            throw new Error("Price must be a non-negative number");
        }
    }

    const numericId = parseInt(id, 10);
    return productDatabase.patchProduct(numericId, updates);
}

// --------------------------------------------------
// DELETE a product
// --------------------------------------------------

function deleteProduct(id) {
    const numericId = parseInt(id, 10);
    return productDatabase.deleteProduct(numericId);
}

// Export all service functions
module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    patchProduct,
    deleteProduct,
};
