// Office days per week, as a phrase. null means the posting doesn't say; 0
// means it says fully remote. Both are spelled out so a 0 never reads as
// "not filled in" and a blank never reads as "no office days".
export function officeDaysLabel(
  officeDays: number | null,
  remoteNote: string | null,
  t: (key: string) => string,
): string {
  if (officeDays === null) {
    return remoteNote ? `${t("common.officeDaysNotStated")} · ${remoteNote}` : t("common.officeDaysNotStated");
  }
  if (officeDays === 0) return t("common.officeDaysRemote");
  return `${officeDays} ${t("common.officeDaysShort")}`;
}
