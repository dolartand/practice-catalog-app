/** «12 авг 2026» в локали пользователя; при ошибке — пустая строка */
export function formatReviewDate(iso: string, locale: string): string {
  try {
    const tag = locale === 'zh' ? 'zh-CN' : locale;
    return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(iso),
    );
  } catch {
    return '';
  }
}
