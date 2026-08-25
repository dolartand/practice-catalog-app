## Блок 0 — Правки инфраструктуры клиента (фундамент под всё остальное)

Зависит от: ничего. Меняет уже написанный код.

 - shared/api/http-client.ts: переписать под реальный контракт — базовый URL /api/v1, интерцептор X-Request-Id (UUID на каждый мутирующий запрос), интерцептор разбора Problem Details → нормализованный AppError { type, title, status, detail, errors }
 - shared/lib/money.ts: хелпер форматирования копеек в BYN (priceCents / 100, Intl.NumberFormat('ru-BY', { currency: 'BYN' }) с фолбэком, если Intl BYN не знает — проверить на устройстве)
 - shared/lib/pagination.ts: общий тип конверта { items, page, size, total, totalPages } + хелпер hasMore = page + 1 < totalPages, переиспользуемый везде (каталог, заказы, избранное, отзывы)

**Критерий**: http-клиент готов принимать реальные ответы бэкенда без доработок на каждом фиче-модуле.

## Блок 1 — Auth (новый, полностью с нуля)

Зависит от: блок 0. Приоритет высокий — корзина/заказы/отзывы/избранное требуют токена.

 - entities/session: типы (User, AuthTokens), SessionStore (MobX) — accessToken, refreshToken, user, isAuthenticated
 - Хранение токенов — expo-secure-store (не kvStorage), обёртка в shared/lib/secure-storage
 - entities/session/api: register, login, refresh, logout, logoutAll, changePassword, getMe, updateMe (PATCH, раз добавляете на бэкенде)
 - Axios-интерцептор автообновления: 401 → попытка refresh → очередь отложенных запросов → при неудаче — разлогин и сброс SessionStore 
 - features/login, features/register, features/logout, features/change-password — формы с валидацией и разбором errors из Problem Details (поле → сообщение)
 - pages/auth/login, pages/auth/register — экраны, роут app/(auth)/login.tsx, app/(auth)/register.tsx
 - Guard в app/_layout.tsx — редирект неавторизованного пользователя с защищённых вкладок (корзина/профиль) на логин; каталог остаётся доступным без входа
 - Восстановление сессии при холодном старте (чтение токенов из SecureStore → тихий refresh/getMe)

**Критерий**: регистрация → автовход → выход → повторный вход работают; истёкший access молча обновляется без разлогина пользователя.

## Блок 2 — Переработка entities/product под SKU и копейки

Зависит от: блок 0. Ломающие изменения в уже написанном коде.

 - Переписать Product/типы: priceCents, discountPercent, priceWithDiscountCents, series, productType, decor, material, capacityMl, weightG, dimensions, countryOfOrigin, ratingAverage, ratingCount, skus: ProductSku[], images[]; убрать currency/oldPrice
 - Добавить ProductSku тип (id, name, article, priceCents?, priceWithDiscountCents?, stockQty, isActive)
 - ProductCard/ProductCardSkeleton: обновить под новые поля, добавить рейтинг (звезда + ratingCount), обновить formatPrice
 - ProductStore.fetchList/fetchMore: переписать пагинацию под {items, page, size, total, totalPages} вместо hasMore/pageSize
 - Автодополнение: убрать ProductSuggestionStore.search как отдельный эндпоинт → переиспользовать productApi.getList({ query, size: 5 }); в дропдауне SearchBar показывать мини-карточки (фото+название+цена) вместо голого текста

**Критерий**: каталог реально работает с бэкендом (пока с моками/локальным сервером), карточки и автодополнение показывают корректные данные.

## Блок 3 — Категории как дерево

Зависит от: блок 2.

 - entities/category: тип с children[] (рекурсивный)
 - CategoryStore: fetchTree(), плоский геттер для быстрого поиска категории по id (для хлебных крошек)
 - widgets/category-nav: UI навигации по дереву — обсудить отдельно форму (drawer / горизонтальные чипсы верхнего уровня + модалка вглубь / breadcrumb) — вернёмся к этому как к дизайн-решению перед реализацией

**Критерий**: пользователь может дойти до товаров конкретной подкатегории.

## Блок 4 — Фильтры (фиксированный набор, свои, через query)

Зависит от: блок 2. Ты подтвердил: фильтры пишем сами, series — свободный ввод.

 - FiltersModal: реальная форма — priceFrom/priceTo (два инпута или range-slider), series (текстовое поле), type (select из захардкоженного справочника: сервиз/чайная пара/чашка/блюдце/тарелка/ваза/статуэтка/сувенир/сахарница/молочник), inStock/onlyDiscounted (тумблеры), sort (select: price_asc/price_desc/rating_desc/newest/discount_desc)
 - features/filter-products: локальное состояние формы → применение → сборка query-параметров → productStore.fetchList(params)
 - Индикатор количества активных фильтров на кнопке-иконке в каталоге (бейдж)

**Критерий**: любая комбинация фильтров корректно уходит в query и отражается в списке.

## Блок 5 — entities/cart + вкладка «Корзина»

Зависит от: блок 1 (нужен токен), блок 2 (SKU).

 - entities/cart: типы под sku_id-ключ, unavailable-флаг, лимиты (999/позиция, 100 позиций)
 - CartStore: fetch, addItem, updateQuantity, removeItem, clear
 - features/add-to-cart, features/change-cart-quantity, features/remove-from-cart
 - pages/cart — список позиций, обработка unavailable (визуально отличать, блокировать чек-аут при наличии таких позиций), пустое состояние
 - Роут app/(tabs)/cart.tsx

**Критерий**: добавление/удаление/изменение количества работает, недоступные позиции не пускают в оформление.

## Блок 6 — Страница товара (детальная) + выбор SKU

Зависит от: блок 2, блок 5 (кнопка «в корзину»), блок 8 (избранное — можно добавить позже, если раньше 5).

 - pages/product-detail: галерея изображений, характеристики (серия/декор/материал/вместимость/габариты), выбор SKU (если >1), кнопка добавить в корзину, рейтинг
 - Роут app/(tabs)/catalog/[productId].tsx (уже ссылались на него из карточки — сейчас 404, закрываем долг)

**Критерий**: переход с карточки каталога открывает детальную страницу, добавление в корзину работает с учётом выбранного SKU.

## Блок 7 — Оформление заказа + история заказов

Зависит от: блок 5.

 - entities/order: типы под реальные статусы (NEW/CONFIRMED/DELIVERED/CANCELLED), поля заказа как в контракте
 -features/checkout: форма (customerName, customerPhone, deliveryCity, deliveryAddress, comment), локальное автозаполнение из последнего успешного заказа (AsyncStorage/kvStorage, не серверная адресная книга), обработка 422 (список недоступных позиций) и 409
 - OrderStore: fetchList, fetchOne, create, cancel
 - pages/checkout, pages/order-detail, pages/order-history — вкладка в профиле «Мои заказы» (текущие/прошлые — фильтр по статусу)

**Критерий**: полный путь корзина → оформление → отслеживание статуса → (при NEW) отмена работает.

## Блок 8 — Избранное

Зависит от: блок 1, блок 2.

 - entities/favorite + FavoriteStore (fetch, add, remove, локальный Set id для мгновенного тоггла без ожидания ответа — optimistic update)
 - features/toggle-favorite — «сердечко» на ProductCard и на детальной странице
 - pages/favorites — список избранного, доступ из профиля

**Критерий**: сердечко переключается мгновенно и переживает перезапуск приложения.

## Блок 9 — Отзывы

Зависит от: блок 6, блок 7 (право на отзыв проверяется по DELIVERED-заказу).

 - entities/review + ReviewStore
 - widgets/product-reviews: список отзывов на детальной странице (пагинация)
 - features/write-review: форма (рейтинг звёздами + текст), показывается только если есть право (можно определять по ответу 403 при попытке, либо заранее скрывать — обсудим UX отдельно)
 - features/edit-review, features/delete-review — управление своим отзывом

**Критерий**: купивший и получивший заказ может оставить/изменить/удалить отзыв; остальные — только читают.

## Блок 10 — Профиль (полноценный, не только Settings)

Зависит от: блок 1.

 - pages/profile/menu — превращаем текущий app/(tabs)/profile.tsx из прямого Settings в меню: профиль (имя/email/телефон, редактирование через новый PATCH), заказы, избранное, настройки, о заводе
 - features/edit-profile — форма редактирования под будущий PATCH-эндпоинт
 - pages/profile/settings — переезжает на вложенный роут app/(tabs)/profile/settings.tsx (то, что мы уже сделали, почти без изменений, только смена места в дереве роутов)
 - pages/about — статический экран: хардкод контактов завода/о приложении (локали, без API)

**Критерий**: профиль — полноценный хаб, Settings-страница переезжает без потери функциональности.

## Блок 11 — Полировка и сверка с контрактом

Зависит от: блоки 1–10.

 Прогон всех сценариев из чек-листа бэкенда со стороны клиента: «каталог → корзина → заказ → доставка (эмулируется сменой статуса в админке/бэкенде) → отзыв»
 Проверка всех Problem Details сценариев (400/401/403/404/409/422) на понятные сообщения в UI, а не сырые технические тексты
 Ревизия design-экспериментов (Tamagui на Settings, GlassEffect) — решить, что остаётся на весь app