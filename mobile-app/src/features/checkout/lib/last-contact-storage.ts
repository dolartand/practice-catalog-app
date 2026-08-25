//Локальное автозаполнение контактов (не серверная адресная книга)
import type { CreateOrderRequest } from '@entities/order';
import { kvStorage, STORAGE_KEYS } from '@shared/lib';


const KEY = STORAGE_KEYS.checkoutLastContact;

type LastContact = Omit<CreateOrderRequest, 'comment'>;

export function getLastContact(): LastContact | null {
  const raw = kvStorage.getString(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastContact;
  } catch {
    return null;
  }
}

export function saveLastContact(contact: LastContact): void {
  kvStorage.setString(KEY, JSON.stringify(contact));
}