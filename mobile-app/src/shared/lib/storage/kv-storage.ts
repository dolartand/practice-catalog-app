import { Storage } from 'expo-sqlite/kv-store';

export const kvStorage = {
    getString(key: string): string | null {
        return Storage.getItemSync(key);
    },
    setString(key: string, value: string): void {
        Storage.setItemSync(key, value);
    },
    delete(key: string): void {
        Storage.removeItemSync(key);
    },
};