import { createServerClient } from "@supabase/ssr";

export function createServerSupabaseClient(req: any, res: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Extraindo o cookie do Express req
          const cookieStr = req.headers.cookie || "";
          const match = cookieStr.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : undefined;
        },
        set(name: string, value: string, options: any) {
          res.cookie(name, value, options);
        },
        remove(name: string, options: any) {
          res.clearCookie(name, options);
        },
      },
    }
  );
}

// Client utilizando a Service Role para operações B2B / Admin (ex: webhook do n8n)
export function createAdminClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
       auth: {
           autoRefreshToken: false,
           persistSession: false
       }
    }
  );
}
