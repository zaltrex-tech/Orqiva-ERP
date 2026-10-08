import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "orqiva-enterprise-super-secret-key-change-in-production-min-32-chars";

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

export function signToken(payload: TokenPayload, expiresIn: string = "8h"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
