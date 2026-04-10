"""
Template seed data for the Order & Subscription Management System.

This file defines the sample/template data that populates a fresh tenant's
catalog when the environment variable SEED_TEMPLATE_DATA=true (the default).

PURPOSE
=======
When a new business owner deploys the system for the first time, this data
gives them a fully functional storefront to explore: a catalog of meals,
subscription plans with tiered pricing, delivery zones, and notification
templates. They can then replace or modify these entries through the admin
panel or by editing this file before redeployment.

HOW TO CUSTOMISE
================
1. Edit the Python lists/dicts below. Each section has a comment explaining
   the expected fields.
2. Restart the application. The seeder is idempotent — it checks for existing
   data by slug/name before inserting, so only *new* entries are added.
3. To replace everything, drop the relevant database tables (or reset the DB)
   and restart.

DATA STRUCTURES
===============
PRODUCT_CATEGORIES  - Top-level product groupings
PRODUCTS            - Individual products with a default variant and optional
                      nutritional metadata (used by the frontend meal cards)
SUBSCRIPTION_PLANS  - Billing plans with tiered pricing
DELIVERY_ZONES      - Geographic zones with delivery time-slot schedules
NOTIFICATION_TEMPLATES - Transactional email/SMS templates

All prices are in PHP (Philippine Peso). Change the tenant config currency
if your business uses a different one.
"""

from datetime import time
from decimal import Decimal

# ---------------------------------------------------------------------------
# Product Categories
# ---------------------------------------------------------------------------
# Fields: name, slug (URL-safe unique key), description
PRODUCT_CATEGORIES: list[dict] = [
    {
        "name": "Meals",
        "slug": "meals",
        "description": "Prepared meal options",
    },
    {
        "name": "Snacks",
        "slug": "snacks",
        "description": "Healthy snack options",
    },
    {
        "name": "Beverages",
        "slug": "beverages",
        "description": "Drinks and smoothies",
    },
]

# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
# Fields per product:
#   name            - Display name
#   slug            - URL-safe unique identifier
#   description     - Short marketing description
#   sku             - Stock-keeping unit code
#   status          - "active" or "draft"
#   is_subscribable - Can be included in subscription plans
#   is_standalone   - Can be purchased a la carte
#   variant_name    - Name of the default variant (e.g. "Regular", "500ml")
#   variant_sku     - SKU for the default variant
#   price           - Retail price as Decimal
#   image_url       - Path or URL for the product image (optional)
#   metadata        - Optional dict with nutritional info for frontend display:
#                     calories, protein, carbs, fat, tags, allergens, ingredients
PRODUCTS: list[dict] = [
    {
        "name": "Garlic Butter Chicken with Jasmine Rice",
        "slug": "garlic-butter-chicken",
        "description": "Juicy chicken breast in garlic butter sauce served with fluffy jasmine rice.",
        "sku": "MEAL-001",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-001-REG",
        "price": Decimal("285.00"),
        "image_url": "/images/meals/garlic-chicken.png",
        "metadata": {
            "calories": 520,
            "protein": 42,
            "carbs": 45,
            "fat": 18,
            "tags": ["High Protein", "Gluten-Free"],
            "allergens": ["Dairy"],
            "ingredients": ["Chicken Breast", "Butter", "Garlic", "Jasmine Rice", "Herbs"],
        },
    },
    {
        "name": "Beef Tapa with Garlic Fried Rice & Egg",
        "slug": "beef-tapa",
        "description": "Classic Filipino beef tapa with sinangag and itlog.",
        "sku": "MEAL-002",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-002-REG",
        "price": Decimal("310.00"),
        "image_url": "/images/meals/beef-tapa.png",
        "metadata": {
            "calories": 610,
            "protein": 38,
            "carbs": 52,
            "fat": 24,
            "tags": ["Filipino Classic"],
            "allergens": ["Eggs", "Soy"],
            "ingredients": ["Beef Sirloin", "Garlic Rice", "Egg", "Vinegar", "Soy Sauce"],
        },
    },
    {
        "name": "Salmon Teriyaki Bowl",
        "slug": "salmon-teriyaki-bowl",
        "description": "Fresh Atlantic salmon glazed with house teriyaki on a bed of mixed grains.",
        "sku": "MEAL-003",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-003-REG",
        "price": Decimal("395.00"),
        "image_url": "/images/meals/salmon-bowl.png",
        "metadata": {
            "calories": 480,
            "protein": 35,
            "carbs": 48,
            "fat": 16,
            "tags": ["Keto-Friendly"],
            "allergens": ["Fish", "Soy", "Gluten"],
            "ingredients": ["Salmon Fillet", "Teriyaki Sauce", "Brown Rice", "Edamame", "Sesame"],
        },
    },
    {
        "name": "Vegan Buddha Bowl",
        "slug": "vegan-buddha-bowl",
        "description": "Colorful bowl of roasted vegetables, quinoa, and tahini dressing.",
        "sku": "MEAL-004",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-004-REG",
        "price": Decimal("245.00"),
        "image_url": "/images/meals/buddha-bowl.png",
        "metadata": {
            "calories": 380,
            "protein": 18,
            "carbs": 55,
            "fat": 12,
            "tags": ["Vegan", "Dairy-Free"],
            "allergens": ["Sesame"],
            "ingredients": ["Quinoa", "Sweet Potato", "Chickpeas", "Kale", "Tahini"],
        },
    },
    {
        "name": "Chicken Adobo Meal Prep",
        "slug": "chicken-adobo-meal-prep",
        "description": "Traditional chicken adobo braised in soy-vinegar sauce with steamed rice.",
        "sku": "MEAL-005",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-005-REG",
        "price": Decimal("265.00"),
        "image_url": "/images/meals/chicken-adobo.png",
        "metadata": {
            "calories": 490,
            "protein": 40,
            "carbs": 42,
            "fat": 15,
            "tags": ["Filipino Classic", "High Protein"],
            "allergens": ["Soy"],
            "ingredients": ["Chicken Thigh", "Soy Sauce", "Vinegar", "Bay Leaves", "Rice"],
        },
    },
    {
        "name": "Mediterranean Quinoa Salad",
        "slug": "mediterranean-quinoa-salad",
        "description": "Fresh Mediterranean salad with quinoa, feta, olives, and lemon vinaigrette.",
        "sku": "MEAL-006",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-006-REG",
        "price": Decimal("275.00"),
        "image_url": "/images/meals/med-quinoa.png",
        "metadata": {
            "calories": 420,
            "protein": 22,
            "carbs": 48,
            "fat": 14,
            "tags": ["Vegetarian", "Gluten-Free"],
            "allergens": ["Dairy"],
            "ingredients": ["Quinoa", "Feta Cheese", "Olives", "Cucumber", "Tomatoes"],
        },
    },
    {
        "name": "Korean BBQ Beef with Kimchi Rice",
        "slug": "korean-bbq-beef",
        "description": "Marinated Korean BBQ beef with kimchi fried rice and pickled vegetables.",
        "sku": "MEAL-007",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-007-REG",
        "price": Decimal("335.00"),
        "image_url": "/images/meals/korean-bbq.png",
        "metadata": {
            "calories": 560,
            "protein": 36,
            "carbs": 50,
            "fat": 22,
            "tags": ["Spicy"],
            "allergens": ["Soy", "Gluten", "Sesame"],
            "ingredients": ["Beef Ribeye", "Kimchi", "Gochujang", "Rice", "Sesame Oil"],
        },
    },
    {
        "name": "Grilled Fish Sinigang Soup Set",
        "slug": "grilled-fish-sinigang",
        "description": "Grilled bangus with sinigang soup, vegetables, and a cup of rice.",
        "sku": "MEAL-008",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-008-REG",
        "price": Decimal("290.00"),
        "image_url": "/images/meals/fish-sinigang.png",
        "metadata": {
            "calories": 350,
            "protein": 32,
            "carbs": 28,
            "fat": 10,
            "tags": ["Filipino Classic", "Low Carb", "Diabetic-Friendly"],
            "allergens": ["Fish"],
            "ingredients": ["Bangus", "Tamarind", "Tomatoes", "Kangkong", "Radish"],
        },
    },
    {
        "name": "Tofu Sisig with Brown Rice",
        "slug": "tofu-sisig",
        "description": "Crispy tofu sisig on a sizzling plate with brown rice.",
        "sku": "MEAL-009",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-009-REG",
        "price": Decimal("225.00"),
        "image_url": "/images/meals/tofu-sisig.png",
        "metadata": {
            "calories": 410,
            "protein": 20,
            "carbs": 52,
            "fat": 14,
            "tags": ["Vegan", "Filipino Fusion"],
            "allergens": ["Soy"],
            "ingredients": ["Tofu", "Onions", "Chili", "Calamansi", "Brown Rice"],
        },
    },
    {
        "name": "Herb-Crusted Pork Tenderloin",
        "slug": "herb-crusted-pork",
        "description": "Tender pork loin with herb crust, roasted vegetables, and mashed potatoes.",
        "sku": "MEAL-010",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-010-REG",
        "price": Decimal("305.00"),
        "image_url": "/images/meals/pork-herb.png",
        "metadata": {
            "calories": 470,
            "protein": 38,
            "carbs": 35,
            "fat": 18,
            "tags": ["Keto-Friendly"],
            "allergens": ["Dairy", "Gluten"],
            "ingredients": ["Pork Tenderloin", "Herbs", "Butter", "Potatoes", "Green Beans"],
        },
    },
    {
        "name": "Shrimp Pad Thai",
        "slug": "shrimp-pad-thai",
        "description": "Classic pad Thai with jumbo shrimp, rice noodles, and crushed peanuts.",
        "sku": "MEAL-011",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-011-REG",
        "price": Decimal("320.00"),
        "image_url": "/images/meals/pad-thai.png",
        "metadata": {
            "calories": 500,
            "protein": 28,
            "carbs": 58,
            "fat": 16,
            "tags": ["Gluten-Free"],
            "allergens": ["Shellfish", "Peanuts", "Eggs"],
            "ingredients": ["Shrimp", "Rice Noodles", "Peanuts", "Bean Sprouts", "Lime"],
        },
    },
    {
        "name": "Chicken Kare-Kare with Bagoong",
        "slug": "chicken-kare-kare",
        "description": "Rich peanut-based stew with chicken, eggplant, and shrimp paste on the side.",
        "sku": "MEAL-012",
        "status": "active",
        "is_subscribable": True,
        "is_standalone": True,
        "variant_name": "Regular",
        "variant_sku": "MEAL-012-REG",
        "price": Decimal("295.00"),
        "image_url": "/images/meals/kare-kare.png",
        "metadata": {
            "calories": 540,
            "protein": 35,
            "carbs": 46,
            "fat": 20,
            "tags": ["Filipino Classic"],
            "allergens": ["Peanuts", "Shellfish"],
            "ingredients": ["Chicken", "Peanut Butter", "Eggplant", "Banana Blossom", "Bagoong"],
        },
    },
]

# ---------------------------------------------------------------------------
# Subscription Plans
# ---------------------------------------------------------------------------
# Fields per plan:
#   name             - Display name
#   slug             - URL-safe unique identifier
#   description      - Short description
#   billing_interval - "weekly", "biweekly", or "monthly"
#   tiers            - List of pricing tiers, each with:
#                      name, items_per_cycle, price (Decimal)
SUBSCRIPTION_PLANS: list[dict] = [
    {
        "name": "Weekly Plan",
        "slug": "weekly-plan",
        "description": "Fresh meals delivered every week",
        "billing_interval": "weekly",
        "tiers": [
            {"name": "5 Meals", "items_per_cycle": 5, "price": Decimal("1150.00")},
            {"name": "10 Meals", "items_per_cycle": 10, "price": Decimal("2100.00")},
            {"name": "15 Meals", "items_per_cycle": 15, "price": Decimal("2850.00")},
            {"name": "20 Meals", "items_per_cycle": 20, "price": Decimal("3400.00")},
        ],
    },
    {
        "name": "Monthly Plan",
        "slug": "monthly-plan",
        "description": "Monthly meal subscription with savings",
        "billing_interval": "monthly",
        "tiers": [
            {"name": "20 Meals", "items_per_cycle": 20, "price": Decimal("3800.00")},
            {"name": "30 Meals", "items_per_cycle": 30, "price": Decimal("5400.00")},
        ],
    },
]

# ---------------------------------------------------------------------------
# Delivery Zones
# ---------------------------------------------------------------------------
# Fields per zone:
#   name             - Zone display name
#   description      - Delivery area description / estimated time
#   delivery_fee     - Fee in PHP (Decimal)
#   min_order_amount - Minimum order value (Decimal)
#   boundaries       - Dict with a "postal_codes" list
#   slots            - List of time slots, each with:
#                      day (0=Mon..6=Sun), start (time), end (time), capacity (int)
DELIVERY_ZONES: list[dict] = [
    {
        "name": "Metro Manila",
        "description": "Greater Metro Manila area",
        "delivery_fee": Decimal("50.00"),
        "min_order_amount": Decimal("500.00"),
        "boundaries": {
            "postal_codes": [
                "1000", "1001", "1002", "1003", "1004",
                "1005", "1006", "1007", "1008", "1009", "1010",
            ],
        },
        "slots": [
            # Mon-Fri morning slots
            *[{"day": d, "start": time(8, 0), "end": time(12, 0), "capacity": 50} for d in range(5)],
            # Mon-Fri afternoon slots
            *[{"day": d, "start": time(13, 0), "end": time(18, 0), "capacity": 50} for d in range(5)],
            # Saturday slot
            {"day": 5, "start": time(9, 0), "end": time(14, 0), "capacity": 30},
        ],
    },
]

# ---------------------------------------------------------------------------
# Notification Templates
# ---------------------------------------------------------------------------
# Fields per template:
#   event_type    - Event identifier (e.g. "order_confirmed")
#   channel       - "email" or "sms"
#   subject       - Email subject line (None for SMS)
#   body_template - Message body with {{variable}} placeholders
NOTIFICATION_TEMPLATES: list[dict] = [
    {
        "event_type": "order_confirmed",
        "channel": "email",
        "subject": "Order Confirmed \u2014 #{{order_number}}",
        "body_template": (
            "Hi {{first_name}}, your order #{{order_number}} has been confirmed. "
            "Total: {{currency}} {{total}}."
        ),
    },
    {
        "event_type": "order_delivered",
        "channel": "email",
        "subject": "Order Delivered \u2014 #{{order_number}}",
        "body_template": (
            "Hi {{first_name}}, your order #{{order_number}} has been delivered. "
            "Enjoy your meal!"
        ),
    },
    {
        "event_type": "payment_received",
        "channel": "email",
        "subject": "Payment Received",
        "body_template": (
            "Hi {{first_name}}, we received your payment of {{currency}} {{amount}}. "
            "Thank you!"
        ),
    },
    {
        "event_type": "subscription_activated",
        "channel": "email",
        "subject": "Subscription Activated",
        "body_template": (
            "Hi {{first_name}}, your {{plan_name}} subscription is now active. "
            "Next billing: {{next_billing_date}}."
        ),
    },
    {
        "event_type": "subscription_cancelled",
        "channel": "email",
        "subject": "Subscription Cancelled",
        "body_template": (
            "Hi {{first_name}}, your subscription has been cancelled. "
            "You can resubscribe anytime."
        ),
    },
    {
        "event_type": "order_confirmed",
        "channel": "sms",
        "subject": None,
        "body_template": "Order #{{order_number}} confirmed. Total: {{currency}} {{total}}.",
    },
]
