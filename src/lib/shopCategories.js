// Shop Categories Library for GST Billing & POS Software
// Preloaded dual English + Hindi categories, default GST rates, default HSN, and default UOM.

export const BUSINESS_TYPES = [
  { value: "grocery", label: "Grocery / Kirana Store (किराना दुकान)" },
  { value: "medical", label: "Medical Store / Pharmacy (दवा दुकान)" },
  { value: "restaurant", label: "Restaurant / Cafe (रेस्टोरेंट / कैफ़े)" },
  { value: "fashion", label: "Fashion / Clothing Store (कपड़ा दुकान)" },
  { value: "electronics", label: "Electronics Store (इलेक्ट्रॉनिक्स स्टोर)" },
  { value: "hardware", label: "Hardware Store (हार्डवेयर स्टोर)" },
  { value: "mobile", label: "Mobile Shop (मोबाइल शॉप)" },
  { value: "cosmetic", label: "Cosmetic & Beauty Store (कॉस्मेटिक दुकान)" },
  { value: "footwear", label: "Footwear Store (जूता-चप्पल स्टोर)" },
  { value: "jewellery", label: "Jewellery Store (ज्वैलरी शॉप)" },
  { value: "bakery", label: "Bakery Store (बेकरी स्टोर)" },
  { value: "stationery", label: "Stationery Store (स्टेशनरी स्टोर)" },
  { value: "retail", label: "General Retail (सामान्य रिटेल)" },
  { value: "wholesaler", label: "Wholesaler (थोक विक्रेता)" },
  { value: "supermarket", label: "Mall / Supermarket (मॉल / सुपरमार्केट)" },
  { value: "manufacturer", label: "Manufacturer (उत्पादक)" },
  { value: "importer_exporter", label: "Importer / Exporter (आयातक / निर्यातक)" },
  { value: "other", label: "Other Business (अन्य व्यवसाय)" }
];

export const SHOP_TAXONOMY = {
  grocery: {
    label: "Grocery / Kirana Store",
    categories: [
      { name: "Rice & Atta", hindi: "चावल और आटा", defaultGst: 5, defaultHsn: "1006", defaultUnit: "KG" },
      { name: "Dal & Pulses", hindi: "दालें और दलहन", defaultGst: 5, defaultHsn: "0713", defaultUnit: "KG" },
      { name: "Oil & Ghee", hindi: "तेल और घी", defaultGst: 5, defaultHsn: "1512", defaultUnit: "LTR" },
      { name: "Spices & Masala", hindi: "मसाले", defaultGst: 5, defaultHsn: "0910", defaultUnit: "PCS" },
      { name: "Tea & Coffee", hindi: "चाय और कॉफी", defaultGst: 5, defaultHsn: "0902", defaultUnit: "PCS" },
      { name: "Biscuit & Snacks", hindi: "बिस्कुट और स्नैक्स", defaultGst: 18, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Dry Fruits", hindi: "सूखे मेवे", defaultGst: 12, defaultHsn: "0802", defaultUnit: "KG" },
      { name: "Dairy Products", hindi: "डेयरी उत्पाद", defaultGst: 5, defaultHsn: "0401", defaultUnit: "PCS" },
      { name: "Bakery Items", hindi: "बेकरी उत्पाद", defaultGst: 18, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Soft Drinks", hindi: "कोल्ड ड्रिंक्स", defaultGst: 28, defaultHsn: "2202", defaultUnit: "PCS" },
      { name: "Frozen Foods", hindi: "फ्रोजन फूड", defaultGst: 12, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Cleaning Products", hindi: "सफाई के उत्पाद", defaultGst: 18, defaultHsn: "3402", defaultUnit: "PCS" },
      { name: "Personal Care", hindi: "व्यक्तिगत देखभाल", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" },
      { name: "Baby Care", hindi: "शिशु देखभाल", defaultGst: 18, defaultHsn: "9619", defaultUnit: "PCS" },
      { name: "Puja Items", hindi: "पूजा सामग्री", defaultGst: 0, defaultHsn: "3307", defaultUnit: "PCS" },
      { name: "Stationery", hindi: "स्टेशनरी", defaultGst: 12, defaultHsn: "4820", defaultUnit: "PCS" },
      { name: "Plastic Items", hindi: "प्लास्टिक का सामान", defaultGst: 18, defaultHsn: "3924", defaultUnit: "PCS" },
      { name: "Household Products", hindi: "घरेलू उत्पाद", defaultGst: 18, defaultHsn: "7323", defaultUnit: "PCS" }
    ]
  },
  medical: {
    label: "Medical Store / Pharmacy",
    categories: [
      { name: "Tablets", hindi: "टैबलेट", defaultGst: 12, defaultHsn: "3004", defaultUnit: "BOX" },
      { name: "Capsules", hindi: "कैप्सूल", defaultGst: 12, defaultHsn: "3004", defaultUnit: "BOX" },
      { name: "Syrups", hindi: "सिरप", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "Injections", hindi: "इंजेक्शन", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "Surgical Items", hindi: "सर्जिकल आइटम", defaultGst: 12, defaultHsn: "9018", defaultUnit: "PCS" },
      { name: "Medical Equipment", hindi: "चिकित्सा उपकरण", defaultGst: 12, defaultHsn: "9018", defaultUnit: "PCS" },
      { name: "Health Supplements", hindi: "स्वास्थ्य पूरक", defaultGst: 18, defaultHsn: "2106", defaultUnit: "BOX" },
      { name: "Ayurvedic Medicine", hindi: "आयुर्वेदिक दवाएं", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "Homeopathy", hindi: "होम्योपैथी", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "Baby Medicine", hindi: "बच्चों की दवाएं", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "Diabetic Care", hindi: "मधुमेह देखभाल", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "First Aid", hindi: "प्राथमिक चिकित्सा", defaultGst: 12, defaultHsn: "3005", defaultUnit: "PCS" },
      { name: "OTC Products", hindi: "ओटीसी उत्पाद", defaultGst: 12, defaultHsn: "3004", defaultUnit: "PCS" },
      { name: "Personal Hygiene", hindi: "व्यक्तिगत स्वच्छता", defaultGst: 18, defaultHsn: "3307", defaultUnit: "PCS" },
      { name: "Medical Devices", hindi: "चिकित्सा उपकरण उपकरण", defaultGst: 12, defaultHsn: "9018", defaultUnit: "PCS" }
    ]
  },
  restaurant: {
    label: "Restaurant / Cafe",
    categories: [
      { name: "Veg Items", hindi: "शाकाहारी भोजन", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Non-Veg Items", hindi: "मांसाहारी भोजन", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Fast Food", hindi: "फास्ट फूड", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Pizza & Burger", hindi: "पिज्जा और बर्गर", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Chinese Food", hindi: "चीनी भोजन", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "South Indian", hindi: "दक्षिण भारतीय भोजन", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Beverages", hindi: "पेय पदार्थ", defaultGst: 5, defaultHsn: "2202", defaultUnit: "PCS" },
      { name: "Tea & Coffee", hindi: "चाय और कॉफी", defaultGst: 5, defaultHsn: "0902", defaultUnit: "PCS" },
      { name: "Ice Cream", hindi: "आइसक्रीम", defaultGst: 18, defaultHsn: "2105", defaultUnit: "PCS" },
      { name: "Desserts", hindi: "मिठाइयाँ", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Bakery", hindi: "बेकरी", defaultGst: 5, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Combo Meals", hindi: "कॉम्बो भोजन", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Parcel Items", hindi: "पार्सल आइटम", defaultGst: 5, defaultHsn: "2106", defaultUnit: "PCS" }
    ]
  },
  fashion: {
    label: "Fashion / Clothing Store",
    categories: [
      { name: "Men Wear", hindi: "पुरुषों के कपड़े", defaultGst: 5, defaultHsn: "6203", defaultUnit: "PCS" },
      { name: "Women Wear", hindi: "महिलाओं के कपड़े", defaultGst: 5, defaultHsn: "6204", defaultUnit: "PCS" },
      { name: "Kids Wear", hindi: "बच्चों के कपड़े", defaultGst: 5, defaultHsn: "6209", defaultUnit: "PCS" },
      { name: "Saree", hindi: "साड़ी", defaultGst: 5, defaultHsn: "5208", defaultUnit: "PCS" },
      { name: "Jeans", hindi: "जींस", defaultGst: 12, defaultHsn: "6203", defaultUnit: "PCS" },
      { name: "T-Shirts", hindi: "टी-शर्ट", defaultGst: 5, defaultHsn: "6109", defaultUnit: "PCS" },
      { name: "Shirts", hindi: "शर्ट", defaultGst: 5, defaultHsn: "6205", defaultUnit: "PCS" },
      { name: "Footwear", hindi: "जूते-चप्पल", defaultGst: 12, defaultHsn: "6403", defaultUnit: "PAIR" },
      { name: "Bags", hindi: "बैग", defaultGst: 18, defaultHsn: "4202", defaultUnit: "PCS" },
      { name: "Accessories", hindi: "सहायक उपकरण", defaultGst: 18, defaultHsn: "6217", defaultUnit: "PCS" },
      { name: "Watches", hindi: "घड़ियाँ", defaultGst: 18, defaultHsn: "9102", defaultUnit: "PCS" },
      { name: "Cosmetics", hindi: "सौंदर्य प्रसाधन", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" },
      { name: "Jewellery", hindi: "आभूषण", defaultGst: 3, defaultHsn: "7113", defaultUnit: "PCS" },
      { name: "Seasonal Collection", hindi: "मौसमी संग्रह", defaultGst: 12, defaultHsn: "6201", defaultUnit: "PCS" }
    ]
  },
  electronics: {
    label: "Electronics Store",
    categories: [
      { name: "Mobile Phones", hindi: "मोबाइल फोन", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "Laptops", hindi: "लैपटॉप", defaultGst: 18, defaultHsn: "8471", defaultUnit: "PCS" },
      { name: "Computers", hindi: "कंप्यूटर", defaultGst: 18, defaultHsn: "8471", defaultUnit: "PCS" },
      { name: "TV & Appliances", hindi: "टीवी और उपकरण", defaultGst: 18, defaultHsn: "8528", defaultUnit: "PCS" },
      { name: "Printers", hindi: "प्रिंटर", defaultGst: 18, defaultHsn: "8443", defaultUnit: "PCS" },
      { name: "CCTV", hindi: "सीसीटीवी", defaultGst: 18, defaultHsn: "8525", defaultUnit: "PCS" },
      { name: "Accessories", hindi: "सहायक उपकरण", defaultGst: 18, defaultHsn: "8504", defaultUnit: "PCS" },
      { name: "Chargers", hindi: "चार्जर्स", defaultGst: 18, defaultHsn: "8504", defaultUnit: "PCS" },
      { name: "Speakers", hindi: "स्पीकर", defaultGst: 18, defaultHsn: "8518", defaultUnit: "PCS" },
      { name: "Smart Watches", hindi: "स्मार्ट घड़ियाँ", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "LED Lights", hindi: "एलईडी लाइट्स", defaultGst: 18, defaultHsn: "8539", defaultUnit: "PCS" },
      { name: "Networking Products", hindi: "नेटवर्किंग उत्पाद", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" }
    ]
  },
  hardware: {
    label: "Hardware Store",
    categories: [
      { name: "Pipes & Fittings", hindi: "पाइप और फिटिंग", defaultGst: 18, defaultHsn: "3917", defaultUnit: "MTR" },
      { name: "Paints", hindi: "पेंट", defaultGst: 18, defaultHsn: "3208", defaultUnit: "LTR" },
      { name: "Electrical Items", hindi: "बिजली का सामान", defaultGst: 18, defaultHsn: "8544", defaultUnit: "PCS" },
      { name: "Cement", hindi: "सीमेंट", defaultGst: 28, defaultHsn: "2523", defaultUnit: "BAG" },
      { name: "Tiles", hindi: "टाइल्स", defaultGst: 18, defaultHsn: "6907", defaultUnit: "BOX" },
      { name: "Tools", hindi: "उपकरण", defaultGst: 18, defaultHsn: "8205", defaultUnit: "PCS" },
      { name: "Plumbing", hindi: "प्लंबिंग", defaultGst: 18, defaultHsn: "8481", defaultUnit: "PCS" },
      { name: "Sanitary", hindi: "सैनिटरी", defaultGst: 18, defaultHsn: "6910", defaultUnit: "PCS" },
      { name: "Fasteners", hindi: "फास्टनर", defaultGst: 18, defaultHsn: "7318", defaultUnit: "BOX" },
      { name: "Safety Equipment", hindi: "सुरक्षा उपकरण", defaultGst: 18, defaultHsn: "5907", defaultUnit: "PCS" }
    ]
  },
  mobile: {
    label: "Mobile Shop",
    categories: [
      { name: "Smartphones", hindi: "स्मार्टफोन", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "Feature Phones", hindi: "फीचर फोन", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "Tempered Glass", hindi: "टेम्पर्ड ग्लास", defaultGst: 18, defaultHsn: "7007", defaultUnit: "PCS" },
      { name: "Covers", hindi: "कवर", defaultGst: 18, defaultHsn: "3926", defaultUnit: "PCS" },
      { name: "Chargers", hindi: "चार्जर्स", defaultGst: 18, defaultHsn: "8504", defaultUnit: "PCS" },
      { name: "Earphones", hindi: "इयरफ़ोन", defaultGst: 18, defaultHsn: "8518", defaultUnit: "PCS" },
      { name: "Smart Gadgets", hindi: "स्मार्ट गैजेट्स", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "Mobile Parts", hindi: "मोबाइल पार्ट्स", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "Bluetooth Devices", hindi: "ब्लूटूथ डिवाइस", defaultGst: 18, defaultHsn: "8518", defaultUnit: "PCS" }
    ]
  },
  cosmetic: {
    label: "Cosmetic & Beauty Store",
    categories: [
      { name: "Makeup", hindi: "मेकअप", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" },
      { name: "Face Wash", hindi: "फेस वॉश", defaultGst: 18, defaultHsn: "3401", defaultUnit: "PCS" },
      { name: "Shampoo", hindi: "शैम्पू", defaultGst: 18, defaultHsn: "3305", defaultUnit: "PCS" },
      { name: "Hair Oil", hindi: "बालों का तेल", defaultGst: 18, defaultHsn: "3305", defaultUnit: "PCS" },
      { name: "Perfume", hindi: "इत्र / परफ्यूम", defaultGst: 18, defaultHsn: "3303", defaultUnit: "PCS" },
      { name: "Skin Care", hindi: "त्वचा की देखभाल", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" },
      { name: "Beauty Cream", hindi: "सौंदर्य क्रीम", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" },
      { name: "Salon Products", hindi: "सैलून उत्पाद", defaultGst: 18, defaultHsn: "3305", defaultUnit: "PCS" },
      { name: "Nail Products", hindi: "नेल उत्पाद", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" }
    ]
  },
  footwear: {
    label: "Footwear Store",
    categories: [
      { name: "Shoes", hindi: "जूते", defaultGst: 12, defaultHsn: "6403", defaultUnit: "PAIR" },
      { name: "Sandals", hindi: "सैंडल", defaultGst: 12, defaultHsn: "6402", defaultUnit: "PAIR" },
      { name: "Slippers", hindi: "चप्पल", defaultGst: 12, defaultHsn: "6402", defaultUnit: "PAIR" },
      { name: "Sports Shoes", hindi: "स्पोर्ट्स जूते", defaultGst: 12, defaultHsn: "6411", defaultUnit: "PAIR" },
      { name: "Kids Footwear", hindi: "बच्चों के जूते-चप्पल", defaultGst: 12, defaultHsn: "6404", defaultUnit: "PAIR" },
      { name: "Formal Shoes", hindi: "औपचारिक जूते", defaultGst: 12, defaultHsn: "6403", defaultUnit: "PAIR" },
      { name: "Shoe Accessories", hindi: "जूते के सामान", defaultGst: 18, defaultHsn: "6406", defaultUnit: "PCS" }
    ]
  },
  jewellery: {
    label: "Jewellery Store",
    categories: [
      { name: "Gold Jewellery", hindi: "सोने के आभूषण", defaultGst: 3, defaultHsn: "7113", defaultUnit: "PCS" },
      { name: "Silver Jewellery", hindi: "चांदी के आभूषण", defaultGst: 3, defaultHsn: "7113", defaultUnit: "PCS" },
      { name: "Diamond Jewellery", hindi: "हीरे के आभूषण", defaultGst: 3, defaultHsn: "7113", defaultUnit: "PCS" },
      { name: "Coins", hindi: "सिक्के", defaultGst: 3, defaultHsn: "7118", defaultUnit: "PCS" },
      { name: "Bridal Collection", hindi: "दुल्हन संग्रह", defaultGst: 3, defaultHsn: "7113", defaultUnit: "PCS" },
      { name: "Artificial Jewellery", hindi: "कृत्रिम आभूषण", defaultGst: 18, defaultHsn: "7117", defaultUnit: "PCS" }
    ]
  },
  bakery: {
    label: "Bakery Store",
    categories: [
      { name: "Cakes", hindi: "केक", defaultGst: 18, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Pastry", hindi: "पेस्ट्री", defaultGst: 18, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Bread", hindi: "ब्रेड", defaultGst: 0, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Cookies", hindi: "कुकीज़", defaultGst: 18, defaultHsn: "1905", defaultUnit: "BOX" },
      { name: "Namkeen", hindi: "नमकीन", defaultGst: 12, defaultHsn: "2106", defaultUnit: "BOX" },
      { name: "Chocolates", hindi: "चॉकलेट", defaultGst: 18, defaultHsn: "1806", defaultUnit: "PCS" },
      { name: "Cold Drinks", hindi: "कोल्ड ड्रिंक्स", defaultGst: 28, defaultHsn: "2202", defaultUnit: "PCS" },
      { name: "Snacks", hindi: "स्नैक्स", defaultGst: 18, defaultHsn: "1905", defaultUnit: "PCS" }
    ]
  },
  stationery: {
    label: "Stationery Store",
    categories: [
      { name: "Books", hindi: "पुस्तकें / किताबें", defaultGst: 0, defaultHsn: "4901", defaultUnit: "PCS" },
      { name: "Pens", hindi: "पेन", defaultGst: 12, defaultHsn: "9608", defaultUnit: "PCS" },
      { name: "School Items", hindi: "स्कूल का सामान", defaultGst: 12, defaultHsn: "9608", defaultUnit: "PCS" },
      { name: "Office Supplies", hindi: "कार्यालय की आपूर्ति", defaultGst: 12, defaultHsn: "3824", defaultUnit: "PCS" },
      { name: "Files", hindi: "फाइलें", defaultGst: 12, defaultHsn: "4820", defaultUnit: "PCS" },
      { name: "Printer Paper", hindi: "प्रिंटर पेपर", defaultGst: 12, defaultHsn: "4802", defaultUnit: "BOX" },
      { name: "Art Materials", hindi: "कला सामग्री", defaultGst: 12, defaultHsn: "3213", defaultUnit: "PCS" }
    ]
  },
  supermarket: {
    label: "Mall / Supermarket",
    categories: [
      { name: "Groceries & Staples", hindi: "किराना और अनाज", defaultGst: 5, defaultHsn: "1006", defaultUnit: "KG" },
      { name: "Fruits & Vegetables", hindi: "फल और सब्जियाँ", defaultGst: 0, defaultHsn: "0709", defaultUnit: "KG" },
      { name: "Dairy & Frozen", hindi: "डेयरी और फ्रोजन", defaultGst: 5, defaultHsn: "0401", defaultUnit: "PCS" },
      { name: "Snacks & Beverages", hindi: "स्नैक्स और पेय", defaultGst: 18, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Personal Care", hindi: "व्यक्तिगत देखभाल", defaultGst: 18, defaultHsn: "3304", defaultUnit: "PCS" },
      { name: "Home & Kitchen", hindi: "घर और रसोई", defaultGst: 18, defaultHsn: "7323", defaultUnit: "PCS" },
      { name: "Clothing & Fashion", hindi: "कपड़े और फैशन", defaultGst: 5, defaultHsn: "6203", defaultUnit: "PCS" },
      { name: "Electronics & Gadgets", hindi: "इलेक्ट्रॉनिक्स और गैजेट्स", defaultGst: 18, defaultHsn: "8517", defaultUnit: "PCS" },
      { name: "Toys & Games", hindi: "खिलौने और गेम्स", defaultGst: 18, defaultHsn: "9503", defaultUnit: "PCS" },
      { name: "Stationery & Books", hindi: "स्टेशनरी और किताबें", defaultGst: 12, defaultHsn: "4820", defaultUnit: "PCS" },
      { name: "Health & Wellness", hindi: "स्वास्थ्य और वेलनेस", defaultGst: 12, defaultHsn: "2106", defaultUnit: "PCS" },
      { name: "Bakery & Confectionery", hindi: "बेकरी और मिठाई", defaultGst: 18, defaultHsn: "1905", defaultUnit: "PCS" },
      { name: "Baby Products", hindi: "शिशु उत्पाद", defaultGst: 18, defaultHsn: "9619", defaultUnit: "PCS" },
      { name: "Cleaning & Household", hindi: "सफाई और घरेलू", defaultGst: 18, defaultHsn: "3402", defaultUnit: "PCS" },
      { name: "Pet Supplies", hindi: "पालतू जानवर का सामान", defaultGst: 18, defaultHsn: "2309", defaultUnit: "PCS" },
      { name: "Ready to Eat", hindi: "रेडी टू ईट", defaultGst: 12, defaultHsn: "2106", defaultUnit: "PCS" }
    ]
  }
};

// Returns standard taxonomy for a shopType.
// Standard retail/wholesaler/other gets a combined general category set
export function getCategoriesByShopType(shopType = "retail") {
  const normType = String(shopType).toLowerCase();
  
  if (SHOP_TAXONOMY[normType]) {
    const list = [...SHOP_TAXONOMY[normType].categories];
    // Always append "Other" fallback
    list.push({ name: "Other", hindi: "अन्य", defaultGst: 18, defaultHsn: "9999", defaultUnit: "PCS" });
    return list;
  }
  
  // Generic fallback if retail or unsupported shop type
  return [
    { name: "General Goods", hindi: "सामान्य वस्तुएं", defaultGst: 18, defaultHsn: "9999", defaultUnit: "PCS" },
    { name: "Services", hindi: "सेवाएं", defaultGst: 18, defaultHsn: "9987", defaultUnit: "PCS" },
    { name: "Other", hindi: "अन्य", defaultGst: 18, defaultHsn: "9999", defaultUnit: "PCS" }
  ];
}

// Highly responsive local rule-based keyword match AI category suggestion engine
export function suggestCategoryByName(productName = "", shopType = "retail") {
  if (!productName) return null;
  const name = productName.toLowerCase().trim();
  const normType = String(shopType).toLowerCase();

  const rules = {
    grocery: [
      { keywords: ["atta", "rice", "wheat", "chawal", "flour", "maida", "suji", "aata", "poha", "dalia"], category: "Rice & Atta" },
      { keywords: ["dal", "pulses", "chana", "moong", "masoor", "urad", "arhar", "toor", "rajma", "kabuli"], category: "Dal & Pulses" },
      { keywords: ["oil", "ghee", "mustard", "refined", "soyabean", "coconut oil", "butter ghee"], category: "Oil & Ghee" },
      { keywords: ["masala", "chilli", "spices", "turmeric", "haldi", "salt", "namak", "jeera", "pepper", "hing", "dhania"], category: "Spices & Masala" },
      { keywords: ["tea", "coffee", "chai", "nescafe", "tata tea", "taj mahal", "bru"], category: "Tea & Coffee" },
      { keywords: ["biscuit", "snack", "chips", "kurkure", "namkeen", "lays", "uncle chips", "bingo"], category: "Biscuit & Snacks" },
      { keywords: ["almond", "kaju", "kismis", "badam", "pista", "dry fruit", "walnut", "cashew", "dates"], category: "Dry Fruits" },
      { keywords: ["milk", "paneer", "curd", "cheese", "butter", "dahi", "lassi", "buttermilk", "khoya", "amul"], category: "Dairy Products" },
      { keywords: ["bread", "toast", "cake", "pastry", "cookie", "rusk", "muffin"], category: "Bakery Items" },
      { keywords: ["coke", "pepsi", "sprite", "drink", "soda", "juice", "fanta", "limca", "maaza"], category: "Soft Drinks" },
      { keywords: ["soap", "surf", "clean", "harpic", "detergent", "wash", "colin", "lizol", "vim"], category: "Cleaning Products" },
      { keywords: ["paste", "brush", "shampoo", "cream", "lotion", "oil", "soap", "facewash", "deo"], category: "Personal Care" },
      { keywords: ["diaper", "baby", "cerelac", "johnson", "huggies", "mamy poko", "baby wipes"], category: "Baby Care" },
      { keywords: ["agarbatti", "puja", "dhoop", "diya", "kapoor", "camphor", "havan"], category: "Puja Items" },
      { keywords: ["pen", "book", "pencil", "notebook", "copy", "register", "eraser"], category: "Stationery" },
      { keywords: ["bucket", "mug", "plastic", "bottle", "container", "tiffin"], category: "Plastic Items" },
      { keywords: ["bulb", "matchbox", "broom", "tissue", "foil", "battery", "torch", "candle"], category: "Household Products" }
    ],
    medical: [
      { keywords: ["tab", "tablet", "paracetamol", "dolo", "pcm", "aspirin", "crocin", "calpol", "combiflam", "metformin", "pantocid"], category: "Tablets" },
      { keywords: ["cap", "capsule", "amoxicillin", "pantocid", "becosules", "omeprazole", "multivitamin cap"], category: "Capsules" },
      { keywords: ["syr", "syrup", "cough", "suspension", "gelusil", "alex", "benadryl", "grilinctus"], category: "Syrups" },
      { keywords: ["inj", "injection", "insulin", "tetanus", "iv fluid"], category: "Injections" },
      { keywords: ["mask", "gloves", "bandage", "cotton", "syringe", "needle", "surgical", "gauze"], category: "Surgical Items" },
      { keywords: ["bp", "sugar", "monitor", "oximeter", "thermometer", "bp machine", "nebulizer"], category: "Medical Equipment" },
      { keywords: ["protein", "supplement", "vitamin", "calcium", "horlicks", "ensure", "zincovit"], category: "Health Supplements" },
      { keywords: ["ayur", "chawanprash", "dabar", "patanjali", "badyanath", "himalaya", "ashwagandha"], category: "Ayurvedic Medicine" },
      { keywords: ["homeo", "dilution", "globules", "sbl", "reckeweg"], category: "Homeopathy" },
      { keywords: ["pediatric", "baby drops", "colicaid", "crocin drops"], category: "Baby Medicine" },
      { keywords: ["diabetic", "strips", "glucometer", "accu-chek", "one touch"], category: "Diabetic Care" },
      { keywords: ["bandaid", "dettol", "savlon", "ointment", "betadine", "moov", "volini", "iodex"], category: "First Aid" },
      { keywords: ["eno", "pudin hara", "otc", "spray", "strepsils", "vicks", "saridon"], category: "OTC Products" },
      { keywords: ["pads", "sanitary", "handwash", "sanitizer", "whisper", "stayfree", "dettol liquid"], category: "Personal Hygiene" },
      { keywords: ["nebulizer", "vaporizer", "wheelchair", "crutches", "heating pad"], category: "Medical Devices" }
    ],
    restaurant: [
      { keywords: ["chicken", "mutton", "egg", "fish", "non-veg", "meat", "pork", "kabab", "tikka"], category: "Non-Veg Items" },
      { keywords: ["fast food", "chowmein", "momos", "noodle", "spring roll", "pasta", "fries"], category: "Fast Food" },
      { keywords: ["pizza", "burger", "cheese pizza", "margherita"], category: "Pizza & Burger" },
      { keywords: ["manchurian", "fried rice", "soup", "chinese", "schezwan", "hakka"], category: "Chinese Food" },
      { keywords: ["dosa", "idli", "sambar", "vada", "uttapam", "south indian"], category: "South Indian" },
      { keywords: ["tea", "coffee", "chai", "latte", "cappuccino", "espresso"], category: "Tea & Coffee" },
      { keywords: ["coke", "pepsi", "sprite", "mojito", "drink", "shake", "mocktail", "lassi", "water bottle"], category: "Beverages" },
      { keywords: ["ice cream", "kulfi", "scoop", "sundae", "cornetto"], category: "Ice Cream" },
      { keywords: ["cake", "pastry", "brownie", "dessert", "gulab jamun", "rasgulla", "sweet"], category: "Desserts" },
      { keywords: ["paneer", "roti", "dal", "sabji", "veg", "naan", "paratha", "biryani veg", "rice veg"], category: "Veg Items" }
    ],
    fashion: [
      { keywords: ["jeans", "denim", "levis"], category: "Jeans" },
      { keywords: ["tshirt", "t-shirt", "polo", "tee"], category: "T-Shirts" },
      { keywords: ["shirt", "formal shirt", "casual shirt"], category: "Shirts" },
      { keywords: ["saree", "sari", "banarasi"], category: "Saree" },
      { keywords: ["pant", "trouser", "suit", "blazer", "men", "sherwani", "kurta men"], category: "Men Wear" },
      { keywords: ["kurti", "dress", "top", "women", "skirt", "lehenga", "gown"], category: "Women Wear" },
      { keywords: ["kids", "baby", "boy", "girl", "frock", "toddler"], category: "Kids Wear" },
      { keywords: ["shoe", "sandal", "slipper", "boot", "sneaker", "heel", "crocs", "footwear"], category: "Footwear" },
      { keywords: ["bag", "purse", "backpack", "wallet", "handbag"], category: "Bags" },
      { keywords: ["watch", "clock"], category: "Watches" },
      { keywords: ["makeup", "lipstick", "eyeliner", "foundation", "compact", "nail polish"], category: "Cosmetics" },
      { keywords: ["gold", "silver", "ring", "necklace", "jewel", "earring", "bracelet", "pendant"], category: "Jewellery" },
      { keywords: ["jacket", "sweater", "shawl", "muffler", "raincoat", "umbrella", "winter"], category: "Seasonal Collection" }
    ],
    electronics: [
      { keywords: ["phone", "smartphone", "iphone", "samsung", "oneplus", "redmi", "realme"], category: "Mobile Phones" },
      { keywords: ["laptop", "macbook", "notebook", "dell", "hp", "lenovo"], category: "Laptops" },
      { keywords: ["computer", "desktop", "monitor", "cpu", "keyboard", "mouse"], category: "Computers" },
      { keywords: ["tv", "television", "fridge", "refrigerator", "ac", "air conditioner", "cooler", "washing machine", "microwave"], category: "TV & Appliances" },
      { keywords: ["printer", "scanner", "canon", "epson", "hp printer"], category: "Printers" },
      { keywords: ["cctv", "camera", "dvr", "ip camera"], category: "CCTV" },
      { keywords: ["charger", "cable", "adapter", "usb cable", "hdmi", "power bank"], category: "Chargers" },
      { keywords: ["speaker", "headphone", "earphone", "earbuds", "soundbar", "home theater", "bluetooth speaker"], category: "Speakers" },
      { keywords: ["smart watch", "fitbit", "band", "apple watch"], category: "Smart Watches" },
      { keywords: ["led", "bulb", "light", "tube", "panel light", "syska", "philips led"], category: "LED Lights" },
      { keywords: ["router", "wifi", "switch", "lan", "modem", "tp-link"], category: "Networking Products" }
    ],
    hardware: [
      { keywords: ["pipe", "pvc", "fitting", "cpvc", "elbow", "tee pvc", "union"], category: "Pipes & Fittings" },
      { keywords: ["paint", "distemper", "primer", "asian paints", "brush paint", "wall putty"], category: "Paints" },
      { keywords: ["wire", "switch board", "plug", "socket", "electrical", "mcb", "fuse", "conduit"], category: "Electrical Items" },
      { keywords: ["cement", "ultratech", "am buja", "jk cement"], category: "Cement" },
      { keywords: ["tile", "marble", "granite", "ceramic"], category: "Tiles" },
      { keywords: ["hammer", "screwdriver", "tools", "wrench", "drill", "saw"], category: "Tools" },
      { keywords: ["tap", "valve", "faucet", "plumbing", "washer", "teflon tape"], category: "Plumbing" },
      { keywords: ["basin", "toilet", "commode", "sink", "sanitary", "shower"], category: "Sanitary" },
      { keywords: ["screw", "bolt", "nut", "nail", "fastener", "washer bolt"], category: "Fasteners" },
      { keywords: ["helmet", "safety shoes", "gloves safety", "vest", "harness"], category: "Safety Equipment" }
    ],
    mobile: [
      { keywords: ["phone", "smartphone", "android", "iphone"], category: "Smartphones" },
      { keywords: ["keypad", "feature phone", "nokia 105", "samsung guru"], category: "Feature Phones" },
      { keywords: ["tempered", "glass", "screen guard", "gorilla glass"], category: "Tempered Glass" },
      { keywords: ["cover", "case", "silicone case", "flip cover"], category: "Covers" },
      { keywords: ["charger", "adapter", "fast charger", "car charger"], category: "Chargers" },
      { keywords: ["earphone", "handsfree", "wired earphone"], category: "Earphones" },
      { keywords: ["smartwatch", "gadget", "ring light", "gimbal"], category: "Smart Gadgets" },
      { keywords: ["folder", "display", "battery mobile", "charging jack", "folder display"], category: "Mobile Parts" },
      { keywords: ["bluetooth", "neckband", "tws", "earbuds", "wireless speaker"], category: "Bluetooth Devices" }
    ],
    cosmetic: [
      { keywords: ["makeup", "lipstick", "kajal", "foundation", "eyeliner", "compact", "mascara"], category: "Makeup" },
      { keywords: ["facewash", "face wash", "cleanser", "himalaya face wash"], category: "Face Wash" },
      { keywords: ["shampoo", "conditioner", "dove", "clinic plus", "pantene"], category: "Shampoo" },
      { keywords: ["hair oil", "almond oil", "coconut oil hair", "amla oil"], category: "Hair Oil" },
      { keywords: ["perfume", "deo", "deodorant", "body spray", "fogg"], category: "Perfume" },
      { keywords: ["serum", "sunscreen", "scrub", "toner", "skin care"], category: "Skin Care" },
      { keywords: ["cream", "beauty cream", "fairness", "ponds", "nivea"], category: "Beauty Cream" },
      { keywords: ["wax", "salon", "hair color", "bleach", "hair gel"], category: "Salon Products" },
      { keywords: ["nail", "nail polish", "nail remover", "acrylic"], category: "Nail Products" }
    ],
    footwear: [
      { keywords: ["shoe", "shoes", "sneaker", "boots", "formal shoes", "sports shoes"], category: "Shoes" },
      { keywords: ["sandal", "sandals", "crocs sandal"], category: "Sandals" },
      { keywords: ["slipper", "slippers", "chप्पल", "hawai slipper"], category: "Slippers" },
      { keywords: ["sports", "running shoes", "nike", "adidas", "puma", "sports shoes"], category: "Sports Shoes" },
      { keywords: ["kids footwear", "child shoes", "baby booties"], category: "Kids Footwear" },
      { keywords: ["formal", "leather shoes", "oxford", "derby", "formal shoes"], category: "Formal Shoes" },
      { keywords: ["socks", "shoe polish", "shoe lace", "insole"], category: "Shoe Accessories" }
    ],
    jewellery: [
      { keywords: ["gold", "22k", "24k", "gold ring", "gold chain", "gold necklace"], category: "Gold Jewellery" },
      { keywords: ["silver", "925", "silver ring", "silver payal", "silver coins"], category: "Silver Jewellery" },
      { keywords: ["diamond", "solitaire", "diamond ring", "real diamond"], category: "Diamond Jewellery" },
      { keywords: ["coin", "gold coin", "silver coin"], category: "Coins" },
      { keywords: ["bridal", "wedding", "necklace set", "choker"], category: "Bridal Collection" },
      { keywords: ["artificial", "brass", "fashion jewellery", "bangles artificial"], category: "Artificial Jewellery" }
    ],
    bakery: [
      { keywords: ["cake", "birthday cake", "chocolate cake", "vanilla cake"], category: "Cakes" },
      { keywords: ["pastry", "pineapple pastry", "black forest pastry"], category: "Pastry" },
      { keywords: ["bread", "white bread", "brown bread", "pav", "bun"], category: "Bread" },
      { keywords: ["cookie", "cookies", "biscuits bakery", "macaron"], category: "Cookies" },
      { keywords: ["namkeen", "sev", "bhujia", "bakery namkeen"], category: "Namkeen" },
      { keywords: ["chocolate", "dairy milk", "cadbury", "kitkat", "munch"], category: "Chocolates" },
      { keywords: ["cold drink", "pepsi", "coke", "soft drink"], category: "Cold Drinks" },
      { keywords: ["snacks", "patties", "burger bakery", "pizza slice", "samosa"], category: "Snacks" }
    ],
    stationery: [
      { keywords: ["book", "books", "novel", "textbook", "guide", "dictionary"], category: "Books" },
      { keywords: ["pen", "ball pen", "gel pen", "pencil", "sketch pen", "marker"], category: "Pens" },
      { keywords: ["school bag", "geometry box", "ruler", "eraser", "sharpener", "compass"], category: "School Items" },
      { keywords: ["stapler", "tape", "office", "calculator", "scissors", "glue"], category: "Office Supplies" },
      { keywords: ["file", "folder", "report file", "cobra file"], category: "Files" },
      { keywords: ["a4 paper", "printer paper", "rim paper", "photocopy paper"], category: "Printer Paper" },
      { keywords: ["canvas", "paint brush", "acrylic color", "sketchbook", "crayon", "art"], category: "Art Materials" }
    ],
    supermarket: [
      { keywords: ["rice", "atta", "wheat", "dal", "oil", "sugar", "salt", "flour", "ghee", "masala", "spice"], category: "Groceries & Staples" },
      { keywords: ["fruit", "vegetable", "onion", "potato", "tomato", "apple", "banana", "mango", "sabzi"], category: "Fruits & Vegetables" },
      { keywords: ["milk", "curd", "paneer", "cheese", "butter", "frozen", "ice cream", "yogurt"], category: "Dairy & Frozen" },
      { keywords: ["chips", "biscuit", "snack", "coke", "pepsi", "juice", "water", "soda", "drink", "namkeen"], category: "Snacks & Beverages" },
      { keywords: ["shampoo", "soap", "cream", "lotion", "deo", "perfume", "toothpaste", "razor"], category: "Personal Care" },
      { keywords: ["utensil", "cookware", "pan", "pot", "knife", "kitchen", "plate", "glass", "bottle"], category: "Home & Kitchen" },
      { keywords: ["shirt", "tshirt", "jeans", "dress", "saree", "kurti", "trouser", "jacket"], category: "Clothing & Fashion" },
      { keywords: ["phone", "charger", "earphone", "speaker", "cable", "power bank", "led", "gadget"], category: "Electronics & Gadgets" },
      { keywords: ["toy", "game", "puzzle", "doll", "car toy", "lego", "board game"], category: "Toys & Games" },
      { keywords: ["pen", "pencil", "notebook", "book", "file", "eraser", "school"], category: "Stationery & Books" },
      { keywords: ["vitamin", "supplement", "protein", "health", "wellness", "herbal"], category: "Health & Wellness" },
      { keywords: ["cake", "pastry", "bread", "cookie", "muffin", "brownie", "sweet"], category: "Bakery & Confectionery" },
      { keywords: ["diaper", "baby", "wipes", "cerelac", "feeding", "infant"], category: "Baby Products" },
      { keywords: ["detergent", "cleaner", "mop", "broom", "harpic", "surf", "vim"], category: "Cleaning & Household" },
      { keywords: ["pet", "dog food", "cat food", "pet treat", "pet toy"], category: "Pet Supplies" },
      { keywords: ["ready to eat", "instant", "noodle", "pasta", "soup mix", "meal"], category: "Ready to Eat" }
    ]
  };

  const specificRules = rules[normType] || [];
  for (const rule of specificRules) {
    if (rule.keywords.some(kw => name.includes(kw))) {
      const matchedCat = SHOP_TAXONOMY[normType].categories.find(c => c.name === rule.category);
      if (matchedCat) {
        return matchedCat;
      }
    }
  }

  // General fallbacks across all categories
  for (const sType of Object.keys(rules)) {
    for (const rule of rules[sType]) {
      if (rule.keywords.some(kw => name.includes(kw))) {
        // Find if this category exists in the active shop taxonomy
        if (SHOP_TAXONOMY[normType]) {
          const matchedInActive = SHOP_TAXONOMY[normType].categories.find(
            c => c.name.toLowerCase() === rule.category.toLowerCase()
          );
          if (matchedInActive) {
            return matchedInActive;
          }
        }
      }
    }
  }

  return null;
}
