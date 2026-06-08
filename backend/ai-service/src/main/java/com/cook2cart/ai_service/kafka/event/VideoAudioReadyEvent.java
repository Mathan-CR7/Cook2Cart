package com.cook2cart.ai_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoAudioReadyEvent {
    private Long userId;
    private Long videoId;
    private String videoUrl;
    private String videoPath;
    private String audioPath;
    private String status;
    private LocalDateTime createdAt;
}
