package com.cook2cart.productservice.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductSuggestionSchemaConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void relaxSourceCheckConstraint() {
        try {
            List<String> constraintNames = jdbcTemplate.queryForList("""
                    select con.conname
                    from pg_constraint con
                    join pg_class rel on rel.oid = con.conrelid
                    where rel.relname = 'product_suggestions'
                      and con.contype = 'c'
                      and pg_get_constraintdef(con.oid) ilike '%source%'
                    """, String.class);

            for (String constraintName : constraintNames) {
                jdbcTemplate.execute("alter table product_suggestions drop constraint if exists " + constraintName);
                log.info("Dropped product_suggestions source check constraint: {}", constraintName);
            }
        } catch (Exception ex) {
            log.warn("Could not relax product_suggestions source check constraint: {}", ex.getMessage());
        }
    }
}
