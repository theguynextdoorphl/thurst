import type {
  BODY_HAIR, BODY_TYPES, COCK_SIZES, DISTANCE_UNITS, DRUG_USE, ETHNICITIES, GIRTHS,
  HIV_STATUSES, HOST_TRAVEL, LIKES, Option, POSITIONS, RELATIONSHIP_STATUSES, SAFER_SEX,
  VACCINATIONS, WEIGHT_UNITS, YES_NO_SOCIALLY,
} from './options';

/** What a user says about himself. Every field is optional. */
export interface Profile {
  displayName?: string;
  about?: string;
  // Section 1: Basic information
  weight?: number;
  weightUnit?: Option<typeof WEIGHT_UNITS>;
  ethnicity?: Option<typeof ETHNICITIES>[];
  relationshipStatus?: Option<typeof RELATIONSHIP_STATUSES>;
  smoker?: Option<typeof YES_NO_SOCIALLY>;
  drinker?: Option<typeof YES_NO_SOCIALLY>;
  drugUse?: Option<typeof DRUG_USE>;
  bodyType?: Option<typeof BODY_TYPES>;
  bodyHair?: Option<typeof BODY_HAIR>;
  // Section 2: Health & wellness
  hivStatus?: Option<typeof HIV_STATUSES>;
  lastTested?: string; // YYYY-MM-DD
  vaccinations?: Option<typeof VACCINATIONS>[];
  vaccinationsOther?: string;
  // Section 3: The good stuff
  cockSize?: Option<typeof COCK_SIZES>;
  girth?: Option<typeof GIRTHS>;
  position?: Option<typeof POSITIONS>;
  saferSex?: Option<typeof SAFER_SEX>;
  likes?: Option<typeof LIKES>[];
  hostTravel?: Option<typeof HOST_TRAVEL>;
}

/** What a user wants in a partner. Empty lists and missing fields mean "no preference". */
export interface MatchPreferences {
  distance?: number;
  distanceUnit?: Option<typeof DISTANCE_UNITS>;
  ageMin?: number;
  ageMax?: number;
  bodyTypes?: Option<typeof BODY_TYPES>[];
  positions?: Option<typeof POSITIONS>[];
  smoker?: Option<typeof YES_NO_SOCIALLY>[];
  drinker?: Option<typeof YES_NO_SOCIALLY>[];
  drugUse?: Option<typeof DRUG_USE>[];
  hivStatuses?: Option<typeof HIV_STATUSES>[];
  hostTravel?: Option<typeof HOST_TRAVEL>[];
  mustHaveLikes?: Option<typeof LIKES>[];
}

export interface Photo {
  id: string;
  url: string; // path on the API server, fetched with the auth header
  position: number;
}

export interface Me {
  id: string;
  email: string;
  username: string;
  age: number;
  city: string | null;
  zip: string | null;
  profile: Profile;
  preferences: MatchPreferences;
  photos: Photo[];
}

/** Another user's profile, as shown during a match. */
export interface PublicProfile {
  id: string;
  username: string;
  age: number;
  distanceMiles: number | null;
  profile: Profile;
  photos: Photo[];
}

export type Decision = 'hook' | 'pass';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  kind: 'text' | 'location';
  body: string; // text, or JSON {lat, lng} for location
  createdAt: number;
}

export type MatchPhase = 'review' | 'chat' | 'ended' | 'declined';

export interface MatchState {
  matchId: string;
  phase: MatchPhase;
  other: PublicProfile;
  /** Epoch ms when the current phase ends. */
  endsAt: number;
  myDecision: Decision | null;
  messages: ChatMessage[];
}

export interface SessionState {
  available: boolean;
  match: MatchState | null;
  /** A finished match that still needs this user's rating. */
  pendingRating: { matchId: string; other: PublicProfile } | null;
}
