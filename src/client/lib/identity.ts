// Persistent Soft Identity System for BajiHears
// Zero login, zero friction. Stores identity in `bh:identity` localStorage.

export type { BajiIdentity, StreakMilestone } from "@/shared/types/profile";
export { STREAK_MILESTONES } from "@/shared/constants/identity";
import type { BajiIdentity } from "@/shared/types/profile";

const PREFIXES = [
  "chaiwala",
  "raat_ki",
  "dil_ki",
  "ghumakkad",
  "khamoshi",
  "subah_ka",
  "sheher_ka",
  "pagal_sa",
  "roz_ka",
  "andhere_mein",
  "ek_baat",
  "sunta_hai",
  "jazbaat",
  "alfaaz",
  "khoya_sa",
  "purani_dilli",
  "karachi_rain",
  "lahore_fog",
  "gulmarg_snow",
  "dhabe_ka",
  "raste_mein",
  "beparwah",
  "gumshuda",
  "aawara",
  "badal_sa",
  "champa_chamel",
  "jugnu",
  "fizaon_mein",
  "aahatein",
  "baatein",
  "silsila",
  "ishqbaaz",
  "dard_e_dil",
  "aawara_gard",
  "shab_e_firaaq",
  "qasid",
  "sitaaron_tale",
  "deewangi",
  "tasveer",
  "dastan",
  "naghma",
  "parwana",
  "musafir",
  "bebaak",
  "benaam",
  "chupke_se",
  "anjaana",
  "anjaani",
  "bekhudi",
  "sukoon",
  "roshni",
  "jugnu_sa",
  "titli_si",
  "chaand_sa",
  "saaya",
  "tanhai",
  "shama",
  "rangrezz",
  "bawra",
  "malang",
  "faqeer",
  "darwesh",
  "qalandar",
  "jhalli",
  "dewana",
  "mastana",
  "junoon",
  "afsana",
  "rawani",
  "lafz",
  "kalam",
  "tehreer",
  "shayar",
  "adaa",
  "nazakat",
  "hijr",
  "visaal",
  "pehla_nasha",
  "aakhri_khat",
  "purana_gaana",
  "radio_mirchi",
  "cassette_tape",
  "chai_ki_chuski",
  "cutting_chai",
  "tapri_wali",
  "adrak_wali",
  "biryani_lover",
  "samosa_chat",
  "kulfi_falooda",
  "dahi_bhalla",
  "golgappa",
  "jalebi_baby",
  "roohafza",
  "lassi_glass",
  "metro_ride",
  "rickshaw_wala",
  "local_train",
  "bus_stop",
  "red_light",
  "traffic_jam",
  "monsoon_walk",
  "rainy_day",
  "terrace_vibe",
  "balcony_scene",
  "midnight_snack",
  "2am_thoughts",
  "3am_club",
  "sleepy_head",
  "night_owl",
  "stargazing",
  "rooftop_talks",
  "quiet_corner",
  "backbencher",
  "last_bench",
  "exam_stress",
  "hostel_room",
  "roomie",
  "mess_ka_khana",
  "maggi_at_night",
  "chai_sutta",
  "library_silence",
  "corridor_whispers",
  "old_diary",
  "handwritten_note",
  "paper_boat",
  "lost_letter",
  "unread_message",
  "last_seen",
  "typing_status",
  "block_list",
  "archive_chat",
  "screenshot_gang",
  "insta_stalker",
  "playlist_curator",
  "sad_songs",
  "indie_vibes",
  "ghazal_lover",
  "coke_studio",
  "sufi_soul",
  "acoustic_guitar",
  "lo_fi_beats",
  "cassette_rewind",
  "vintage_soul",
  "retro_vibes",
  "polaroid_pic",
  "film_grain",
  "golden_hour",
  "sunset_lover",
  "dawn_chaser",
  "cloud_watcher",
  "rain_drops",
  "petrichor",
  "mitti_ki_khushbu",
  "sard_hawa",
  "garm_chai",
  "woolen_scarf",
  "winter_morning",
  "fog_lights",
  "street_lamp",
  "empty_roads",
  "late_night_drive",
  "highway_dhaba",
  "tea_stall",
  "corner_seat",
  "window_seat",
  "train_journey",
  "platform_waiting",
  "ticket_collector",
  "luggage_bag",
  "destination_unknown",
  "wanderlust",
  "nomad_heart",
  "restless_soul",
  "overthinker",
  "daydreamer",
  "stargazed",
  "moonchild",
  "sun_kissed",
  "ocean_eyes",
  "quiet_mind",
  "chaotic_good",
  "hopeless_romantic",
  "poet_at_heart",
  "storyteller",
  "memory_keeper",
  "time_traveler",
  "parallel_universe",
  "what_if",
  "almost_lover",
  "unrequited",
  "unsaid_words",
  "unspoken_truth",
  "heavy_heart",
  "healing_era",
  "soft_season",
  "main_character",
  "side_kick",
  "plot_armour",
  "villain_arc",
  "quiet_confidence",
  "gentle_soul",
  "kind_eyes",
  "warm_smile",
  "cozy_corner",
  "safe_space",
  "comfort_person",
  "home_feeling",
  "familiar_stranger",
  "passing_by",
  "just_visiting",
  "here_again",
  "still_here",
  "not_forgotten",
  "remember_me",
  "forget_me_not",
  "wild_flower",
  "mountain_breeze",
  "river_flow",
  "ocean_wave",
  "desert_rose",
  "city_lights",
  "neon_glow",
  "midnight_static",
  "quiet_storm",
  "neon_ache",
  "golden_confession",
  "silent_echo",
  "spilled_tea",
  "plot_twister",
  "hard_truther",
  "vibe_checker",
  "chai_ke_saath",
  "shaam_ki_chai",
  "paratha_roll",
  "bun_kabab",
  "meethi_chutney",
  "kashmiri_chai",
  "doodh_patti",
  "gulab_jamun",
  "rasgulla",
  "kheer_bowl",
  "halwa_puri",
  "Sunday_brunch",
  "sleepy_sunday",
  "lazy_afternoon",
  "rainy_evening",
  "winter_night",
  "summer_breeze",
  "autumn_leaves",
  "spring_blossom",
  "december_cold",
  "november_rain",
  "october_sky",
  "january_blues",
  "late_bloomer",
  "old_school",
  "90s_kid",
  "cassette_player",
  "walkman_days",
  "landline_calls",
  "missed_calls",
  "dial_tone",
  "dial_up_net",
  "diary_entry",
  "secret_keeper",
  "silent_observer",
  "wallflower",
  "introvert_club",
  "people_watcher",
  "deep_talks",
  "4am_crew",
  "dawn_patrol",
  "chai_break",
  "sutta_break",
  "cuckoo_bird",
  "bulbul_geet",
  "koyal_ki_khoo",
  "shaam_e_awadh",
  "banaras_ghat",
  "marine_drive",
  "bandra_sunset",
  "old_lahore",
  "mall_road",
  "f_six_markaz",
  "clifton_beach",
  "sea_view",
  "devdas_vibes",
  "heer_ranjha",
  "laila_majnu",
  "mirza_sahiban",
  "sohni_mahiwal",
  "parizaad",
  "zindagi_gulzar",
  "humsafar_feel",
  "dhoop_kinare",
  "tanhayan",
  "alfaaz_e_dil",
  "jazbaati_dil",
  "khamosh_lab",
  "gumshuda_khwab",
  "bechain_dil",
  "firaaq_e_yaar",
  "shab_e_gham",
  "subah_e_umeed",
  "noor_e_nazar",
  "chashm_e_nam",
  "rooh_ki_baat",
  "dilkash_lamha",
  "sahir_ludhianvi",
  "faiz_ki_nazm",
  "ghalib_ka_sher",
  "jaun_eliya",
  "allama_iqbal",
  "amrita_pritam",
  "gulzar_sahab",
  "parveen_shakir",
  "manto_afsaana",
  "baji_ki_baat",
  "baji_hears",
  "baji_secret",
  "suno_baji",
  "bol_baji",
];

const SUFFIXES = [
  "_baat",
  "_raaz",
  "_lamha",
  "_pal",
  "_dil",
  "_99",
  "_42",
  "_07",
  "_01",
  "_77",
  "_3am",
  "_2am",
  "_chai",
  "_yaar",
  "_jaan",
  "_dost",
  "_musafir",
  "_shayar",
  "_deewana",
  "_malang",
  "_faqeer",
  "_jhalli",
  "_pagal",
  "_babu",
  "_sahab",
  "_begum",
  "_ji",
  "_mia",
  "_khan",
  "_zada",
  "_parveen",
  "_aashir",
  "_poet",
  "_writer",
  "_soul",
  "_heart",
  "_mind",
  "_vibe",
  "_notes",
  "_diaries",
  "_khat",
  "_tehreer",
  "_awaaz",
  "_sada",
  "_dastaan",
  "_afsana",
  "_qissa",
  "_kahani",
  "_geet",
  "_dhun",
  "_sur",
  "_raag",
  "_taal",
  "_chuski",
  "_sip",
  "_drop",
  "_tear",
  "_smile",
  "_glow",
  "_spark",
  "_ember",
  "_flame",
  "_blaze",
  "_bonfire",
  "_flicker",
  "_smoke",
  "_haze",
  "_fog",
  "_mist",
  "_dew",
  "_rain",
  "_cloud",
  "_storm",
  "_breeze",
  "_wind",
  "_wave",
  "_tide",
  "_sea",
  "_river",
  "_lake",
  "_ghat",
  "_corner",
  "_street",
  "_lane",
  "_mohalla",
  "_bazaar",
  "_station",
  "_platform",
  "_route",
  "_path",
  "_journey",
  "_stop",
  "_whisper",
  "_silence",
  "_echo",
  "_shadow",
  "_reflection",
  "_memory",
  "_dream",
  "_hope",
];

const IDENTITY_KEY = "bh:identity";

function generateHandle(): string {
  const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)] ?? "chaiwala";
  const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] ?? "_99";
  return `${p}${s}`;
}

function generateDeviceToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getOrCreateIdentity(): BajiIdentity {
  if (typeof window === "undefined") {
    return {
      handle: "chaiwala_99",
      avatarSeed: 128,
      memberSince: new Date().toISOString().split("T")[0]!,
      deviceToken: "server_dev_token",
      visitStreak: 1,
      lastVisit: getTodayStr(),
      streakFreezeUsed: false,
      totalActions: 0,
      tabsUnlocked: { duel: false, read: false },
    };
  }

  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BajiIdentity;
      // Ensure schema backwards-compatibility
      if (!parsed.tabsUnlocked) {
        parsed.tabsUnlocked = {
          duel: (parsed.totalActions ?? 0) >= 3,
          read: (parsed.totalActions ?? 0) >= 5,
        };
      }
      if (typeof parsed.totalActions !== "number") {
        parsed.totalActions = 0;
      }
      return parsed;
    }
  } catch {
    // Corrupt storage; recreate
  }

  const fresh: BajiIdentity = {
    handle: generateHandle(),
    avatarSeed: Math.floor(Math.random() * 500) + 1,
    memberSince: new Date().toISOString().split("T")[0]!,
    deviceToken: generateDeviceToken(),
    visitStreak: 1,
    lastVisit: getTodayStr(),
    streakFreezeUsed: false,
    totalActions: 0,
    tabsUnlocked: { duel: false, read: false },
  };

  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(fresh));
  } catch {
    // Storage quota or privacy mode
  }

  return fresh;
}

export function updateVisitStreak(): {
  streak: number;
  isNewDay: boolean;
  justReset: boolean;
  freezeApplied: boolean;
} {
  if (typeof window === "undefined") {
    return { streak: 1, isNewDay: false, justReset: false, freezeApplied: false };
  }

  const identity = getOrCreateIdentity();
  const today = getTodayStr();

  if (identity.lastVisit === today) {
    return {
      streak: identity.visitStreak,
      isNewDay: false,
      justReset: false,
      freezeApplied: false,
    };
  }

  const lastDate = new Date(identity.lastVisit).getTime();
  const currentDate = new Date(today).getTime();
  const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));

  let nextStreak = identity.visitStreak;
  let justReset = false;
  let freezeApplied = false;

  if (diffDays === 1) {
    // Visited yesterday: clean increment
    nextStreak += 1;
  } else if (diffDays === 2 && !identity.streakFreezeUsed && identity.visitStreak >= 5) {
    // Missed 1 day but has streak freeze available (earned at day 5)
    identity.streakFreezeUsed = true;
    freezeApplied = true;
    nextStreak += 1;
  } else if (diffDays > 1) {
    // Gap > 48h without freeze: reset
    nextStreak = 1;
    justReset = true;
  }

  identity.visitStreak = nextStreak;
  identity.lastVisit = today;

  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Storage failure
  }

  return { streak: nextStreak, isNewDay: true, justReset, freezeApplied };
}

export function getStreakStatus(): { streak: number; lastVisit: string; freezeAvailable: boolean } {
  const identity = getOrCreateIdentity();
  return {
    streak: identity.visitStreak,
    lastVisit: identity.lastVisit,
    freezeAvailable: !identity.streakFreezeUsed && identity.visitStreak >= 5,
  };
}

export function recordAction(): {
  totalActions: number;
  newlyUnlocked: { duel: boolean; read: boolean };
} {
  if (typeof window === "undefined") {
    return { totalActions: 0, newlyUnlocked: { duel: false, read: false } };
  }

  const identity = getOrCreateIdentity();
  const prevDuel = identity.tabsUnlocked?.duel ?? false;
  const prevRead = identity.tabsUnlocked?.read ?? false;

  identity.totalActions = (identity.totalActions ?? 0) + 1;

  if (identity.totalActions >= 3) {
    identity.tabsUnlocked.duel = true;
  }
  if (identity.totalActions >= 5) {
    identity.tabsUnlocked.read = true;
  }

  const newlyUnlocked = {
    duel: !prevDuel && identity.tabsUnlocked.duel,
    read: !prevRead && identity.tabsUnlocked.read,
  };

  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Storage quota
  }

  return { totalActions: identity.totalActions, newlyUnlocked };
}

export function useStreakFreeze(): boolean {
  if (typeof window === "undefined") return false;
  const identity = getOrCreateIdentity();
  if (identity.streakFreezeUsed) return false;

  identity.streakFreezeUsed = true;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    return true;
  } catch {
    return false;
  }
}
