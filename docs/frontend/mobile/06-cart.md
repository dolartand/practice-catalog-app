# 06. Корзина

> Статус: Реализовано (блок 5)
> Версия: 0.1
> Связанные документы: [04. Auth](04-auth.md), [07. Заказы](07-orders.md), [Backend 05. Заказы](../../backend/05-orders.md)

## 1. Сущность

- `entities/cart`: типы под ключ `sku_id`, флаг `unavailable`.
- Лимиты: **999 шт/позиция**, **100 позиций** на корзину.

## 2. Store

`CartStore`: fetch, addItem, updateQuantity, removeItem, clear.

## 3. Фичи и UI

- features/add-to-cart, features/change-cart-quantity, features/remove-from-cart.
- `pages/cart`: список позиций; unavailable-позиции визуально отличимы; при их наличии чек-аут заблокирован; пустое состояние.
- Роут: `app/(tabs)/cart.tsx`.

**Критерий приёмки**: добавление/удаление/изменение количества работает; недоступные позиции не пускают в оформление.
