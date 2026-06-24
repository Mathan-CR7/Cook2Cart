package com.cook2cart.ai_service.repository;

import com.cook2cart.ai_service.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    // Fetch a single recipe with its ingredients+ingredientEntity eagerly in one query.
    // Used as the second step in two-step lookups (get ID first, then fetch full entity).
    @Query("""
            SELECT DISTINCT r FROM Recipe r
            LEFT JOIN FETCH r.ingredients ri
            LEFT JOIN FETCH ri.ingredient
            WHERE r.id = :id
            """)
    Optional<Recipe> findByIdWithDetails(@Param("id") Long id);

    // Fetch all recipes for a user with ingredients eagerly (no LIMIT = no in-memory pagination issue).
    @Query("""
            SELECT DISTINCT r FROM Recipe r
            LEFT JOIN FETCH r.ingredients ri
            LEFT JOIN FETCH ri.ingredient
            WHERE r.userId = :userId
            """)
    List<Recipe> findByUserId(@Param("userId") Long userId);

    List<Recipe> findByVideoId(Long videoId);

    @Query("SELECT COUNT(r) > 0 FROM Recipe r WHERE r.videoId = :videoId")
    boolean recipeExistsForVideo(@Param("videoId") Long videoId);

    // ---- ID-only queries (safe to paginate at SQL level, no collection fetch) ----

    @Query("""
            SELECT r.id FROM Recipe r
            WHERE r.videoId = :videoId
            ORDER BY r.createdAt DESC
            LIMIT 1
            """)
    Optional<Long> findLatestIdByVideoId(@Param("videoId") Long videoId);

    @Query("""
            SELECT r.id FROM Recipe r
            WHERE r.youtubeVideoId = :youtubeVideoId
            ORDER BY r.createdAt DESC
            LIMIT 1
            """)
    Optional<Long> findLatestIdByYoutubeVideoId(@Param("youtubeVideoId") String youtubeVideoId);
}
