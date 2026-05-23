import { base44 } from "@/api/base44Client";

export const DEPARTMENTS = [
  {
    dept_code: "FV",
    name: "Fruits & Vegetables",
    default_gst: 0,
    billing_type: "weight_kg",
    is_fresh: true,
    requires_scale: true,
    has_expiry: true,
    fifo_enabled: true,
    color_code: "#2ECC71",
    bgColor: "#E8F8F0",
    icon: "🥬",
    counter_display: "Counter 3 - Fresh",
    sort_order: 1
  },
  {
    dept_code: "DAIRY",
    name: "Dairy & Eggs",
    default_gst: 5,
    billing_type: "unit",
    is_fresh: true,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: true,
    color_code: "#3498DB",
    bgColor: "#EBF5FB",
    icon: "🥛",
    counter_display: "Counter 2 - General",
    sort_order: 2
  },
  {
    dept_code: "MEAT",
    name: "Meat, Fish & Poultry",
    default_gst: 0,
    billing_type: "weight_kg",
    is_fresh: true,
    requires_scale: true,
    has_expiry: true,
    fifo_enabled: true,
    color_code: "#C0392B",
    bgColor: "#FDEDEC",
    icon: "🍗",
    counter_display: "Fresh Counter",
    sort_order: 3
  },
  {
    dept_code: "BAKERY",
    name: "Bakery & Hot Foods",
    default_gst: 5,
    billing_type: "unit",
    is_fresh: true,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: true,
    color_code: "#E67E22",
    bgColor: "#FEF9E7",
    icon: "🥖",
    counter_display: "Bakery Counter",
    sort_order: 4
  },
  {
    dept_code: "GROCERY",
    name: "Grocery & Staples",
    default_gst: 5,
    billing_type: "unit",
    is_fresh: false,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: false,
    color_code: "#9B59B6",
    bgColor: "#F4ECF7",
    icon: "🛒",
    counter_display: "Counter 1 - Express",
    sort_order: 5
  },
  {
    dept_code: "PERS",
    name: "Personal Care & Hygiene",
    default_gst: 18,
    billing_type: "unit",
    is_fresh: false,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: false,
    color_code: "#FF6B00",
    bgColor: "#FDEDEC",
    icon: "🧴",
    counter_display: "Counter 2 - General",
    sort_order: 6
  },
  {
    dept_code: "HOME",
    name: "Home Care & Cleaning",
    default_gst: 18,
    billing_type: "unit",
    is_fresh: false,
    requires_scale: false,
    has_expiry: false,
    fifo_enabled: false,
    color_code: "#7F8C8D",
    bgColor: "#F2F3F4",
    icon: "🏠",
    counter_display: "Counter 2 - General",
    sort_order: 7
  },
  {
    dept_code: "SNACKS",
    name: "Snacks & Beverages",
    default_gst: 12,
    billing_type: "unit",
    is_fresh: false,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: false,
    color_code: "#F1C40F",
    bgColor: "#FDFEFE",
    icon: "🍫",
    counter_display: "Counter 1 - Express",
    sort_order: 8
  },
  {
    dept_code: "FROZEN",
    name: "Frozen & Refrigerated",
    default_gst: 12,
    billing_type: "unit",
    is_fresh: true,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: true,
    color_code: "#1ABC9C",
    bgColor: "#E8F8F5",
    icon: "❄️",
    counter_display: "Counter 2 - General",
    sort_order: 9
  },
  {
    dept_code: "BABY",
    name: "Baby & Kids",
    default_gst: 12,
    billing_type: "unit",
    is_fresh: false,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: false,
    color_code: "#95A5A6",
    bgColor: "#F2F4F4",
    icon: "👶",
    counter_display: "Counter 2 - General",
    sort_order: 10
  },
  {
    dept_code: "PET",
    name: "Pet Care",
    default_gst: 18,
    billing_type: "unit",
    is_fresh: false,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: false,
    color_code: "#34495E",
    bgColor: "#EAECEE",
    icon: "🐾",
    counter_display: "Counter 2 - General",
    sort_order: 11
  },
  {
    dept_code: "ORGANIC",
    name: "Organic & Health",
    default_gst: 5,
    billing_type: "unit",
    is_fresh: true,
    requires_scale: false,
    has_expiry: true,
    fifo_enabled: true,
    color_code: "#27AE60",
    bgColor: "#E8F8F0",
    icon: "🌿",
    counter_display: "Counter 3 - Fresh",
    sort_order: 12
  }
];

export const SAMPLE_PRODUCTS = [
  {
    barcode: "8901031100224",
    plu_code: "1001",
    name: "Tomato (Fresh Loose)",
    brand: "Local Produce",
    dept_code: "FV",
    unit: "KG",
    pack_size: "1kg",
    mrp: 40,
    rate: 40,
    purchase_rate: 22,
    loose_rate_per_kg: 40,
    gst_rate: 0,
    hsn: "0702",
    is_weighed: true,
    requires_scale: true,
    is_popular: true,
    stock: 120,
    min_stock: 20
  },
  {
    barcode: "8901031100231",
    plu_code: "1002",
    name: "Onion (Fresh Loose)",
    brand: "Local Produce",
    dept_code: "FV",
    unit: "KG",
    pack_size: "1kg",
    mrp: 30,
    rate: 30,
    purchase_rate: 18,
    loose_rate_per_kg: 30,
    gst_rate: 0,
    hsn: "0703",
    is_weighed: true,
    requires_scale: true,
    is_popular: true,
    stock: 250,
    min_stock: 30
  },
  {
    barcode: "8901262010012",
    plu_code: "2001",
    name: "Amul Taaza Milk 1L",
    brand: "Amul",
    dept_code: "DAIRY",
    unit: "PCS",
    pack_size: "1L",
    mrp: 68,
    rate: 68,
    purchase_rate: 60,
    gst_rate: 0,
    hsn: "0401",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 90,
    min_stock: 15,
    expiry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // Expiry in 2 days (for FEFO demo)
  },
  {
    barcode: "8901262020028",
    plu_code: "2002",
    name: "Amul Butter 500g",
    brand: "Amul",
    dept_code: "DAIRY",
    unit: "PCS",
    pack_size: "500g",
    mrp: 275,
    rate: 265,
    purchase_rate: 240,
    gst_rate: 12,
    hsn: "0405",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 45,
    min_stock: 8,
    expiry_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  },
  {
    barcode: "8906002001015",
    plu_code: "3001",
    name: "Fresh Chicken Breasts",
    brand: "Suguna Foods",
    dept_code: "MEAT",
    unit: "KG",
    pack_size: "1kg",
    mrp: 280,
    rate: 260,
    purchase_rate: 190,
    loose_rate_per_kg: 260,
    gst_rate: 0,
    hsn: "0207",
    is_weighed: true,
    requires_scale: true,
    is_popular: false,
    stock: 30,
    min_stock: 5,
    expiry_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // Expiry tomorrow
  },
  {
    barcode: "8901058860118",
    plu_code: "4001",
    name: "Fresh White Bread",
    brand: "Harvest Gold",
    dept_code: "BAKERY",
    unit: "PCS",
    pack_size: "400g",
    mrp: 45,
    rate: 45,
    purchase_rate: 35,
    gst_rate: 5,
    hsn: "1905",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 40,
    min_stock: 10,
    expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // Expiry in 3 days
  },
  {
    barcode: "8901202511326",
    plu_code: "5001",
    name: "Fortune Sunflower Oil 1L",
    brand: "Fortune",
    dept_code: "GROCERY",
    unit: "PCS",
    pack_size: "1L",
    mrp: 145,
    rate: 135,
    purchase_rate: 120,
    gst_rate: 5,
    hsn: "1512",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 150,
    min_stock: 20
  },
  {
    barcode: "8901123000542",
    plu_code: "5002",
    name: "Basmati Rice Premium 5kg",
    brand: "India Gate",
    dept_code: "GROCERY",
    unit: "PCS",
    pack_size: "5kg",
    mrp: 550,
    rate: 499,
    purchase_rate: 420,
    gst_rate: 5,
    hsn: "1006",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 80,
    min_stock: 10
  },
  {
    barcode: "8901058002310",
    plu_code: "5003",
    name: "Tata Salt 1kg",
    brand: "Tata",
    dept_code: "GROCERY",
    unit: "PCS",
    pack_size: "1kg",
    mrp: 28,
    rate: 28,
    purchase_rate: 22,
    gst_rate: 0,
    hsn: "2501",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 200,
    min_stock: 25
  },
  {
    barcode: "8901491101831",
    plu_code: "8001",
    name: "Lays Classic Salted",
    brand: "Lays",
    dept_code: "SNACKS",
    unit: "PCS",
    pack_size: "50g",
    mrp: 30,
    rate: 30,
    purchase_rate: 24,
    gst_rate: 18,
    hsn: "2106",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 300,
    min_stock: 50
  },
  {
    barcode: "5449000000996",
    plu_code: "8002",
    name: "Coca Cola 2L",
    brand: "Coca Cola",
    dept_code: "SNACKS",
    unit: "PCS",
    pack_size: "2L",
    mrp: 95,
    rate: 90,
    purchase_rate: 75,
    gst_rate: 28,
    hsn: "2202",
    is_weighed: false,
    requires_scale: false,
    is_popular: true,
    stock: 120,
    min_stock: 20
  },
  {
    barcode: "8901030753551",
    plu_code: "6001",
    name: "Dettol Liquid Handwash",
    brand: "Dettol",
    dept_code: "PERS",
    unit: "PCS",
    pack_size: "200ml",
    mrp: 99,
    rate: 95,
    purchase_rate: 80,
    gst_rate: 18,
    hsn: "3401",
    is_weighed: false,
    requires_scale: false,
    is_popular: false,
    stock: 60,
    min_stock: 10
  }
];

export async function runSupermarketSeeder() {
  const companyId = localStorage.getItem("company_id");
  if (!companyId) return false;

  console.log("Starting Supermarket Seeder...");

  // 1. Seed Departments
  const existingDepts = await base44.entities.StoreDepartment.list();
  const deptMap = {};

  if (existingDepts.length === 0) {
    for (const dept of DEPARTMENTS) {
      const created = await base44.entities.StoreDepartment.create(dept);
      deptMap[dept.dept_code] = created.id;
    }
    console.log("Seeded 12 departments.");
  } else {
    existingDepts.forEach(d => {
      deptMap[d.dept_code] = d.id;
    });
  }

  // 2. Seed Products if empty
  const existingProducts = await base44.entities.Product.list();
  if (existingProducts.length < 5) {
    // Disabled auto-seeding of dummy products per user request
    console.log("Skipping sample product seeding for clean inventory.");
  }

  // 3. Seed Sample active offers if empty
  const existingOffers = await base44.entities.PriceEngine.list();
  if (existingOffers.length === 0) {
    const sampleOffers = [
      {
        offer_name: "Fresh Tomatoes TPR",
        offer_type: "tpr",
        applies_to: "product",
        product_ids: ["Tomato (Fresh Loose)"],
        discount_value: 5, // 5 off MRP
        discount_pct: 0,
        min_qty: 1,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 10
      },
      {
        offer_name: "Lays Chips 3 for 80 Combo",
        offer_type: "quantity_break",
        applies_to: "product",
        product_ids: ["8901491101831", "Lays Classic Salted"],
        discount_value: 10, // discount to make 3 = 80 instead of 90 (3x30=90, discount = 10)
        discount_pct: 0,
        min_qty: 3,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 20
      },
      {
        offer_name: "Mega Cart Savings",
        offer_type: "cart_total",
        applies_to: "cart_total",
        min_amount: 1000,
        discount_value: 50,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 5
      }
    ];

    for (const offer of sampleOffers) {
      await base44.entities.PriceEngine.create(offer);
    }
    console.log("Seeded sample offers.");
  }

  return true;
}
