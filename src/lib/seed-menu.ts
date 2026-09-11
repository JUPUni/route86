import type { MenuCategory, MenuItem, OptionGroup } from "./types";

/**
 * Starter menu for Route 86. Built from what the restaurant has actually shown publicly:
 * poke bowls, sushi rolls, fried rice, ramen (the logo), $1 Wingman Wednesday wings,
 * First Class Monday margaritas (Layover Lime / Golden Hour / Berry Smooth Landing) and beer buckets,
 * plus press coverage describing "bold spices, noodle dishes, and creative small plates with a local twist".
 *
 * Prices are placeholders in USD. Everything here is editable in the admin dashboard once the
 * database is connected; this file also seeds `supabase/seed.sql` and powers demo mode.
 */

const wingSauces: OptionGroup = {
  id: "sauce",
  name: "Sauce",
  required: true,
  type: "single",
  choices: [
    { id: "sweet-chili-jerk", name: "Sweet Chili Jerk" },
    { id: "gochujang-bbq", name: "Gochujang BBQ" },
    { id: "honey-soy-garlic", name: "Honey Soy Garlic" },
    { id: "scotch-bonnet-buffalo", name: "Scotch Bonnet Buffalo 🔥" },
  ],
};

const bowlBase: OptionGroup = {
  id: "base",
  name: "Base",
  required: true,
  type: "single",
  choices: [
    { id: "sushi-rice", name: "Sushi rice" },
    { id: "brown-rice", name: "Brown rice" },
    { id: "mixed-greens", name: "Mixed greens" },
  ],
};

const protein: OptionGroup = {
  id: "protein",
  name: "Protein",
  required: true,
  type: "single",
  choices: [
    { id: "veg", name: "Vegetable" },
    { id: "chicken", name: "Chicken", priceDeltaCents: 200 },
    { id: "shrimp", name: "Shrimp", priceDeltaCents: 400 },
  ],
};

const spice: OptionGroup = {
  id: "spice",
  name: "Spice level",
  type: "single",
  choices: [
    { id: "mild", name: "Mild" },
    { id: "medium", name: "Medium" },
    { id: "hot", name: "Island hot 🌶️" },
  ],
};

const extras: OptionGroup = {
  id: "extras",
  name: "Extras",
  type: "multi",
  choices: [
    { id: "avocado", name: "Extra avocado", priceDeltaCents: 200 },
    { id: "egg", name: "Soft egg", priceDeltaCents: 150 },
    { id: "plantain", name: "Sweet plantain", priceDeltaCents: 200 },
  ],
};

export const SEED_CATEGORIES: MenuCategory[] = [
  { id: "cat-small-plates", slug: "small-plates", name: "Small Plates", tagline: "Boarding snacks. Built to share.", sort_order: 1, active: true },
  { id: "cat-wings", slug: "wings", name: "Wings", tagline: "Bold flavor. Saucy & irresistible.", sort_order: 2, active: true },
  { id: "cat-sushi", slug: "sushi", name: "Sushi & Rolls", tagline: "Hand-rolled, island-fresh.", sort_order: 3, active: true },
  { id: "cat-bowls", slug: "bowls", name: "Poke & Bowls", tagline: "Fresh, colourful, made for your cravings.", sort_order: 4, active: true },
  { id: "cat-noodles", slug: "noodles", name: "Noodles & Ramen", tagline: "The bowl on our logo.", sort_order: 5, active: true },
  { id: "cat-mains", slug: "mains", name: "Rice & Mains", tagline: "Where Asia meets the Caribbean.", sort_order: 6, active: true },
  { id: "cat-sides", slug: "sides", name: "Sides", tagline: null, sort_order: 7, active: true },
  { id: "cat-drinks", slug: "drinks", name: "Drinks & Cocktails", tagline: "First class, every day.", sort_order: 8, active: true },
];

type SeedItem = Omit<MenuItem, "id" | "category_id" | "available" | "sort_order"> & { category: string };

const items: SeedItem[] = [
  // Small plates
  { category: "small-plates", slug: "jerk-chicken-gyoza", name: "Jerk Chicken Gyoza", description: "Six pan-seared dumplings, jerk-spiced chicken, scallion, ponzu dip.", price_cents: 1200, image_url: null, tags: ["popular", "spicy"], options: [], featured: false },
  { category: "small-plates", slug: "coconut-shrimp-tempura", name: "Coconut Shrimp Tempura", description: "Crispy coconut batter, sweet chili mango sauce.", price_cents: 1400, image_url: null, tags: ["popular"], options: [], featured: false },
  { category: "small-plates", slug: "saltfish-spring-rolls", name: "Saltfish Spring Rolls", description: "Anguillian saltfish, peppers and onion in a crackly wrapper, tamarind dip.", price_cents: 1100, image_url: null, tags: [], options: [], featured: false },
  { category: "small-plates", slug: "jerk-pork-belly-bao", name: "Jerk Pork Belly Bao", description: "Two fluffy buns, sticky jerk pork belly, pickled cucumber, hoisin.", price_cents: 1300, image_url: null, tags: ["spicy"], options: [], featured: false },
  { category: "small-plates", slug: "chili-salt-edamame", name: "Chili-Salt Edamame", description: "Steamed edamame, sea salt, chili flakes, lime.", price_cents: 700, image_url: null, tags: ["veg", "gf"], options: [], featured: false },
  { category: "small-plates", slug: "miso-plantain-bites", name: "Miso-Glazed Plantain Bites", description: "Caramelised sweet plantain, miso butter, toasted sesame.", price_cents: 900, image_url: null, tags: ["veg"], options: [], featured: false },
  // Wings
  { category: "wings", slug: "route-86-wings-6", name: "Route 86 Wings · 6 pc", description: "Twice-fried, tossed in your sauce, sesame and scallion. $1 a piece on Wingman Wednesday (applied in store).", price_cents: 1200, image_url: "/menu/wings.jpg", tags: ["popular"], options: [wingSauces], featured: true },
  { category: "wings", slug: "route-86-wings-12", name: "Route 86 Wings · 12 pc", description: "Bring a wingman. Twelve wings, pick one sauce or split two.", price_cents: 2200, image_url: "/menu/wings.jpg", tags: [], options: [wingSauces], featured: false },
  // Sushi
  { category: "sushi", slug: "dragon-roll", name: "Dragon Roll", description: "Eel, cucumber, avocado on top, eel sauce, sesame, scallion.", price_cents: 1800, image_url: "/menu/sushi.jpg", tags: ["popular"], options: [], featured: true },
  { category: "sushi", slug: "island-spicy-tuna-roll", name: "Island Spicy Tuna Roll", description: "Spicy tuna, cucumber, scotch bonnet aioli, crispy shallot.", price_cents: 1600, image_url: null, tags: ["spicy"], options: [], featured: false },
  { category: "sushi", slug: "crunchy-mango-shrimp-roll", name: "Crunchy Mango Shrimp Roll", description: "Tempura shrimp, mango, avocado, tempura crunch, sweet chili drizzle.", price_cents: 1700, image_url: null, tags: [], options: [], featured: false },
  { category: "sushi", slug: "salmon-avocado-roll", name: "Salmon Avocado Roll", description: "Fresh salmon, avocado, sesame.", price_cents: 1500, image_url: null, tags: [], options: [], featured: false },
  { category: "sushi", slug: "veggie-rainbow-roll", name: "Veggie Rainbow Roll", description: "Avocado, cucumber, mango, carrot, pickled radish.", price_cents: 1300, image_url: null, tags: ["veg"], options: [], featured: false },
  { category: "sushi", slug: "sushi-platter-16", name: "Sushi Platter · 16 pc", description: "Chef's choice of four rolls. Perfect for two.", price_cents: 3200, image_url: null, tags: [], options: [], featured: false },
  // Bowls
  { category: "bowls", slug: "ahi-tuna-poke-bowl", name: "Ahi Tuna Poke Bowl", description: "Marinated ahi tuna, edamame, seaweed salad, mango, avocado, cucumber, carrot, furikake, spicy mayo.", price_cents: 1900, image_url: "/menu/poke.jpg", tags: ["popular", "gf"], options: [bowlBase, extras], featured: true },
  { category: "bowls", slug: "salmon-poke-bowl", name: "Salmon Poke Bowl", description: "Salmon, edamame, seaweed, mango, avocado, ponzu, sesame.", price_cents: 1900, image_url: null, tags: ["gf"], options: [bowlBase, extras], featured: false },
  { category: "bowls", slug: "jerk-chicken-bowl", name: "Jerk Chicken Bowl", description: "Grilled jerk chicken, pineapple salsa, slaw, plantain, coconut rice.", price_cents: 1700, image_url: null, tags: ["spicy"], options: [bowlBase, extras], featured: false },
  { category: "bowls", slug: "tofu-teriyaki-bowl", name: "Tofu Teriyaki Bowl", description: "Crispy tofu, teriyaki glaze, broccoli, carrot, sesame.", price_cents: 1500, image_url: null, tags: ["veg"], options: [bowlBase, extras], featured: false },
  // Noodles
  { category: "noodles", slug: "route-86-ramen", name: "Route 86 Ramen", description: "Rich pork broth, chashu, soft egg, corn, scallion, nori. The bowl on our sign.", price_cents: 1800, image_url: null, tags: ["popular"], options: [spice], featured: true },
  { category: "noodles", slug: "curry-goat-ramen", name: "Curry Goat Ramen", description: "Slow-braised Caribbean curry goat over ramen noodles, scotch bonnet oil, scallion.", price_cents: 2100, image_url: null, tags: ["spicy", "signature"], options: [spice], featured: true },
  { category: "noodles", slug: "coconut-curry-shrimp-udon", name: "Coconut Curry Shrimp Udon", description: "Thick udon, coconut curry broth, shrimp, bok choy, lime.", price_cents: 2000, image_url: null, tags: [], options: [spice], featured: false },
  { category: "noodles", slug: "lobster-garlic-butter-lo-mein", name: "Anguilla Lobster Lo Mein", description: "Local lobster, garlic butter, egg noodles, peppers, scallion. Market availability.", price_cents: 3400, image_url: null, tags: ["signature"], options: [], featured: false },
  { category: "noodles", slug: "veggie-yaki-soba", name: "Veggie Yaki Soba", description: "Stir-fried soba, cabbage, carrot, mushroom, sweet soy.", price_cents: 1400, image_url: null, tags: ["veg"], options: [], featured: false },
  // Mains
  { category: "mains", slug: "house-fried-rice", name: "House Fried Rice", description: "Wok-tossed jasmine rice, egg, peppers, scallion, sesame. Pick your protein.", price_cents: 1300, image_url: "/menu/fried_rice.jpg", tags: ["popular"], options: [protein, spice], featured: true },
  { category: "mains", slug: "oxtail-fried-rice", name: "Oxtail Fried Rice", description: "Braised oxtail, butter beans, wok rice, thyme, scallion.", price_cents: 2400, image_url: null, tags: ["signature"], options: [], featured: false },
  { category: "mains", slug: "crispy-snapper-sweet-chili", name: "Crispy Snapper, Sweet Chili", description: "Whole-fried local snapper, sweet chili glaze, rice and peas, slaw.", price_cents: 2600, image_url: null, tags: ["gf"], options: [], featured: false },
  { category: "mains", slug: "teriyaki-salmon", name: "Teriyaki Salmon", description: "Glazed salmon fillet, jasmine rice, sesame greens.", price_cents: 2400, image_url: null, tags: [], options: [], featured: false },
  // Sides
  { category: "sides", slug: "jasmine-rice", name: "Jasmine Rice", description: null, price_cents: 400, image_url: null, tags: ["veg", "gf"], options: [], featured: false },
  { category: "sides", slug: "rice-and-peas", name: "Rice & Peas", description: "Coconut, thyme, pigeon peas.", price_cents: 500, image_url: null, tags: ["veg", "gf"], options: [], featured: false },
  { category: "sides", slug: "sweet-plantains", name: "Sweet Plantains", description: null, price_cents: 500, image_url: null, tags: ["veg", "gf"], options: [], featured: false },
  { category: "sides", slug: "seaweed-salad", name: "Seaweed Salad", description: null, price_cents: 600, image_url: null, tags: ["veg"], options: [], featured: false },
  { category: "sides", slug: "miso-soup", name: "Miso Soup", description: null, price_cents: 500, image_url: null, tags: ["veg"], options: [], featured: false },
  { category: "sides", slug: "togarashi-fries", name: "Togarashi Fries", description: "Crispy fries, Japanese chili salt, spicy mayo.", price_cents: 600, image_url: null, tags: ["veg"], options: [], featured: false },
  // Drinks
  { category: "drinks", slug: "layover-lime-margarita", name: "Layover Lime Margarita", description: "Classic lime, salt rim. First Class Mondays: 1 for $10, 2 for $15.", price_cents: 1200, image_url: "/menu/marg_lime.jpg", tags: ["21+"], options: [], featured: false },
  { category: "drinks", slug: "golden-hour-margarita", name: "Golden Hour Margarita", description: "Passion fruit and mango, sugar rim.", price_cents: 1200, image_url: "/menu/marg_golden.jpg", tags: ["21+"], options: [], featured: false },
  { category: "drinks", slug: "berry-smooth-landing-margarita", name: "Berry Smooth Landing", description: "Strawberry margarita, fresh berries.", price_cents: 1200, image_url: "/menu/marg_berry.jpg", tags: ["21+"], options: [], featured: false },
  { category: "drinks", slug: "beer-bucket", name: "Beer Bucket · 6", description: "Six ice-cold beers. Thirsty Thursday: buy 5 get 1 free.", price_cents: 2700, image_url: "/menu/beer_bucket.jpg", tags: ["21+"], options: [{ id: "beer", name: "Beer", required: true, type: "single", choices: [{ id: "carib", name: "Carib" }, { id: "presidente", name: "Presidente" }, { id: "heineken", name: "Heineken", priceDeltaCents: 300 }] }], featured: false },
  { category: "drinks", slug: "rum-punch", name: "Route 86 Rum Punch", description: "Island rum, passion fruit, nutmeg.", price_cents: 900, image_url: null, tags: ["21+"], options: [], featured: false },
  { category: "drinks", slug: "sorrel-iced-tea", name: "Sorrel Iced Tea", description: "House-brewed, ginger, lime.", price_cents: 400, image_url: null, tags: ["veg"], options: [], featured: false },
  { category: "drinks", slug: "soft-drink", name: "Soft Drink", description: "Coke, Diet Coke, Sprite, Ting.", price_cents: 300, image_url: null, tags: [], options: [], featured: false },
  { category: "drinks", slug: "bottled-water", name: "Bottled Water", description: null, price_cents: 200, image_url: null, tags: [], options: [], featured: false },
];

export const SEED_ITEMS: MenuItem[] = items.map((it, i) => {
  const cat = SEED_CATEGORIES.find((c) => c.slug === it.category)!;
  const { category: _c, ...rest } = it;
  void _c;
  return { id: `item-${it.slug}`, category_id: cat.id, available: true, sort_order: i + 1, ...rest };
});
