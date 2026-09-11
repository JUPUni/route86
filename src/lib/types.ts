import type { FulfillmentType, OrderStatus, PaymentMethod } from "./brand";

export type OptionChoice = { id: string; name: string; priceDeltaCents?: number };
export type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  /** "single" = radio, "multi" = checkboxes */
  type: "single" | "multi";
  choices: OptionChoice[];
};

export type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  sort_order: number;
  active: boolean;
};

export type MenuItem = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  tags: string[];
  options: OptionGroup[];
  available: boolean;
  featured: boolean;
  sort_order: number;
};

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  selections: { groupId: string; groupName: string; choiceId: string; choiceName: string; priceDeltaCents: number }[];
  notes?: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  selections: CartLine["selections"];
  notes: string | null;
};

export type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  fulfillment_type: FulfillmentType;
  payment_method: PaymentMethod;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string | null;
  notes: string | null;
  notify_whatsapp: boolean;
  notify_email: boolean;
  subtotal_cents: number;
  delivery_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  eta_minutes: number | null;
  cancel_reason: string | null;
  source: string;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  items?: OrderItem[];
};

export type StoreSettings = {
  id: number;
  store_open: boolean;
  accepting_orders: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  delivery_fee_cents: number;
  delivery_minimum_cents: number;
  tax_rate: number;
  prep_time_minutes: number;
  announcement: string | null;
  hours: { day: string; open: string; close: string; closed?: boolean }[];
  store_whatsapp: string | null;
  store_email: string | null;
  currency: string;
};

export type NotificationLog = {
  id: string;
  order_id: string;
  channel: "whatsapp" | "email";
  event: string;
  recipient: string;
  provider: string;
  provider_id: string | null;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  created_at: string;
};
