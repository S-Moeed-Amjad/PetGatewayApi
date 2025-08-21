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
    stripeCheckout: process.env.STRIPE_CHECKOUT_URL || "https://stripe.faithdiscipline.org.uk/stripe-checkout.php",
    getAllPayments: process.env.GET_ALL_PAYMENTS_URL || "https://stripe.faithdiscipline.org.uk/Payments_APIs/get_all_payments.php",
    editPayment: process.env.EDIT_PAYMENT_URL || "https://stripe.faithdiscipline.org.uk/Payments_APIs/edit_payments.php",
    adminLogin: process.env.ADMIN_LOGIN_URL || "https://stripe.faithdiscipline.org.uk/login.php"
  }
};

module.exports = config;
