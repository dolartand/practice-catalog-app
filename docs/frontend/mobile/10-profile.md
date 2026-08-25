# 10. Профиль — хаб, редактирование, о заводе (блок 10)

Зависит от: блок 1 (сессия), блоки 7/8 (заказы и избранное как пункты навигации).

Документ-план перед реализацией. Опирается на фактический контракт бэкенда
(`AuthController.me/updateMe`, `UserProfileResponse`), чтобы фронт не предполагал
лишнего.

---

## 1. Контракт бэкенда (источник истины)

### `GET /api/v1/auth/me` → `UserProfileResponse`

```jsonc
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Анна",
  "lastName": "Иванова",
  "phone": "+375291234567", // поле ОТСУТСТВУЕТ в JSON, если null (NON_NULL)
  "role": "USER"             // USER | ADMIN
}
```

### `PATCH /api/v1/auth/me` — частичное обновление профиля

Тело — JSON-объект; поддерживаются **только** поля:

| Поле | Ограничения | Особенности |
|---|---|---|
| `firstName` | строка 1–100, непустая | |
| `lastName` | строка 1–100, непустая | |
| `phone` | строка ≤30 или `null` | **`null` = очистить телефон**; пустая строка невалидна |

- Неизвестное поле → `400` «Unsupported field: …».
- Пустой объект → `400` «At least one field must be provided».
- **email и role изменить нельзя** (эндпоинт их просто не читает).
- Ответ — обновлённый `UserProfileResponse`.

Ошибки — Problem Details (`400`), тексты полей приходят в detail/`errors`.

Чего нет на бэкенде: смена email, аватаров, адресной книги, удаление аккаунта.

## 2. Решения по фронту

1. **Хаб меню** вместо прямого Settings: карточка пользователя (аватар-инициалы, имя,
   email) → редактирование; строки «Мои заказы», «Настройки», «О заводе»; внизу —
   **выход из аккаунта**. Важный бонус блока: UI логаута до сих пор не существовал
   (`sessionStore.logout` никем не вызывался) — закрываем здесь.
2. **Избранное в меню не дублируем** — это отдельный таб (решение блока 8).
3. **«О заводе» — модалка поверх страницы**: роут `profile/about` с
   `presentation:'modal'`; контент статический, живёт в локалях (без API). Плюс версия
   приложения из `expo-constants`.
4. **Редактирование профиля**: форма Имя/Фамилия/Телефон; email показывается read-only.
   Отправляем всегда firstName+lastName, phone — обрезанный или `null` (очистка).
   Клиентская валидация зеркалит бэкенд (1–100 имена, ≤30 телефон), серверные
   fieldErrors показываются под полями; успех → тост + назад.
5. **Профиль-вкладка защищена** (AuthGuard) — соответствует критерию блока 1
   («редирект с защищённых вкладок корзина/профиль»). Настройки тем/языка остаются
   доступны гостям через каталог? Нет — по плану профиль закрыт; это осознанно,
   вернёмся к точке входа настроек для гостей в блоке 11 при полировке, если мешает.

## 3. Архитектура (FSD)

```
src/
├── features/edit-profile/ui/EditProfileForm.tsx  # форма PATCH /me
├── features/logout/ui/LogoutButton.tsx           # confirm + sessionStore.logout()
└── pages/
    ├── profile/menu/ui/ProfileMenuPage.tsx       # хаб (карточка юзера + навигация)
    ├── profile/edit-profile/ui/EditProfilePage.tsx
    └── about/ui/AboutPage.tsx                    # статический контент (модалка)

app/(tabs)/profile/
├── index.tsx        # ProfileMenuPage (+AuthGuard) — было SettingsPage
├── edit.tsx         # EditProfilePage
├── settings.tsx     # SettingsPage (переезд без изменений функциональности)
├── about.tsx        # AboutPage (presentation:'modal')
├── change-password.tsx, orders/*                     # без изменений
```

Существующие страницы не переименуем и не перепишем: SettingsPage переезжает роутом,
change-password/orders остаются как есть.

## 4. UI/UX

- Меню: крупная карточка профиля сверху (градиент как у Settings), группы строк в
  карточках (NavLinkRow), logout — красная строка с подтверждением Alert.
- Аватар: круг с инициалами (первые буквы имени/фамилии), фон primary, текст белый.
- Edit: FormField-инпуты, email read-only серым, счётчики не нужны, ошибки полей —
  красные подписи; submit с индикатором.
- About: заголовок, абзац о заводе, контакты (адрес/телефон/email/часы), версия
  приложения снизу мелким шрифтом.

## 5. i18n (ключи во всех локалях ru/en/be/zh)

```
tabs.profile                      Профиль (есть)
profile.edit_link                 Редактировать профиль
profile.orders_link               Мои заказы (переиспользуем order.history_link)
profile.settings_link             Настройки
profile.about_link                О заводе
profile.guest_title               Гость
profile.guest_hint                Войдите, чтобы видеть свои заказы и профиль
profile.field_first_name / last_name / phone / email   подписи полей
profile.phone_optional            Телефон (необязательно)
profile.edit_title                Профиль
profile.save                      Сохранить
profile.saved                     Профиль обновлён
auth.logout                       Выйти
auth.logout_confirm_title         Выйти из аккаунта?
auth.logout_confirm_message       Вы всегда сможете войти снова
about.title                       О заводе
about.body                        <2 абзаца о заводе>
about.address_label / address_value
about.phone_label / phone_value
about.email_label / email_value
about.hours_label / hours_value
about.version                     Версия приложения: {{version}}
```

## 6. Критерий приёмки

- [ ] Таб «Профиль» открывает меню: карточка пользователя, заказы, настройки, о заводе, выход.
- [ ] Гость при заходе на вкладку уводится на логин (AuthGuard).
- [ ] Редактирование сохраняет имя/фамилию/телефон через PATCH; очистка телефона
      реально отправляет null и после перезахода телефон пуст.
- [ ] Email неизменяем (read-only), попытки отправить его нет.
- [ ] «О заводе» открывается модалкой поверх текущей страницы, закрывается свайпом/крестом.
- [ ] Выход очищает сессию и локальные данные (корзина/избранное/мои отзывы сбрасываются
      существующими bootstrap-reaction).
- [ ] Settings полностью работает по новому адресу /profile/settings.
