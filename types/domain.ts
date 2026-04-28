export type Vendor = {
  id: string;
  name: string;
  slug?: string;
  tagline?: string | null;
  category: string | null;
  city: string | null;
  is_verified: boolean;
  description: string | null;
  whatsapp: string | null;
  website_url?: string | null;
  hero_image_url?: string | null;
  created_at: string;
};

export type VendorMetric = {
  sample_rating: number;
  response_rate: number;
  avg_reply_time: string;
  review_count: number;
  updated_at: string;
};

export type VendorHour = {
  id: string;
  vendor_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  notes: string | null;
};

export type VendorItem = {
  id: string;
  vendor_id: string;
  item_type: "menu" | "service" | "product";
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type VendorDetail = Vendor & {
  tagline: string | null;
  website_url: string | null;
  hero_image_url: string | null;
  metrics: VendorMetric | null;
  hours: VendorHour[];
  items: VendorItem[];
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "customer" | "vendor" | "admin";
  updated_at: string;
};
