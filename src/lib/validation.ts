import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido.");

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .regex(/[A-Za-z]/, "A senha deve conter letras.")
  .regex(/\d/, "A senha deve conter números.");

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => /^\d{10,11}$/.test(v.replace(/\D/g, "")), "Telefone inválido. Use DDD + número.");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Informe a senha.") });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export const inviteUserSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo."),
  email: emailSchema,
  role: z.enum(["admin", "professor", "responsavel"], { message: "Selecione o perfil." }),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo."),
  phone: z.union([z.literal(""), phoneSchema]),
});

export const guardianContactSchema = z.object({
  phone: phoneSchema,
  phone_secondary: z.union([z.literal(""), phoneSchema]),
  email: z.union([z.literal(""), emailSchema]),
  address: z.string().trim().max(300, "Endereço muito longo."),
});

/** Converte o resultado do zod em { campo: mensagem } */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
