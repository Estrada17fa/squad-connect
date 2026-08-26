import { z } from "zod";

export const PLAYER_POSITIONS = ["Portero", "Defensa", "Mediocampista", "Delantero"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PREFERRED_FEET = ["derecho", "izquierdo", "ambos"] as const;
export type PreferredFoot = (typeof PREFERRED_FEET)[number];

export const PLAYER_STATUSES = ["activo", "baja", "prestamo"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const PLAYER_STATUS_LABEL: Record<PlayerStatus, string> = {
  activo: "Activo",
  baja: "Baja",
  prestamo: "Préstamo",
};

export const assignmentSchema = z.object({
  team_id: z.string().uuid(),
  job_title: z.string().trim().max(60).optional().nullable(),
});

export const playerSchema = z.object({
  jersey_number: z.number().int().min(0).max(999).optional().nullable(),
  position: z.string().trim().max(40).optional().nullable(),
  secondary_position: z.string().trim().max(40).optional().nullable(),
  preferred_foot: z.enum(PREFERRED_FEET).optional().nullable(),
  height_cm: z.number().int().min(50).max(260).optional().nullable(),
  weight_kg: z.number().int().min(20).max(250).optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  birthplace: z.string().trim().max(120).optional().nullable(),
  affiliation_number: z.string().trim().max(60).optional().nullable(),
  id_document: z.string().trim().max(60).optional().nullable(),
  joined_at: z.string().optional().nullable(),
  previous_club: z.string().trim().max(120).optional().nullable(),
  player_status: z.enum(PLAYER_STATUSES).optional().nullable(),
  shirt_size: z.string().trim().max(20).optional().nullable(),
  pants_size: z.string().trim().max(20).optional().nullable(),
  shoe_size: z.string().trim().max(20).optional().nullable(),
});

export const baseMemberSchema = z.object({
  first_name: z.string().trim().min(1).max(60),
  paternal_last_name: z.string().trim().min(1).max(60),
  maternal_last_name: z.string().trim().max(60).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  avatar_url: z.string().trim().max(500).optional().nullable(),
  birthdate: z.string().optional().nullable(),
  /** Datos de persona: válidos para cualquier rol, no solo jugadores. */
  nationality: z.string().trim().max(80).optional().nullable(),
  birthplace: z.string().trim().max(120).optional().nullable(),
  emergency_contact_name: z.string().trim().max(120).optional().nullable(),
  emergency_contact_phone: z.string().trim().max(40).optional().nullable(),
  role_id: z.string().uuid(),
  assignments: z.array(assignmentSchema).max(30).default([]),
  /** Puesto de la membresía global ("Todo el club"), p. ej. para Admin. */
  club_job_title: z.string().trim().max(60).optional().nullable(),
  player: playerSchema.optional().nullable(),
});

/** Misma regla que el cliente: 8+, número, minúscula y mayúscula; símbolos permitidos. */
const passwordField = z
  .string()
  .max(PASSWORD_MAX_LENGTH)
  .superRefine((value, ctx) => {
    for (const msg of checkPassword(value).missing) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    }
  });

export const createMemberSchema = baseMemberSchema.extend({
  email: z.string().trim().toLowerCase().email().max(255),
  password: passwordField,
});

export const updateMemberSchema = baseMemberSchema.extend({
  user_id: z.string().uuid(),
  password: passwordField.optional().nullable(),
});

export const memberTargetSchema = z.object({ user_id: z.string().uuid() });

export const memberDeleteSchema = z.object({
  user_id: z.string().uuid(),
  force: z.boolean().optional(),
});

export type PlayerInput = z.infer<typeof playerSchema>;
export type CreateClubMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateClubMemberInput = z.infer<typeof updateMemberSchema>;
