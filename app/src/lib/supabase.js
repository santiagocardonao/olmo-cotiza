import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export const ORG_ID = {
  olmo: "00000000-0000-4000-8000-00000000a000",
  demo: "00000000-0000-4000-8000-00000000d000",
};
