// Validação de CPF e telefone BR, no padrão que o site usa nos formulários.
export function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

export function isValidCpf(cpf) {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice, factorStart) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += Number(slice[i]) * (factorStart - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const dig1 = calc(d.slice(0, 9), 10);
  const dig2 = calc(d.slice(0, 10), 11);
  return dig1 === Number(d[9]) && dig2 === Number(d[10]);
}

// Celular BR: 10 ou 11 dígitos (DDD + número). Aceita com ou sem +55.
export function normalizePhone(phone) {
  let d = onlyDigits(phone);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d;
}

export function isValidPhone(phone) {
  const d = normalizePhone(phone);
  return d.length === 10 || d.length === 11;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

// Data no formato ISO ou DD/MM/YYYY -> retorna ISO ou null.
export function parseBirthDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : s;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return iso.slice(0, 10);
}

export function maskPhone(phone) {
  const d = normalizePhone(phone);
  if (d.length < 4) return "****";
  return `(${d.slice(0, 2)}) *****-${d.slice(-4)}`;
}
