/**
 * Store Configuration Center
 * Modify this file to change store branding, validation rules, and contact info.
 */
export const STORE_CONFIG = {
  name: 'Family Store',
  currency: '£',
  location: 'Kent County, SE London',
  postcodePrefixes: ['BR', 'CT', 'DA', 'ME', 'TN'], // Kent County prefixes
  contactEmail: 'rahil1191@gmail.com',
  supportPhone: '+44 700 000 000',
  
  // Reference categories for convenience store (can add more dynamically)
  referenceCategories: ['Bakery', 'Dairy', 'Drinks', 'Groceries', 'Produce', 'Snacks', 'Household', 'Health & Beauty', 'Frozen'],
  
  // Categories are now dynamic based on inventory
  categories: ['All'], 
  
  // Mobile UI settings
  mobileFirst: true,
  
  // Delivery Settings
  delivery: {
    fee: 0,                // Standard delivery fee (set to 0 for free)
    minOrderForFreeDelivery: 20, // Order total required for free delivery
    minimumOrderValue: 5    // Absolute minimum order to allow checkout
  },

  // Validation Rules
  // Toggle these to true/false to make fields required or optional in Checkout
  validation: {
    phoneRequired: false,   // Set to true to require phone number at checkout
    nameRequired: true,    // Always recommended
    emailRequired: true,   // Always recommended
    addressRequired: true, // Always recommended
    postcodeRequired: true // Always recommended
  },

  // Auth & Checkout Settings
  auth: {
    allowGuestCheckout: true,  // If true, user doesn't need to log in to order
    requireLogin: false,       // If true, login page is shown to everyone
    showCustomerLogin: false   // If false, nav hides login links (Admin can still access /profile to log in)
  },

  // Notification Switches
  notifications: {
    sendEmail: true,
    sendTelegram: true,
    storeCopy: true,
    customerCopy: true
  },

  // Personalization
  recommendations: {
    enabled: true,
    title: 'Current Deals & Sale Items',
    limit: 4,
    strategy: 'cross-category' // or 'random'
  }
};

export const ADMIN_EMAILS = ['rahil1191@gmail.com', 'kapateldhaval94@gmail.com'];
