package com.cook2cart.video_service.search;

import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface VideoSearchRepository extends ElasticsearchRepository<VideoSearchDocument, String> {
}
