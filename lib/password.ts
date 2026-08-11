import { randomBytes } from "crypto";

// Gera uma senha temporária para o admin compartilhar com o novo colaborador.
export function generateTempPassword() {
  return randomBytes(9)
    .toString("base64")
    .replace(/[+/=]/g, "x")
    .slice(0, 12);
}
