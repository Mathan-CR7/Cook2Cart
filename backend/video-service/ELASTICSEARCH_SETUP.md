# Cook2Cart Video Search With Elasticsearch

## Docker Commands

Start Elasticsearch:

```powershell
cd D:\KovanLabs\Cook2Cart
docker compose up -d elasticsearch
```

Verify Elasticsearch:

```powershell
curl http://localhost:9200
```

Stop Elasticsearch:

```powershell
docker compose stop elasticsearch
```

Stop and remove the container, keeping the persistent volume:

```powershell
docker compose down
```

Remove Elasticsearch data too:

```powershell
docker compose down -v
```

## Video Service Configuration

For local Java/IntelliJ runs:

```properties
spring.elasticsearch.uris=http://localhost:9200
```

For Dockerized video-service on Docker Desktop:

```powershell
-e SPRING_ELASTICSEARCH_URIS=http://host.docker.internal:9200
```

## Postman Test URLs

Index one video:

```http
POST http://localhost:8080/video/index-video
Content-Type: application/json

{
  "videoId": "abc123",
  "title": "Chicken Biryani Recipe",
  "channelName": "Food Channel",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "searchKeyword": "chicken"
}
```

Autocomplete:

```http
GET http://localhost:8080/video/suggestions?prefix=chi
```

Fuzzy search:

```http
GET http://localhost:8080/video/search-history?keyword=chiken%20biriyani
```

Search indexed saved videos:

```http
GET http://localhost:8080/video/user-video-search?userId=1&actionType=SAVED&keyword=chicken
```

Search indexed favorite videos:

```http
GET http://localhost:8080/video/user-video-search?userId=1&actionType=FAVORITE&keyword=biryani
```

Search indexed watched history:

```http
GET http://localhost:8080/video/user-video-search?userId=1&actionType=HISTORY&keyword=curry
```

Delete indexed document:

```http
DELETE http://localhost:8080/video/index/abc123-chicken
```

YouTube search automatically indexes returned videos:

```http
GET http://localhost:8080/video/search?query=chicken
```

Then test suggestions:

```http
GET http://localhost:8080/video/suggestions?prefix=chi
```

## Future Search Expansion

The same `video_index` document model includes `userId` and `actionType` fields for:

- saved videos
- favorite recipes
- search history
- processed recipes

Current DB-backed saved/history/favorite actions are stored in `user_video_actions` and indexed as `SAVED`, `FAVORITE`, and `HISTORY` documents.
