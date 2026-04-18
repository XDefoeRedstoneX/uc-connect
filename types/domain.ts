export type Vendor = {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  is_verified: boolean;
  description: string | null;
  whatsapp: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "customer" | "vendor" | "admin";
  updated_at: string;
};
