import dayjs from 'dayjs';

const DATE_TIME_FORMAT = 'DD.MM.YYYY, HH:mm';

/** ISO UTC из бэкенда → локальное время пользователя */
export function formatDateTime(iso: string): string {
  return dayjs(iso).format(DATE_TIME_FORMAT);
}
