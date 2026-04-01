export interface Meal {
  id: number;
  name: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: string[];
  image: string;
  description: string;
  allergens: string[];
  ingredients: string[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  planType: string;
  status: 'active' | 'paused' | 'churned' | 'at_risk';
  monthsSubscribed: number;
  ltv: number;
  joinDate: string;
  lastOrder: string;
  notes: string[];
  address: string;
  dietaryPreferences: string[];
  isVIP?: boolean;
  isCorporate?: boolean;
}

export interface Order {
  id: string;
  customerId: number;
  customerName: string;
  items: { mealId: number; mealName: string; quantity: number; price: number; customizations?: string[] }[];
  total: number;
  status: 'new' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  address: string;
  notes: string;
  createdAt: string;
}

export const meals: Meal[] = [
  {
    id: 1, name: 'Garlic Butter Chicken with Jasmine Rice', price: 285,
    calories: 520, protein: 42, carbs: 45, fat: 18,
    tags: ['High Protein', 'Gluten-Free'],
    image: 'https://picsum.photos/seed/garlic-chicken/400/300',
    description: 'Juicy chicken breast in garlic butter sauce served with fluffy jasmine rice.',
    allergens: ['Dairy'], ingredients: ['Chicken Breast', 'Butter', 'Garlic', 'Jasmine Rice', 'Herbs']
  },
  {
    id: 2, name: 'Beef Tapa with Garlic Fried Rice & Egg', price: 310,
    calories: 610, protein: 38, carbs: 52, fat: 24,
    tags: ['Filipino Classic'],
    image: 'https://picsum.photos/seed/beef-tapa/400/300',
    description: 'Classic Filipino beef tapa with sinangag and itlog.',
    allergens: ['Eggs', 'Soy'], ingredients: ['Beef Sirloin', 'Garlic Rice', 'Egg', 'Vinegar', 'Soy Sauce']
  },
  {
    id: 3, name: 'Salmon Teriyaki Bowl', price: 395,
    calories: 480, protein: 35, carbs: 48, fat: 16,
    tags: ['Keto-Friendly'],
    image: 'https://picsum.photos/seed/salmon-bowl/400/300',
    description: 'Fresh Atlantic salmon glazed with house teriyaki on a bed of mixed grains.',
    allergens: ['Fish', 'Soy', 'Gluten'], ingredients: ['Salmon Fillet', 'Teriyaki Sauce', 'Brown Rice', 'Edamame', 'Sesame']
  },
  {
    id: 4, name: 'Vegan Buddha Bowl', price: 245,
    calories: 380, protein: 18, carbs: 55, fat: 12,
    tags: ['Vegan', 'Dairy-Free'],
    image: 'https://picsum.photos/seed/buddha-bowl/400/300',
    description: 'Colorful bowl of roasted vegetables, quinoa, and tahini dressing.',
    allergens: ['Sesame'], ingredients: ['Quinoa', 'Sweet Potato', 'Chickpeas', 'Kale', 'Tahini']
  },
  {
    id: 5, name: 'Chicken Adobo Meal Prep', price: 265,
    calories: 490, protein: 40, carbs: 42, fat: 15,
    tags: ['Filipino Classic', 'High Protein'],
    image: 'https://picsum.photos/seed/chicken-adobo/400/300',
    description: 'Traditional chicken adobo braised in soy-vinegar sauce with steamed rice.',
    allergens: ['Soy'], ingredients: ['Chicken Thigh', 'Soy Sauce', 'Vinegar', 'Bay Leaves', 'Rice']
  },
  {
    id: 6, name: 'Mediterranean Quinoa Salad', price: 275,
    calories: 420, protein: 22, carbs: 48, fat: 14,
    tags: ['Vegetarian', 'Gluten-Free'],
    image: 'https://picsum.photos/seed/med-quinoa/400/300',
    description: 'Fresh Mediterranean salad with quinoa, feta, olives, and lemon vinaigrette.',
    allergens: ['Dairy'], ingredients: ['Quinoa', 'Feta Cheese', 'Olives', 'Cucumber', 'Tomatoes']
  },
  {
    id: 7, name: 'Korean BBQ Beef with Kimchi Rice', price: 335,
    calories: 560, protein: 36, carbs: 50, fat: 22,
    tags: ['Spicy'],
    image: 'https://picsum.photos/seed/korean-bbq/400/300',
    description: 'Marinated Korean BBQ beef with kimchi fried rice and pickled vegetables.',
    allergens: ['Soy', 'Gluten', 'Sesame'], ingredients: ['Beef Ribeye', 'Kimchi', 'Gochujang', 'Rice', 'Sesame Oil']
  },
  {
    id: 8, name: 'Grilled Fish Sinigang Soup Set', price: 290,
    calories: 350, protein: 32, carbs: 28, fat: 10,
    tags: ['Filipino Classic', 'Low Carb', 'Diabetic-Friendly'],
    image: 'https://picsum.photos/seed/fish-sinigang/400/300',
    description: 'Grilled bangus with sinigang soup, vegetables, and a cup of rice.',
    allergens: ['Fish'], ingredients: ['Bangus', 'Tamarind', 'Tomatoes', 'Kangkong', 'Radish']
  },
  {
    id: 9, name: 'Tofu Sisig with Brown Rice', price: 225,
    calories: 410, protein: 20, carbs: 52, fat: 14,
    tags: ['Vegan', 'Filipino Fusion'],
    image: 'https://picsum.photos/seed/tofu-sisig/400/300',
    description: 'Crispy tofu sisig on a sizzling plate with brown rice.',
    allergens: ['Soy'], ingredients: ['Tofu', 'Onions', 'Chili', 'Calamansi', 'Brown Rice']
  },
  {
    id: 10, name: 'Herb-Crusted Pork Tenderloin', price: 305,
    calories: 470, protein: 38, carbs: 35, fat: 18,
    tags: ['Keto-Friendly'],
    image: 'https://picsum.photos/seed/pork-herb/400/300',
    description: 'Tender pork loin with herb crust, roasted vegetables, and mashed potatoes.',
    allergens: ['Dairy', 'Gluten'], ingredients: ['Pork Tenderloin', 'Herbs', 'Butter', 'Potatoes', 'Green Beans']
  },
  {
    id: 11, name: 'Shrimp Pad Thai', price: 320,
    calories: 500, protein: 28, carbs: 58, fat: 16,
    tags: ['Gluten-Free'],
    image: 'https://picsum.photos/seed/pad-thai/400/300',
    description: 'Classic pad Thai with jumbo shrimp, rice noodles, and crushed peanuts.',
    allergens: ['Shellfish', 'Peanuts', 'Eggs'], ingredients: ['Shrimp', 'Rice Noodles', 'Peanuts', 'Bean Sprouts', 'Lime']
  },
  {
    id: 12, name: 'Chicken Kare-Kare with Bagoong', price: 295,
    calories: 540, protein: 35, carbs: 46, fat: 20,
    tags: ['Filipino Classic'],
    image: 'https://picsum.photos/seed/kare-kare/400/300',
    description: 'Rich peanut-based stew with chicken, eggplant, and shrimp paste on the side.',
    allergens: ['Peanuts', 'Shellfish'], ingredients: ['Chicken', 'Peanut Butter', 'Eggplant', 'Banana Blossom', 'Bagoong']
  }
];

export const customers: Customer[] = [
  {
    id: 1, name: 'Maria Santos', email: 'maria.santos@email.com', phone: '+63 917 123 4567',
    planType: '10 meals/week', status: 'active', monthsSubscribed: 3, ltv: 18000,
    joinDate: '2026-01-05', lastOrder: '2026-03-28',
    notes: ['Prefers extra rice', 'Birthday: May 15'],
    address: '123 Rizal Ave, Makati City', dietaryPreferences: ['High Protein']
  },
  {
    id: 2, name: 'Juan dela Cruz', email: 'juan.delacruz@email.com', phone: '+63 918 234 5678',
    planType: '5 meals/week', status: 'paused', monthsSubscribed: 6, ltv: 14700,
    joinDate: '2025-10-12', lastOrder: '2026-03-15',
    notes: ['On vacation until April 10', 'Loyal customer'],
    address: '456 Bonifacio St, Taguig City', dietaryPreferences: ['Filipino Classic']
  },
  {
    id: 3, name: 'Angela Reyes', email: 'angela.reyes@email.com', phone: '+63 919 345 6789',
    planType: 'A la carte', status: 'active', monthsSubscribed: 0, ltv: 4280,
    joinDate: '2025-12-20', lastOrder: '2026-03-25',
    notes: ['Interested in subscribing'],
    address: '789 Ayala Blvd, BGC', dietaryPreferences: ['Vegan', 'Dairy-Free']
  },
  {
    id: 4, name: 'Carlos Mendoza', email: 'carlos.mendoza@corp.com', phone: '+63 920 456 7890',
    planType: '20 meals/week', status: 'active', monthsSubscribed: 1, ltv: 7800,
    joinDate: '2026-03-01', lastOrder: '2026-03-30',
    notes: ['Corporate account - TechCorp Inc.', 'Needs receipts for reimbursement'],
    address: '321 EDSA, Ortigas Center', dietaryPreferences: ['High Protein', 'Keto-Friendly'],
    isCorporate: true
  },
  {
    id: 5, name: 'Sofia Garcia', email: 'sofia.garcia@email.com', phone: '+63 921 567 8901',
    planType: '15 meals/week', status: 'active', monthsSubscribed: 5, ltv: 31500,
    joinDate: '2025-11-01', lastOrder: '2026-03-29',
    notes: ['VIP customer', 'Referred 3 friends', 'Allergic to shellfish'],
    address: '654 Paseo de Roxas, Makati City', dietaryPreferences: ['Gluten-Free'],
    isVIP: true
  },
  {
    id: 6, name: 'Ricardo Lim', email: 'ricardo.lim@email.com', phone: '+63 922 678 9012',
    planType: '10 meals/week', status: 'at_risk', monthsSubscribed: 2, ltv: 9000,
    joinDate: '2026-02-01', lastOrder: '2026-03-10',
    notes: ['Has not ordered in 3 weeks'],
    address: '987 Shaw Blvd, Mandaluyong', dietaryPreferences: ['Filipino Classic']
  },
  {
    id: 7, name: 'Patricia Tan', email: 'patricia.tan@email.com', phone: '+63 923 789 0123',
    planType: '5 meals/week', status: 'churned', monthsSubscribed: 4, ltv: 9800,
    joinDate: '2025-09-15', lastOrder: '2026-01-20',
    notes: ['Cancelled - moved to Cebu'],
    address: '147 Quezon Ave, Quezon City', dietaryPreferences: ['Vegetarian']
  },
  {
    id: 8, name: 'David Cruz', email: 'david.cruz@email.com', phone: '+63 924 890 1234',
    planType: '10 meals/week', status: 'active', monthsSubscribed: 4, ltv: 18000,
    joinDate: '2025-12-01', lastOrder: '2026-03-31',
    notes: ['Always orders extra sauce packs'],
    address: '258 Katipunan Ave, Quezon City', dietaryPreferences: ['Spicy', 'High Protein']
  }
];

export const orders: Order[] = [
  {
    id: 'PF-2026-04-0847', customerId: 1, customerName: 'Maria Santos',
    items: [
      { mealId: 1, mealName: 'Garlic Butter Chicken with Jasmine Rice', quantity: 2, price: 285 },
      { mealId: 5, mealName: 'Chicken Adobo Meal Prep', quantity: 1, price: 265 },
      { mealId: 3, mealName: 'Salmon Teriyaki Bowl', quantity: 1, price: 395 }
    ],
    total: 1230, status: 'preparing', deliveryDate: '2026-04-01', deliverySlot: '11:00 AM - 1:00 PM',
    paymentMethod: 'GCash', paymentStatus: 'paid',
    address: '123 Rizal Ave, Makati City', notes: 'Extra rice for chicken', createdAt: '2026-03-30T14:30:00'
  },
  {
    id: 'PF-2026-04-0848', customerId: 4, customerName: 'Carlos Mendoza',
    items: [
      { mealId: 1, mealName: 'Garlic Butter Chicken with Jasmine Rice', quantity: 4, price: 285 },
      { mealId: 7, mealName: 'Korean BBQ Beef with Kimchi Rice', quantity: 3, price: 335 },
      { mealId: 10, mealName: 'Herb-Crusted Pork Tenderloin', quantity: 3, price: 305 }
    ],
    total: 3060, status: 'new', deliveryDate: '2026-04-01', deliverySlot: '12:00 PM - 2:00 PM',
    paymentMethod: 'Credit Card', paymentStatus: 'paid',
    address: '321 EDSA, Ortigas Center', notes: 'Corporate delivery - reception desk', createdAt: '2026-03-31T09:15:00'
  },
  {
    id: 'PF-2026-04-0849', customerId: 5, customerName: 'Sofia Garcia',
    items: [
      { mealId: 6, mealName: 'Mediterranean Quinoa Salad', quantity: 3, price: 275 },
      { mealId: 4, mealName: 'Vegan Buddha Bowl', quantity: 2, price: 245 },
      { mealId: 1, mealName: 'Garlic Butter Chicken with Jasmine Rice', quantity: 2, price: 285 }
    ],
    total: 1885, status: 'ready', deliveryDate: '2026-04-01', deliverySlot: '5:00 PM - 7:00 PM',
    paymentMethod: 'Maya', paymentStatus: 'paid',
    address: '654 Paseo de Roxas, Makati City', notes: '', createdAt: '2026-03-30T11:00:00'
  },
  {
    id: 'PF-2026-04-0850', customerId: 3, customerName: 'Angela Reyes',
    items: [
      { mealId: 4, mealName: 'Vegan Buddha Bowl', quantity: 2, price: 245 },
      { mealId: 9, mealName: 'Tofu Sisig with Brown Rice', quantity: 1, price: 225 }
    ],
    total: 715, status: 'delivering', deliveryDate: '2026-04-01', deliverySlot: '6:00 PM - 8:00 PM',
    paymentMethod: 'GrabPay', paymentStatus: 'paid',
    address: '789 Ayala Blvd, BGC', notes: 'Gate code: 4521', createdAt: '2026-03-30T16:45:00'
  },
  {
    id: 'PF-2026-04-0851', customerId: 8, customerName: 'David Cruz',
    items: [
      { mealId: 7, mealName: 'Korean BBQ Beef with Kimchi Rice', quantity: 2, price: 335 },
      { mealId: 5, mealName: 'Chicken Adobo Meal Prep', quantity: 3, price: 265 },
      { mealId: 11, mealName: 'Shrimp Pad Thai', quantity: 2, price: 320 }
    ],
    total: 2105, status: 'delivered', deliveryDate: '2026-03-31', deliverySlot: '11:00 AM - 1:00 PM',
    paymentMethod: 'GCash', paymentStatus: 'paid',
    address: '258 Katipunan Ave, Quezon City', notes: '3 extra sauce packs', createdAt: '2026-03-29T10:00:00'
  },
  {
    id: 'PF-2026-04-0852', customerId: 6, customerName: 'Ricardo Lim',
    items: [
      { mealId: 2, mealName: 'Beef Tapa with Garlic Fried Rice & Egg', quantity: 2, price: 310 },
      { mealId: 12, mealName: 'Chicken Kare-Kare with Bagoong', quantity: 1, price: 295 }
    ],
    total: 915, status: 'cancelled', deliveryDate: '2026-03-28', deliverySlot: '12:00 PM - 2:00 PM',
    paymentMethod: 'COD', paymentStatus: 'failed',
    address: '987 Shaw Blvd, Mandaluyong', notes: 'Customer unreachable', createdAt: '2026-03-27T08:30:00'
  },
  {
    id: 'PF-2026-04-0853', customerId: 1, customerName: 'Maria Santos',
    items: [
      { mealId: 8, mealName: 'Grilled Fish Sinigang Soup Set', quantity: 2, price: 290 },
      { mealId: 1, mealName: 'Garlic Butter Chicken with Jasmine Rice', quantity: 2, price: 285 }
    ],
    total: 1150, status: 'new', deliveryDate: '2026-04-02', deliverySlot: '11:00 AM - 1:00 PM',
    paymentMethod: 'GCash', paymentStatus: 'paid',
    address: '123 Rizal Ave, Makati City', notes: '', createdAt: '2026-03-31T20:00:00'
  },
  {
    id: 'PF-2026-04-0854', customerId: 5, customerName: 'Sofia Garcia',
    items: [
      { mealId: 3, mealName: 'Salmon Teriyaki Bowl', quantity: 2, price: 395 },
      { mealId: 6, mealName: 'Mediterranean Quinoa Salad', quantity: 2, price: 275 },
      { mealId: 10, mealName: 'Herb-Crusted Pork Tenderloin', quantity: 1, price: 305 }
    ],
    total: 1645, status: 'delivered', deliveryDate: '2026-03-30', deliverySlot: '5:00 PM - 7:00 PM',
    paymentMethod: 'Maya', paymentStatus: 'paid',
    address: '654 Paseo de Roxas, Makati City', notes: '', createdAt: '2026-03-29T12:00:00'
  }
];

export const planTiers = [
  { id: 5, meals: 5, price: 2450, perMeal: 490, savings: 0, label: 'Starter' },
  { id: 10, meals: 10, price: 4500, perMeal: 450, savings: 8, label: 'Popular' },
  { id: 15, meals: 15, price: 6300, perMeal: 420, savings: 14, label: 'Best Value' },
  { id: 20, meals: 20, price: 7800, perMeal: 390, savings: 20, label: 'Family' },
];

export const deliveryZones = [
  { name: 'Makati CBD', fee: 50, estimatedTime: '30-45 min' },
  { name: 'BGC / Taguig', fee: 50, estimatedTime: '30-45 min' },
  { name: 'Ortigas / Mandaluyong', fee: 75, estimatedTime: '45-60 min' },
  { name: 'Quezon City', fee: 100, estimatedTime: '60-90 min' },
  { name: 'Pasig / Cainta', fee: 100, estimatedTime: '60-90 min' },
  { name: 'Manila / Ermita', fee: 75, estimatedTime: '45-60 min' },
  { name: 'Other Metro Manila', fee: 150, estimatedTime: '90-120 min' },
];

export const analyticsData = {
  mrr: 487500,
  activeSubscribers: 127,
  churnRate: 4.2,
  avgOrderValue: 1285,
  todayRevenue: 28450,
  mostPopularMeal: 'Garlic Butter Chicken',
  mostPopularCount: 89,
  revenueData: Array.from({ length: 30 }, (_, i) => ({
    date: `Mar ${i + 1}`,
    subscription: 12000 + Math.floor(Math.random() * 6000),
    alaCarte: 3000 + Math.floor(Math.random() * 4000),
  })),
  weeklyMealPopularity: [
    { name: 'Garlic Butter Chicken', count: 89 },
    { name: 'Chicken Adobo', count: 72 },
    { name: 'Salmon Teriyaki Bowl', count: 65 },
    { name: 'Korean BBQ Beef', count: 58 },
    { name: 'Vegan Buddha Bowl', count: 45 },
  ],
  subscriberTrend: Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    new: Math.floor(8 + Math.random() * 12),
    churned: Math.floor(2 + Math.random() * 6),
  })),
  planDistribution: [
    { name: '5 meals', value: 28, color: '#40916C' },
    { name: '10 meals', value: 45, color: '#2D6A4F' },
    { name: '15 meals', value: 35, color: '#1B4332' },
    { name: '20 meals', value: 19, color: '#E76F51' },
  ],
  cohortRetention: [
    { month: 'Oct', m1: 100, m2: 88, m3: 79, m4: 72, m5: 68, m6: 65 },
    { month: 'Nov', m1: 100, m2: 91, m3: 82, m4: 75, m5: 70 },
    { month: 'Dec', m1: 100, m2: 86, m3: 78, m4: 71 },
    { month: 'Jan', m1: 100, m2: 89, m3: 81 },
    { month: 'Feb', m1: 100, m2: 92 },
    { month: 'Mar', m1: 100 },
  ],
  avgLTV: 15200,
};

export const dietaryFilters = [
  'High Protein', 'Keto-Friendly', 'Vegan', 'Vegetarian', 'Gluten-Free',
  'Filipino Classic', 'Dairy-Free', 'Low Carb', 'Diabetic-Friendly',
  'Spicy', 'Filipino Fusion', 'Halal'
];

export const timeSlots = [
  '8:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '11:00 AM - 1:00 PM',
  '12:00 PM - 2:00 PM',
  '2:00 PM - 4:00 PM',
  '4:00 PM - 6:00 PM',
  '5:00 PM - 7:00 PM',
  '6:00 PM - 8:00 PM',
];

export const paymentMethods = [
  { id: 'gcash', name: 'GCash', icon: '📱' },
  { id: 'maya', name: 'Maya', icon: '💳' },
  { id: 'grabpay', name: 'GrabPay', icon: '🟢' },
  { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
  { id: 'cod', name: 'Cash on Delivery', icon: '💵' },
];

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString()}`;
}
