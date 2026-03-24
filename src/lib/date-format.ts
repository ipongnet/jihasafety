/** 한국 시간 기준 `MM.DD HH:mm` (24시간제, 앞자리 0 유지) */
export function formatSubmissionDateTimeShort(iso: string): string {
  const s = new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  const [datePart, timePart] = s.split(" ");
  if (!datePart || !timePart) return "-";
  const [, m, day] = datePart.split("-");
  const [h, min] = timePart.split(":");
  return `${m}.${day} ${h}:${min}`;
}

/** 한국 시간 기준 `YYYY.MM.DD HH:mm` (24시간제) */
export function formatSubmissionDateTimeLong(iso: string): string {
  const s = new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  const [datePart, timePart] = s.split(" ");
  if (!datePart || !timePart) return "-";
  const [y, m, day] = datePart.split("-");
  const [h, min] = timePart.split(":");
  return `${y}.${m}.${day} ${h}:${min}`;
}
