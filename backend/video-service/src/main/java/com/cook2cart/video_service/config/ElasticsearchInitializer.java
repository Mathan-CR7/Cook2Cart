package com.cook2cart.video_service.config;

import com.cook2cart.video_service.search.VideoSearchDocument;
import com.cook2cart.video_service.search.VideoSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchInitializer implements CommandLineRunner {

    private final VideoSearchRepository videoSearchRepository;

    @Override
    public void run(String... args) {
        try {
            long count = videoSearchRepository.count();
            if (count == 0) {
                log.info("Elasticsearch index is empty. Initializing mock recipes...");
                initializeMockRecipes();
            } else {
                log.info("Elasticsearch index has {} documents.", count);
            }
        } catch (Exception e) {
            log.warn("Could not connect to Elasticsearch at startup to verify/initialize index. It might be offline.", e);
        }
    }

    private void initializeMockRecipes() {
        List<VideoSearchDocument> docs = List.of(
            // Egg Recipes
            createDoc("JZqv7EATz6s-egg-curry", "JZqv7EATz6s", "Egg Curry | Dhaba Style Egg Curry Recipe", "Kabita's Kitchen", "https://img.youtube.com/vi/JZqv7EATz6s/hqdefault.jpg", "egg"),
            createDoc("OoIyrVOYG-8-egg-biryani", "OoIyrVOYG-8", "Egg Biryani | Easiest Egg Biryani Recipe", "Cooking Shooking", "https://img.youtube.com/vi/OoIyrVOYG-8/hqdefault.jpg", "egg"),
            createDoc("6Au_WwSLJ3Q-egg-fried-rice", "6Au_WwSLJ3Q", "Egg Fried Rice Recipe | Restaurant Style", "Your Food Lab", "https://img.youtube.com/vi/6Au_WwSLJ3Q/hqdefault.jpg", "egg"),
            createDoc("JZqv7EATz6s-egg-masala", "JZqv7EATz6s", "Egg Masala Gravy | Spicy Egg Recipe", "Spice Eats", "https://img.youtube.com/vi/JZqv7EATz6s/hqdefault.jpg", "egg"),
            
            // Chicken Recipes
            createDoc("4THANac_Rhs-chicken-biryani", "4THANac_Rhs", "Chicken Biryani | Authentic Hyderabadi Chicken Biryani", "Vahchef", "https://img.youtube.com/vi/4THANac_Rhs/hqdefault.jpg", "chicken"),
            createDoc("Ayo80PIb-Qg-chicken-curry", "Ayo80PIb-Qg", "Chicken Curry | Simple Home Style Chicken Curry", "Chef Ranveer Brar", "https://img.youtube.com/vi/Ayo80PIb-Qg/hqdefault.jpg", "chicken"),
            
            // Mutton Recipes
            createDoc("9j1sS1HnwQk-mutton-curry", "9j1sS1HnwQk", "Mutton Curry | Special Mutton Masala Recipe", "Ranveer Brar", "https://img.youtube.com/vi/9j1sS1HnwQk/hqdefault.jpg", "mutton")
        );

        try {
            videoSearchRepository.saveAll(docs);
            log.info("Successfully indexed {} mock recipes in Elasticsearch.", docs.size());
        } catch (Exception e) {
            log.error("Failed to save mock recipes in Elasticsearch.", e);
        }
    }

    private VideoSearchDocument createDoc(String id, String videoId, String title, String channelName, String thumbnailUrl, String keyword) {
        return VideoSearchDocument.builder()
                .id(id)
                .videoId(videoId)
                .title(title)
                .channelName(channelName)
                .thumbnailUrl(thumbnailUrl)
                .searchKeyword(keyword)
                .searchedAt(LocalDateTime.now())
                .build();
    }
}
