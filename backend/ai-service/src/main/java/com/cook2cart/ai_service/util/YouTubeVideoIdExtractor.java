package com.cook2cart.ai_service.util;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class YouTubeVideoIdExtractor {

    private static final Pattern YOUTUBE_VIDEO_ID_PATTERN =
            Pattern.compile("(?:v=|youtu\\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})");

    private YouTubeVideoIdExtractor() {
    }

    public static Optional<String> extract(String videoUrl) {
        if (videoUrl == null || videoUrl.isBlank()) {
            return Optional.empty();
        }

        Matcher matcher = YOUTUBE_VIDEO_ID_PATTERN.matcher(videoUrl);
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }
}
