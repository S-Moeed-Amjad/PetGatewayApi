// env.js
// Central place for environment variables and defaults

require("dotenv").config();

const config = {
  port: process.env.PORT || 8080,

  // Services (override in .env if needed)
  services: {
    PetAdoptionServices:
      process.env.PET_ADOPTION_URL ||
      "https://petadoptionwebapi-1.onrender.com/api/Pet/", // Moeed
    orders: process.env.ORDERS_URL || "http://localhost:4002", // Node
    ml: process.env.ML_URL || "http://localhost:5000", // Python
    stripeCheckout:
      process.env.STRIPE_CHECKOUT_URL ||
      "https://stripe.faithdiscipline.org.uk/stripe-checkout.php",
    getAllPayments:
      process.env.GET_ALL_PAYMENTS_URL ||
      "https://stripe.faithdiscipline.org.uk/Payments_APIs/get_all_payments.php",
    editPayment:
      process.env.EDIT_PAYMENT_URL ||
      "https://stripe.faithdiscipline.org.uk/Payments_APIs/edit_payments.php",
    adminLogin:
      process.env.ADMIN_LOGIN_URL ||
      "https://stripe.faithdiscipline.org.uk/login.php",

    medication:
      process.env.MEDICATION_URL || "https://medication-service.onrender.com",
  },

  userApi: {
    base:
      process.env.USER_API_BASE ||
      "https://node-api-wlq1.onrender.com/api/users",
    login:
      process.env.USER_API_LOGIN ||
      "https://node-api-wlq1.onrender.com/api/users/login",
    forgotPassword:
      process.env.USER_API_FORGOT_PASSWORD ||
      "https://node-api-wlq1.onrender.com/api/users/forgot-password",
    verifyOtp:
      process.env.USER_API_VERIFY_OTP ||
      "https://node-api-wlq1.onrender.com/api/users/verify-otp",
    resetPassword:
      process.env.USER_API_RESET_PASSWORD ||
      "https://node-api-wlq1.onrender.com/api/users/reset-password",
    oneUserData:
      process.env.USER_API_ONE_USER_DATA ||
      "https://node-api-wlq1.onrender.com/api/users/one-user-data/:email",
    byId:
      process.env.USER_API_BY_ID ||
      "https://node-api-wlq1.onrender.com/api/users/by-id/:id",
    deleteUser:
      process.env.USER_API_DELETE_USER ||
      "https://node-api-wlq1.onrender.com/api/users/delete-user/:email",
    deleteById:
      process.env.USER_API_DELETE_BY_ID ||
      "https://node-api-wlq1.onrender.com/api/users/delete-by-id/:id",
    getAllUsers:
      process.env.USER_API_GET_ALL_USERS ||
      "https://node-api-wlq1.onrender.com/api/users/get-all-users",
    getAllUsersId:
      process.env.USER_API_GET_ALL_USERS_ID ||
      "https://node-api-wlq1.onrender.com/api/users/get-all-users-id",
  },
};

module.exports = config;
