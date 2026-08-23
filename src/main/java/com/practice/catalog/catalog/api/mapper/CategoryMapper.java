package com.practice.catalog.catalog.api.mapper;

import com.practice.catalog.catalog.api.dto.CategoryNodeResponse;
import com.practice.catalog.catalog.domain.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    @Mapping(target = "children", ignore = true)
    CategoryNodeResponse toNode(Category category);

    default List<CategoryNodeResponse> toNodes(List<Category> categories) {
        return categories.stream().map(this::toNode).toList();
    }
}
