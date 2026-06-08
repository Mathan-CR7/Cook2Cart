package com.cook2cart.video_service.config;

import java.util.Locale;

public final class RedisCacheKeyUtil {

    private RedisCacheKeyUtil() {
    }

    public static String youtubeSearchKey(String query) {
        if (query == null || query.isBlank()) {
            return "search:empty";
        }

        String normalizedQuery = query.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");

        return "search:" + normalizedQuery;
    }
}
