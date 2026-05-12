import { db } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  deleteDoc
} from "firebase/firestore";

const INITIAL_CATEGORIES = [
  { name: "Hot Drinks", order: 1 },
  { name: "Cold Drinks", order: 2 },
  { name: "Food", order: 3 },
  { name: "Bakery & Desserts", order: 4 },
  { name: "Smoke", order: 5 }
];

const INITIAL_MENU = [
  // Hot Drinks
  {
    name: "Milk Tea",
    price: "35",
    category: "Hot Drinks",
    desc: "Our signature blend of CTC tea and creamy milk.",
    stock: true,
    tag: "Local Favorite"
  },
  {
    name: "Black Tea",
    price: "20",
    category: "Hot Drinks",
    desc: "A classic, strong mountain black tea.",
    stock: true,
    tag: null
  },
  {
    name: "Milk Masala Tea",
    price: "45",
    category: "Hot Drinks",
    desc: "Spiced milk tea brewed with fresh ginger and mountain spices.",
    stock: true,
    tag: "Bestseller"
  },
  {
    name: "Black Masala Tea",
    price: "25",
    category: "Hot Drinks",
    desc: "Invigorating black tea infused with aromatic spices.",
    stock: true,
    tag: null
  },
  {
    name: "Milk Coffee",
    price: "60",
    category: "Hot Drinks",
    desc: "Smooth and creamy café-style milk coffee.",
    stock: true,
    tag: null
  },
  {
    name: "Black Coffee",
    price: "40",
    category: "Hot Drinks",
    desc: "Bold and dark brewed mountain coffee.",
    stock: true,
    tag: null
  },
  {
    name: "Hot Lemon",
    price: "50",
    category: "Hot Drinks",
    desc: "Wellness brew — zesty lemon, ginger, and honey.",
    stock: true,
    tag: null
  },
  {
    name: "Hot Lemon, Honey And Ginger",
    price: "100",
    category: "Hot Drinks",
    desc: "Wellness brew — zesty lemon, ginger, and honey.",
    stock: true,
    tag: "Wellness"
  },
  {
    name: "Hot Lemon With Ginger",
    price: "100",
    category: "Hot Drinks",
    desc: "Soothing hot lemon water infused with fresh mountain ginger.",
    stock: true,
    tag: null
  },
  {
    name: "Hot Chocolate",
    price: "160",
    category: "Hot Drinks",
    desc: "Velvety, rich chocolate with a dusting of cocoa.",
    stock: true,
    tag: null,
  },
  {
    name: "Flavoured Tea(Peach/Lemon)",
    price: "70",
    category: "Hot Drinks",
    desc: "Aromatic mountain tea with your choice of fruit infusion.",
    stock: true,
    tag: null,
    options: ["Peach","Lemon"]
  },

  // Cold Drinks
  {
    name: "Cold Coffee",
    price: "180",
    category: "Cold Drinks",
    desc: "Refreshing chilled coffee with a smooth, creamy finish.",
    stock: true,
    tag: null
  },
  {
    name: "Cold Lemon",
    price: "70",
    category: "Cold Drinks",
    desc: "Zesty and chilled lemon cooler, perfect for a hot day.",
    stock: true,
    tag: null
  },
  {
    name: "Flavoured Ice Tea(Peach/Lemon)",
    price: "160",
    category: "Cold Drinks",
    desc: "Chilled mountain tea infused with refreshing fruit flavours.",
    stock: true,
    tag: null,
    options: ["Peach","Lemon"]
  },
  {
    name: "Lassi(Seasonal/Banana/Mango)",
    price: "150",
    category: "Cold Drinks",
    desc: "Traditional yogurt-based drink in your favorite fruit flavor.",
    stock: true,
    tag: null,
    options: ["Seasonal", "Banana", "Mango"]
  },
  {
    name: "Plain Lassi",
    price: "115",
    category: "Cold Drinks",
    desc: "Thick, creamy yogurt lassi with seasonal fruits.",
    stock: true,
    tag: null
  },
  {
    name: "Mojito",
    price: "150",
    category: "Cold Drinks",
    desc: "Fresh mint, lime, and sparkling soda.",
    stock: true, tag: null
  },
  {
    name: "Blue Lagoon",
    price: "140",
    category: "Cold Drinks",
    desc: "A vibrant citrus punch with a hint of blue Curacao.",
    stock: true,
    tag: null
  },
  {
    name: "Mickey Mouse 2",
    price: "140",
    category: "Cold Drinks",
    desc: "A fun and colourful layered mocktail for all ages.",
    stock: true,
    tag: null
  },
  {
    name: "Masala(Coke/Sprite)",
    price: "90",
    category: "Cold Drinks",
    desc: "Your favorite soda with a spicy Nepali masala twist.",
    stock: true,
    tag: null,
    options: ["Coke", "Sprite"]
  },
  {
    name: "Lemon Sprite",
    price: "90",
    category: "Cold Drinks",
    desc: "Refreshing Sprite with a zesty fresh lemon kick.",
    stock: true,
    tag: null
  },
  {
    name: "Blue Angel",
    price: "180",
    category: "Cold Drinks",
    desc: "A vibrant, blue-themed tropical mocktail experience.",
    stock: true,
    tag: null
  },
  {
    name: "Milkshake",
    price: "225",
    category: "Cold Drinks",
    desc: "Creamy, thick milkshake in various delicious flavors.",
    stock: true,
    tag: "Popular",
    options: ["KitKate", "Oreo", "Vanilla", "Chocolate", "Mocha"]
  },

  // Food
  {
    name: "Buff Momo (Steam/Fry)",
    price: "120 / 130",
    category: "Food",
    desc: "Juicy buff fillings wrapped in thin dough, steamed.",
    stock: true,
    tag: "Must Try"
  },
  {
    name: "Chicken Momo (Steam/Fry)",
    price: "150 / 160",
    category: "Food",
    desc: "Premium chicken breast filling with local spices.",
    stock: true,
    tag: "Popular"
  },
  {
    name: "Veg Momo (Steam/Fry)",
    price: "100 / 120",
    category: "Food",
    desc: "Fresh garden vegetables and paneer filling.",
    stock: true,
    tag: null
  },
  {
    name: "Chowmein (Veg/Buff)",
    price: "80 / 120",
    category: "Food",
    desc: "Stir-fried noodles with fresh veggies or buff.",
    stock: true,
    tag: null
  },
  {
    name: "Chow Chow Sadheko",
    price: "60",
    category: "Food",
    desc: "Chow Chow mixed with fresh onions, tomato, and spices.",
    stock: true,
    tag: null
  },
  {
    name: "Chatepatey",
    price: "50",
    category: "Food",
    desc: "A popular Nepali spicy and tangy street snack.",
    stock: true,
    tag: null
  },
  {
    name: "Bull Chilly",
    price: "180",
    category: "Food",
    desc: "Spicy stir-fried buffalo meat with peppers and onions.",
    stock: true,
    tag: null
  },
  {
    name: "French Fries",
    price: "120",
    category: "Food",
    desc: "Classic golden crispy potato fries, lightly salted.",
    stock: true,
    tag: null
  },
  {
    name: "Sandwich (Veg/Chicken)",
    price: "160 / 200",
    category: "Food",
    desc: "Freshly made toasted sandwich with your choice of filling.",
    stock: true,
    tag: null
  },
  {
    name: "Chicken Wings",
    price: "35",
    category: "Food",
    desc: "Crispy, seasoned chicken wings served hot and fresh.",
    stock: true,
    tag: null
  },
  {
    name: "Sausages (Buff/Chicken)",
    price: "40 / 50",
    category: "Food",
    desc: "Savory grilled sausages, perfect for a quick snack.",
    stock: true,
    tag: null
  },

  // Bakery & Desserts
  {
    name: "Plain Cake",
    price: "40",
    category: "Bakery & Desserts",
    desc: "Freshly baked soft sponge cake slice.",
    stock: false,
    tag: null
  },
  {
    name: "Chocolate Brownie", price: "80",
    category: "Bakery & Desserts",
    desc: "Gooey, rich chocolate brownie.",
    stock: false,
    tag: "Sweet"
  },
  {
    name: "Donut",
    price: "50",
    category: "Bakery & Desserts",
    desc: "Sugar-glazed or chocolate-topped donut.", stock: false,
    tag: null
  },

  // Smoke
  {
    name: "Hookha",
    price: "500",
    category: "Smoke",
    desc: "Premium flavored hookah sessions.",
    stock: true,
    tag: "Premium",
    options: ["Double Apple", "Mint", "Grapes", "Blueberry", "Pan Raas", "Watermelon", "Mix Fruit"]
  },
  {
    name: "Surya (Red)",
    price: "20",
    category: "Smoke",
    desc: "Premium Surya cigarette.",
    stock: true,
    tag: null
  },
  {
    name: "Surya (Arctic Ball)",
    price: "25",
    category: "Smoke",
    desc: "Cooling mint Surya cigarette.",
    stock: true,
    tag: null
  },
  {
    name: "Shikhar Ice",
    price: "15",
    category: "Smoke",
    desc: "Crisp ice-flavored cigarette.",
    stock: true,
    tag: null
  },
];

async function clearCollection(collectionName) {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

export async function initializeDatabase() {
  console.log("🚀 Starting Database Organization...");

  try {
    // 1. Clear existing data to avoid duplicates
    console.log("🧹 Clearing old data...");
    await clearCollection("categories");
    await clearCollection("menu");
    console.log("✨ Collections cleared.");

    // 2. Setup Categories
    const catCol = collection(db, "categories");
    for (const cat of INITIAL_CATEGORIES) {
      await addDoc(catCol, cat);
    }
    console.log("✅ Categories Organized.");

    // 3. Setup Menu
    const menuCol = collection(db, "menu");
    for (const item of INITIAL_MENU) {
      await addDoc(menuCol, item);
    }
    console.log("✅ Menu Organized.");

    // 4. Setup Shop Settings
    const settingsRef = doc(db, "config", "shopSettings");
    await setDoc(settingsRef, {
      isSiteDown: false,
      manualOccupancy: {},
      // Preserving tableCount and tableNames by not including them here 
      // or ensuring they only set if missing.
    }, { merge: true });
    console.log("✅ Shop Settings Organized.");

    alert("🎉 Database is now fully organized and populated!");
    window.location.reload();
  } catch (error) {
    console.error("❌ Error organizing database:", error);
    alert("Error organizing database. Check console for details.");
  }
}
