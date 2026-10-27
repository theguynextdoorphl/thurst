import { z } from 'zod';
import {
  BODY_HAIR, BODY_TYPES, COCK_SIZES, DISTANCE_UNITS, DRUG_USE, ETHNICITIES, GIRTHS,
  HIV_STATUSES, HOST_TRAVEL, LIKES, POSITIONS, RELATIONSHIP_STATUSES, SAFER_SEX,
  VACCINATIONS, WEIGHT_UNITS, YES_NO_SOCIALLY, MIN_AGE,
} from '@thurst/shared';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const list = <T extends readonly [string, ...string[]]>(values: T) => z.array(z.enum(values)).max(values.length);

export const profileSchema = z
  .object({
    displayName: z.string().trim().max(30),
    about: z.string().trim().max(300),
    weight: z.number().positive().max(1000),
    weightUnit: z.enum(WEIGHT_UNITS),
    ethnicity: list(ETHNICITIES),
    relationshipStatus: z.enum(RELATIONSHIP_STATUSES),
    smoker: z.enum(YES_NO_SOCIALLY),
    drinker: z.enum(YES_NO_SOCIALLY),
    drugUse: z.enum(DRUG_USE),
    bodyType: z.enum(BODY_TYPES),
    bodyHair: z.enum(BODY_HAIR),
    hivStatus: z.enum(HIV_STATUSES),
    lastTested: day,
    vaccinations: list(VACCINATIONS),
    vaccinationsOther: z.string().trim().max(60),
    cockSize: z.enum(COCK_SIZES),
    girth: z.enum(GIRTHS),
    position: z.enum(POSITIONS),
    saferSex: z.enum(SAFER_SEX),
    likes: list(LIKES),
    hostTravel: z.enum(HOST_TRAVEL),
  })
  .partial()
  .strict();

export const preferencesSchema = z
  .object({
    distance: z.number().positive().max(500),
    distanceUnit: z.enum(DISTANCE_UNITS),
    ageMin: z.number().int().min(MIN_AGE).max(99),
    ageMax: z.number().int().min(MIN_AGE).max(99),
    bodyTypes: list(BODY_TYPES),
    positions: list(POSITIONS),
    smoker: list(YES_NO_SOCIALLY),
    drinker: list(YES_NO_SOCIALLY),
    drugUse: list(DRUG_USE),
    hivStatuses: list(HIV_STATUSES),
    hostTravel: list(HOST_TRAVEL),
    mustHaveLikes: list(LIKES),
  })
  .partial()
  .strict()
  .refine((p) => p.ageMin === undefined || p.ageMax === undefined || p.ageMin <= p.ageMax, {
    message: 'Minimum age must not be above maximum age',
  });

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  registrationToken: z.string(),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.]{3,20}$/, 'Username must be 3 to 20 letters, numbers, dots or underscores'),
  password: z.string().max(200),
  birthdate: day,
  acceptTerms: z.literal(true, { error: 'You must accept the terms' }),
});

export const locationSchema = z.object({
  city: z.string().trim().min(1).max(80),
  zip: z.string().trim().regex(/^[A-Za-z0-9 -]{3,10}$/, 'Enter a valid zip or postal code'),
});

export const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const ratingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  matchAgain: z.boolean(),
  feedback: z.string().trim().max(500).optional(),
});

export const reportSchema = z.object({
  reason: z.enum(['fake', 'underage', 'harassment', 'inappropriate_photos', 'safety', 'other']),
  details: z.string().trim().max(1000).optional(),
  matchId: z.string().optional(),
});

/** Drops empty strings and empty lists so "no answer" is never stored. */
export function stripEmpty<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== '' && v !== null && !(Array.isArray(v) && v.length === 0)),
  ) as T;
}
