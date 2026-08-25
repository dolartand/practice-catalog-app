# 01. Архитектура мобильного клиента

> Статус: Реализовано (ядро)
> Версия: 0.1
> Связанные документы: [02. Доменная модель](02-domain-model.md), [03. Интеграция с API](03-api-integration.md), [08. Roadmap](08-roadmap.md), [Backend 01. Архитектура](../../backend/01-architecture.md)

## 1. Технологический стек

| Слой | Технология | Версия |
|---|---|---|
| Платформа | Expo (dev-client, prebuild) | SDK 56 |
| Runtime | React Native / React | 0.85.3 / 19.2.3 |
| Язык | TypeScript (strict, `noUncheckedIndexedAccess`) | ~6.0.3 |
| Навигация | expo-router (file-based) | ~56.2.x |
| Состояние | MobX + mobx-react-lite (`makeAutoObservable`) | 6.x / 4.x |
| Стили | react-native-unistyles (темы, adaptiveThemes) + Tamagui (эксперимент на Settings) | 3.x / 2.x |
| Локализация | i18next + react-i18next + expo-localization | 25.x / 16.6+ |
| Сеть | Axios | 1.7+ |
| Безопасное хранилище | expo-secure-store | ~56.0 |

Версии `react` / `react-dom` / `react-native` зафиксированы под SDK и меняются только через `npx expo install`.

## 2. Feature-Sliced Design

```
mobile-app/
├── app/                  # роуты expo-router: (auth)/, (tabs)/, каталог
├── src/
│   ├── core/             # @app/* — bootstrap, styles (unistyles-регистрация)
│   ├── pages/            # @pages/* — композиция экранов из widgets/features
│   ├── widgets/          # @widgets/* — крупные блоки UI (ProductGrid, FiltersModal…)
│   ├── features/         # @features/* — пользовательские сценарии (login, checkout…)
│   ├── entities/         # @entities/* — доменные модели + API-слой (product, cart, order…)
│   └── shared/           # @shared/* — ui-kit, lib (money, pagination, storage), api, i18n
```

Алиасы заданы в `tsconfig.json` → `paths`. Правило зависимостей: слои импортируют только вниз; контролируется `eslint-plugin-boundaries`.

## 3. Навигация

- Группа `(auth)` — login/register, доступна без сессии.
- Группа `(tabs)` — каталог, корзина, профиль.
- Детальная товара: `app/(tabs)/catalog/[productId].tsx`.
- Guard в корневом `_layout.tsx`: неавторизованный пользователь перенаправляется с защищённых вкладок на логин; каталог открыт всегда.

## 4. Состояние

- MobX-сторы на сущность/фичу: `SessionStore`, `ProductStore`, `CategoryStore`, `CartStore`, `OrderStore`.
- Инфраструктурный singleton `appSettingsStore` (тема, язык) — осознанное упрощение для app-wide настроек; доменные сторы при необходимости тестируемости переводятся на React Context.

## 5. Темизация

- Единая точка правды об активной схеме: `useEffectiveScheme()` (`'light' | 'dark'`; RN 0.85 возвращает также `'unspecified'` — нормализуется).
- Unistyles `adaptiveThemes`: preference `'system'` → адаптивные темы, иначе фиксированная тема через `UnistylesRuntime.setTheme`.

## 6. Локализация

- Поддерживаемые языки: ru, en, be, zh (`SUPPORTED_LANGUAGES`, тип `SupportedLanguage`).
- Язык приложения задаётся через i18next API при смене в настройках; сохраняется локально.
