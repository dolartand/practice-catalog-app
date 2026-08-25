// Минимальный централизованный тост: модуль-эмиттер + ToastHost в корне приложения.
// Сообщение приходит уже переведённым (t() вызывает тот, кто показывает).
type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

export function showToast(message: string) {
  listener?.(message);
}

export function registerToastListener(next: ToastListener | null) {
  listener = next;
}
