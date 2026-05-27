export default function handler(_req: any, res: any) {
  const supabaseConfigured = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const n8nConfigured = Boolean(
    process.env.N8N_OUTBOUND_WEBHOOK_URL || process.env.N8N_WEBHOOK_OUTBOUND_TOKEN,
  );

  const pixConfigured = Boolean(
    process.env.PIX_KEY &&
    process.env.PIX_BENEFICIARY_NAME,
  );

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabase: supabaseConfigured ? 'configured' : 'missing',
    n8n: n8nConfigured ? 'configured' : 'missing',
    pix: pixConfigured ? 'configured' : 'missing',
  });
}
