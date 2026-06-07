package com.cook2cart.video_service.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class VideoResponseDTO {

    private String videoPath;

    private String audioPath;

    private String status;

    private String message;

    public VideoResponseDTO(String videoPath, String audioPath, String status, String message) {
        this.videoPath = videoPath;
        this.audioPath = audioPath;
        this.status = status;
        this.message = message;
    }
}