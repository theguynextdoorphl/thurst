// Every profile and filter option from the Thurst spec. The empty default ("")
// means "not answered" and is never stored.

export const ETHNICITIES = [
  'Asian',
  'Black',
  'Latino',
  'Middle Eastern',
  'Mixed',
  'Native American',
  'Pacific Islander',
  'South Asian',
  'White',
  'Other',
] as const;

export const RELATIONSHIP_STATUSES = [
  'Single',
  'Dating',
  'In a Relationship',
  'Married',
  'Open Relationship',
  "It's Complicated",
  'Prefer Not to Say',
] as const;

export const YES_NO_SOCIALLY = ['Yes', 'No', 'Socially'] as const;

export const DRUG_USE = [
  'Yes',
  'Yes - Just No Hard Drugs',
  'No',
  'No - But You Can Though',
  'Sober',
] as const;

export const BODY_TYPES = ['Slim', 'Toned', 'Average', 'Muscular', 'Dad Bod', 'Stocky'] as const;

export const BODY_HAIR = [
  'Naturally Smooth',
  'Smooth Only Because I Shave It Off',
  'Trimmed',
  'Moderate Hairy',
  "It's Called Fur And It Keeps Me Warm",
] as const;

export const HIV_STATUSES = [
  'Negative',
  'Negative on PrEP',
  'Positive +',
  'Positive Undetectable -',
  "I'm Not Sure",
] as const;

export const VACCINATIONS = ['COVID-19', 'Monkeypox', 'Meningitis', 'Influenza'] as const;

export const COCK_SIZES = [
  '5"', '5.5"', '6"', '6.5"', '7"', '7.5"', '8"', '8.5"',
  '9"', '9.5"', '10"', '10.5"', '11"', '11.5"', '12"',
] as const;

export const GIRTHS = ['Skinny', 'Average Thickness', "You're Going to Choke Thick"] as const;

export const POSITIONS = ['Top', 'Bottom', 'Versatile', 'Vers Top', 'Vers Bottom', 'Side'] as const;

export const SAFER_SEX = [
  'Raw - Bareback Only',
  'Safely - Condoms Are a Must',
  "Either Or - Let's Just Fuck",
] as const;

export const LIKES = [
  'BDSM', 'Cumdump', 'Dominant', 'Submissive', 'Water Sports', 'Toys', 'Role Play',
  'Outdoors', '3-Somes', 'Groups', 'PnP', 'Rimming', 'Oral', 'Feet', 'Leather',
  'Vanilla', 'Edging', 'Kissing', 'NSA', 'Cuddling', 'Nip Play', 'Piggy',
] as const;

export const HOST_TRAVEL = ['Host', 'Travel', "Either - Let's Just Fuck"] as const;

export const WEIGHT_UNITS = ['lbs', 'kg'] as const;
export const DISTANCE_UNITS = ['mi', 'km'] as const;

export type Option<T extends readonly string[]> = T[number];
