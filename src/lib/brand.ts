/**
 * Route 86 brand + business facts.
 * Sources: facebook.com/p/Route-86-Restaurant-61579641260899, instagram.com/route86restaurant,
 * press coverage of Anguilla's 2026 openings. Anything marked PLACEHOLDER should be confirmed
 * with the owner and can be edited in the admin Settings page once the database is connected.
 */
export const BRAND = {
  name: "Route 86",
  legalName: "Route 86 Restaurant",
  tagline: "Asian · Caribbean Fusion",
  taglineLong: "Asian–Caribbean fusion with a twist",
  chef: 'Chef Raymond "Rana" Adams',
  instagram: "route86restaurant",
  instagramUrl: "https://www.instagram.com/route86restaurant/",
  facebookUrl: "https://www.facebook.com/p/Route-86-Restaurant-61579641260899/",
  phoneDisplay: "+1 (264) 235-8686",
  phoneE164: "+12642358686",
  whatsappE164: "+12642358686", // PLACEHOLDER: confirm the store's WhatsApp number
  email: "hello@route86.ai", // PLACEHOLDER: replace with the store's real inbox
  address: {
    line1: "George Hill Main Road",
    line2: "Next to Clayton J. Lloyd International Airport (AXA)",
    village: "George Hill",
    island: "Anguilla",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Route+86+Restaurant+George+Hill+Anguilla",
  },
  currency: "USD",
  colors: {
    orange: "#D95A00",
    orangeBright: "#F26B12",
    charcoal: "#1B1B1B",
    cream: "#F6EFE4",
  },
} as const;

/** Weekly specials pulled from the restaurant's own Facebook promos. */
export const WEEKLY_SPECIALS = [
  {
    day: "Monday",
    slug: "margarita-monday",
    title: "First Class Mondays",
    kicker: "Margarita Edition",
    deal: "1 for $10 · 2 for $15",
    blurb: "Layover Lime, Golden Hour, or Berry Smooth Landing. Pick your seat.",
    image: "/menu/marg_golden.jpg",
  },
  {
    day: "Wednesday",
    slug: "wingman-wednesday",
    title: "Wingman Wednesday",
    kicker: "$1 a piece",
    deal: "Bold flavor. Saucy & irresistible.",
    blurb: "Good wings. Good vibes. Good company. Tag your wingman.",
    image: "/menu/wings.jpg",
  },
  {
    day: "Thursday",
    slug: "thirsty-thursday",
    title: "Thirsty Thursday",
    kicker: "Buy 5 beers, get 1 free",
    deal: "Grab a bucket.",
    blurb: "Good beer. Good food. Good vibes. Share the good times.",
    image: "/menu/beer_bucket.jpg",
  },
] as const;

export const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Aviation-flavoured status copy, matching the restaurant's own "First Class / Smooth Landing" voice. */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; flavor: string; customer: string; step: number }
> = {
  received: {
    label: "Received",
    flavor: "Now boarding",
    customer: "We've got your order and the kitchen has been alerted.",
    step: 1,
  },
  preparing: {
    label: "Preparing",
    flavor: "In flight",
    customer: "Chef is on it. Your food is being made fresh right now.",
    step: 2,
  },
  ready: {
    label: "Ready",
    flavor: "Smooth landing",
    customer: "Your order is ready! Come and get it while it's hot.",
    step: 3,
  },
  out_for_delivery: {
    label: "On the way",
    flavor: "Final approach",
    customer: "Your order has left the kitchen and is on its way to you.",
    step: 3,
  },
  completed: {
    label: "Completed",
    flavor: "Arrived",
    customer: "Enjoy! Thanks for riding Route 86.",
    step: 4,
  },
  cancelled: {
    label: "Cancelled",
    flavor: "Grounded",
    customer: "This order was cancelled. Call us if you have any questions.",
    step: 0,
  },
};

export type FulfillmentType = "pickup" | "delivery";
export type PaymentMethod = "pay_at_pickup" | "cash_on_delivery" | "card_on_delivery";
