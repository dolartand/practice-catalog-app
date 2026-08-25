# 04. Auth

> Статус: Реализовано (блок 1)
> Версия: 0.1
> Связанные документы: [03. Интеграция с API](03-api-integration.md), [01. Архитектура](01-architecture.md), [Backend 04. Аутентификация](../../backend/04-auth.md)

## 1. Состав

- `entities/session`: типы `User`, `AuthTokens`; `SessionStore` (MobX) — accessToken, refreshToken, user, isAuthenticated.
- Хранение токенов — **expo-secure-store** (не kvStorage), обёртка в `shared/lib/secure-storage`.
- `entities/session/api`: register, login, refresh, logout, logoutAll, changePassword, getMe, updateMe (PATCH).

## 2. Автообновление токена

Axios-интерцептор: 401 → попытка refresh → очередь отложенных запросов → повтор после обновления; при неудаче — разлогин и сброс SessionStore.

## 3. Экраны и роутинг

- features/login, features/register, features/logout, features/change-password — формы с валидацией и разбором `errors` из Problem Details (поле → сообщение).
- Роуты: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`.
- Guard в корневом layout: защищённые вкладки (корзина/профиль) требуют сессии; каталог доступен без входа.

## 4. Восстановление сессии

При холодном старте токены читаются из SecureStore → тихий refresh / getMe.

**Критерий приёмки**: регистрация → автовход → выход → повторный вход работают; истёкший access молча обновляется без разлогина пользователя.
