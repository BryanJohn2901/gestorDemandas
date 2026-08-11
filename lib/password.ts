import { randomBytes } from "crypto";

// Gera uma senha temporária para o admin compartilhar com o novo colaborador.
// base64url preserva toda a entropia dos bytes aleatórios (sem substituir
// caracteres por um valor fixo, o que enfraqueceria a senha).
export function generateTempPassword() {
  return randomBytes(9).toString("base64url");
}
