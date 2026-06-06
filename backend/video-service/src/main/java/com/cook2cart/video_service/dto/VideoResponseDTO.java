package com.cook2cart.video_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VideoResponseDTO {

    private String videoPath;

    private String audioPath;

    private String status;

    private String message;
}