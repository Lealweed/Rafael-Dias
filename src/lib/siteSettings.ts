import { createClient } from "./supabase/client";

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
  laser_hero_image_1: "/assets/skincare_treatment.png",
  laser_hero_image_2: "/assets/spa_portrait.png",
  laser_demo_video: "",
  laser_deposit_text: "Sinal de reserva: R$ 150,00",
  laser_info_text: "Valor e política de abatimento podem ser ajustados no backend/env sem mudar a página.",
  case_avatar_0: "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg",
  case_avatar_1: "https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg",
  case_avatar_2: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",

  // Depilação - Mídias e Textos
  depilacao_image_0: "/assets/depilacao_1.png",
  depilacao_image_1: "/assets/depilacao_2.png",
  depilacao_image_2: "/assets/depilacao_3.png",
  depilacao_video: "https://videos.pexels.com/video-files/5649212/5649212-uhd_3840_2160_25fps.mp4",
  depilacao_service_name_0: "Depilação a Laser Axilas",
  depilacao_service_price_0: "R$ 89,90",
  depilacao_service_desc_0: "Sessão individual com tecnologia laser de última geração, segura e indolor.",
  depilacao_service_name_1: "Depilação a Laser Pernas Inteiras",
  depilacao_service_price_1: "R$ 199,90",
  depilacao_service_desc_1: "Pele lisa e macia por muito mais tempo. Procedimento rápido e eficaz.",
  depilacao_service_name_2: "Depilação a Laser Virilha Completa",
  depilacao_service_price_2: "R$ 149,90",
  depilacao_service_desc_2: "Máximo conforto e higiene com resultados visíveis desde a primeira sessão.",
  depilacao_service_name_3: "Pacote Depilação Corporal",
  depilacao_service_price_3: "R$ 399,90",
  depilacao_service_desc_3: "Combo completo com axilas, virilha e pernas. O melhor custo-benefício.",

  // Textos da página principal
  home_hero_title_first: "Dr. Rafael",
  home_hero_title_last: "Dias",
  home_hero_desc: "Descubra a arte da transformação sutil. Sob a liderança do Dr. Rafael Dias, esculpimos sua melhor versão com precisão clínica e um toque de luxo incomparável.",
  home_footer_phone: "(94) 99999-9999",
  home_footer_email: "contato@rafaeldias.com.br",
  home_footer_address: "Rua das Esmeraldas, 123 - Parauapebas - PA",

  // Depoimentos dos casos
  case_name_0: "Letícia Oliveira",
  case_role_0: "Influenciadora & Advogada",
  case_location_0: "Parauapebas - PA",
  case_comment_0: "Minha rotina exige uma imagem impecável e natural. O protocolo de Harmonização Facial do Dr. Rafael trouxe frescor e rejuvenescimento, mantendo minha identidade. Um atendimento premium único.",

  case_name_1: "Dra. Mariana Castro",
  case_role_1: "Promotora de Justiça",
  case_location_1: "Parauapebas - PA",
  case_comment_1: "Confiança e discrição. O Dr. Rafael explica cada detalhe do planejamento antes de começar. O Botox e os bioestimuladores trouxeram firmeza com total naturalidade.",

  case_name_2: "Dr. Carlos Eduardo",
  case_role_2: "Advogado Sócio-Sênior",
  case_location_2: "Parauapebas - PA",
  case_comment_2: "Sempre tive receio de ficar artificial. O Dr. Rafael me tranquilizou na consulta presencial. O resultado do preenchimento e colágeno ficou incrível, discreto e rejuvenescido.",
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
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch("/api/site-settings", {
      method: "POST",
      headers,
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
