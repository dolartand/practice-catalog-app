// Расширения API из docs/frontend/web/03-api-integration.md §6.
// Реализованы бэкендом (commit 7c1aaee). Флаги оставлены как рубильник отката
// на обходные пути — включение/выключение одной строкой.

export const features = {
  gaps: {
    /** GET /admin/products?status=… и GET /admin/products/{id} — список и карточка любого статуса */
    adminProductList: true,
    /** GET /admin/categories — полное дерево вкл. скрытые/удалённые категории */
    adminCategoryTree: true,
    /** GET /admin/orders/{id} — состав заказа и история статусов у оператора */
    adminOrderDetails: true,
    /** email/имя пользователя и данные товара в ответе GET /admin/reviews */
    reviewAuthorInfo: true,
  },
} as const;
