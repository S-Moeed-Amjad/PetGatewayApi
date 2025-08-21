// env.js
// Central place for environment variables and defaults

require("dotenv").config();

const config = {
  port: process.env.PORT || 8080,

  // Services (override in .env if needed)
  services: {
    PetAdoptionServices: process.env.PET_ADOPTION_URL || "https://petadoptionwebapi-1.onrender.com/api/Pet/", // Moeed
    orders:  process.env.ORDERS_URL  || "http://localhost:4002", // Node
    ml:      process.env.ML_URL      || "http://localhost:5000", // Python
    billing: process.env.BILLING_URL || "http://localhost:8080"  // PHP
  }
};

module.exports = config;
