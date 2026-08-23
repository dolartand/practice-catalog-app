# practice-catalog-app

Бэкенд каталога фарфора: товары, корзина, заказы, отзывы. Модульный монолит на Spring Boot 4 / Java 25.

## Документация

Вся проектная документация — в [docs/](docs/):

- [01. Архитектура](docs/01-architecture.md)
- [02. Модель данных](docs/02-domain-model.md)
- [03. Дизайн API](docs/03-api-design.md)
- [04. Аутентификация](docs/04-auth.md)
- [05. Заказы](docs/05-orders.md)
- [06. События](docs/06-events.md)
- [07. Кэширование и медиа](docs/07-caching-and-media.md)
- [08. Запуск и окружения](docs/08-setup.md)
- [09. Roadmap](docs/09-roadmap.md)
- [10. Задачи разработки](docs/10-development-tasks.md)

## Быстрый старт

Требования: JDK 25+, Docker, Docker Compose.

1. Поднять инфраструктуру (PostgreSQL, Redis, Kafka, MinIO):

   ```bash
   docker compose up -d
   ```

2. Задать секреты (обязательно `JWT_SECRET` — строка ≥ 32 байт; опционально `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
3. Запустить приложение:

   ```bash
   ./mvnw spring-boot:run
   ```

4. Проверить здоровье:

   ```bash
   curl http://localhost:8080/actuator/health
   ```

Полная инструкция и список переменных окружения — [docs/08-setup.md](docs/08-setup.md).

## Сборка и тесты

```bash
./mvnw clean compile   # компиляция
./mvnw test            # юнит + интеграционные тесты (нужен запущенный Docker)
./mvnw package         # сборка jar
```
