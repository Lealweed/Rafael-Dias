export type SiteMediaSettings = Record<string, string>;

export const DEFAULT_MEDIA_SETTINGS: SiteMediaSettings = {
  login_bg_image: "/assets/bg-premium.png",
  home_hero_video: "https://videos.pexels.com/video-files/5649212/5649212-uhd_3840_2160_25fps.mp4",
  home_hero_portrait_image: "https://images.pexels.com/photos/730229/pexels-photo-730229.jpeg",
  bento_service_image_0: "/assets/spa_portrait.png",
  bento_service_image_1: "/assets/facial_massage.png",
  bento_service_image_2: "/assets/skincare_treatment.png",
  bento_service_image_3: "/assets/clinic_interior.png",
  patient_before_image_0: "/assets/spa_portrait.png",
  patient_after_image_0: "/assets/spa_portrait.png",
  patient_before_image_1: "/assets/skincare_treatment.png",
  patient_after_image_1: "/assets/skincare_treatment.png",
  patient_before_image_2: "/assets/facial_massage.png",
  patient_after_image_2: "/assets/facial_massage.png",
};

export const SITE_MEDIA_KEYS = Object.keys(DEFAULT_MEDIA_SETTINGS) as Array<keyof typeof DEFAULT_MEDIA_SETTINGS>;

export function mergeMediaSettings(settings: Record<string, any>): SiteMediaSettings {
  return {
    ...DEFAULT_MEDIA_SETTINGS,
    ...Object.entries(settings).reduce((acc, [key, value]) => {
      if (typeof value === "string") acc[key] = value;
      return acc;
    }, {} as SiteMediaSettings),
  };
}

export async function fetchSiteSettings(): Promise<{ ok: boolean; settings?: Record<string, any>; error?: string }> {
  try {
    const res = await fetch("/api/site-settings");
    if (!res.ok) {
      return { ok: false, error: `Request failed with status ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, settings: data.settings || {} };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to fetch site settings" };
  }
}

export async function saveSiteSettings(settings: Record<string, string>): Promise<{ ok: boolean; settings?: Record<string, any>; error?: string }> {
  try {
    const res = await fetch("/api/site-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ settings }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error || `Request failed with status ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, settings: data.settings || {} };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Failed to save site settings" };
  }
}
