package com.cook2cart.video_service.repository;

import com.cook2cart.video_service.entity.UserVideoAction;
import com.cook2cart.video_service.entity.UserVideoActionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserVideoActionRepository extends JpaRepository<UserVideoAction, Long> {
    List<UserVideoAction> findByUserIdAndActionTypeOrderByCreatedAtDesc(Long userId, UserVideoActionType actionType);

    Optional<UserVideoAction> findByUserIdAndVideoIdAndActionType(Long userId, Long videoId, UserVideoActionType actionType);

    void deleteByUserIdAndVideoIdAndActionType(Long userId, Long videoId, UserVideoActionType actionType);
}
