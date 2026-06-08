package com.cook2cart.video_service.kafka.producer;

import com.cook2cart.video_service.kafka.event.VideoAudioReadyEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoAudioReadyProducer {

    private final KafkaTemplate<String, VideoAudioReadyEvent> kafkaTemplate;

    @Value("${cook2cart.kafka.topics.video-audio-ready}")
    private String audioReadyTopic;

    public void publish(VideoAudioReadyEvent event) {
        String key = event.getVideoId() == null ? event.getVideoUrl() : String.valueOf(event.getVideoId());

        kafkaTemplate.send(audioReadyTopic, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish AUDIO_READY event for key {}", key, ex);
                        return;
                    }

                    log.info(
                            "Published AUDIO_READY event to topic {} partition {} offset {}",
                            result.getRecordMetadata().topic(),
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset()
                    );
                });
    }
}
