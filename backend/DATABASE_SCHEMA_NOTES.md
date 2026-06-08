# Cook2Cart Database Schema Notes

Each microservice owns its own Neon PostgreSQL database. Do not share tables across services.

## Database Names

- `cook2cart_user_db`
- `cook2cart_video_db`
- `cook2cart_ai_db`
- `cook2cart_cart_db`
- `cook2cart_order_db` later

## Order Service Later

Suggested package: `com.cook2cart.order_service`.

Tables:

- `orders`
  - `id`
  - `user_id`
  - `address_id`
  - `total_amount`
  - `status`
  - `created_at`

- `order_items`
  - `id`
  - `order_id`
  - `item_name`
  - `quantity`
  - `price`

Relationship:

- One `Order` has many `OrderItem` rows.

Use `BigDecimal` for money and an enum for order status, such as `CREATED`, `CONFIRMED`, `PAID`, `DELIVERED`, `CANCELLED`.

## Future Infrastructure

Elasticsearch indexes:

- `recipe_index`
- `ingredient_index`
- `video_index`
- `search_suggestions`

Redis cache keys:

- `user_session`
- `jwt_tokens`
- `youtube_search_cache`
- `recipe_cache`
- `cart_cache`

S3:

- Store video files, audio files, and profile images in object storage.
- Database stores only URLs such as `s3Url`, `profileImage`, `thumbnailUrl`, `videoUrl`.

Kafka events:

- `recipe.extracted`
- `cart.created`
- `order.created`
- `notification.sent`
