export function formatDateTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

export function isoToInputDateTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const timezoneOffset = parsedDate.getTimezoneOffset() * 60_000;
  const localDate = new Date(parsedDate.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
}

export function splitByComma(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
