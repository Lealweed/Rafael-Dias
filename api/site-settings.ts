import { getAllSiteSettings, setSiteSettings } from "./_lib/site-settings.js";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const result = await getAllSiteSettings();
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.reason || "failed_to_load_site_settings" });
    }
    return res.json({ ok: true, settings: result.settings });
  }

  if (req.method === "POST") {
    const settings = req.body?.settings;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ ok: false, error: "invalid_settings_payload" });
    }

    const result = await setSiteSettings(settings);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: result.reason || "failed_to_save_site_settings" });
    }

    return res.json({ ok: true, settings: result.settings });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
