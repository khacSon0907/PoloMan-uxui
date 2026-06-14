const CATEGORY_ERROR_MESSAGES = {
  "CATEGORY.HAS_CHILDREN": "Không thể xóa danh mục vì vẫn còn danh mục con.",
  "CATEGORY.INVALID_PARENT": "Danh mục cha không hợp lệ.",
  "CATEGORY.CYCLE_DETECTED": "Không thể tạo vòng lặp danh mục.",
  "CATEGORY.NOT_FOUND": "Không tìm thấy danh mục.",
  "CATEGORY.EXISTS": "Danh mục đã tồn tại.",
};

function getCategorySortOrder(category) {
  return Number(category?.sortOrder ?? 0);
}

function getCategoryName(category) {
  return String(category?.name || "");
}

export function normalizeCategoryTree(categories) {
  if (!Array.isArray(categories)) return [];

  return [...categories]
    .filter(Boolean)
    .map((category) => ({
      ...category,
      id: category.id || category._id,
      parentId: category.parentId ?? null,
      active: category.active !== false,
      sortOrder: getCategorySortOrder(category),
      children: normalizeCategoryTree(category.children || []),
    }))
    .sort(
      (first, second) =>
        getCategorySortOrder(first) - getCategorySortOrder(second) ||
        getCategoryName(first).localeCompare(getCategoryName(second)),
    );
}

export function flattenCategoryTree(categories, options = {}) {
  const {
    excludeId = "",
    excludeDescendantsOf = "",
    onlyActive = false,
    parentName = "",
  } = options;
  const blockedIds = new Set(excludeId ? [String(excludeId)] : []);

  function collectBlocked(nodes, targetId, isInsideTarget = false) {
    nodes.forEach((category) => {
      const categoryId = String(category.id || "");
      const isTarget = targetId && categoryId === String(targetId);

      if (isInsideTarget || isTarget) {
        blockedIds.add(categoryId);
      }

      collectBlocked(category.children || [], targetId, isInsideTarget || isTarget);
    });
  }

  if (excludeDescendantsOf) {
    collectBlocked(categories, excludeDescendantsOf);
  }

  function walk(nodes, level = 0, currentParentName = parentName) {
    return nodes.flatMap((category) => {
      const categoryId = String(category.id || "");
      const isBlocked = blockedIds.has(categoryId);
      const children = walk(category.children || [], level + 1, category.name || "");

      if (isBlocked || (onlyActive && category.active === false)) {
        return children;
      }

      return [
        {
          ...category,
          level,
          parentName: category.parentId ? currentParentName : "",
          label: `${"— ".repeat(level)}${category.name || ""}`,
        },
        ...children,
      ];
    });
  }

  return walk(normalizeCategoryTree(categories));
}

export function getCategoryBusinessMessage(error, fallbackMessage) {
  const data = error?.response?.data || error?.data || {};
  const code =
    data.code ||
    data.errorCode ||
    data.error ||
    data.messageCode ||
    data?.data?.code ||
    data?.data?.errorCode ||
    (CATEGORY_ERROR_MESSAGES[data.message] ? data.message : "");

  return CATEGORY_ERROR_MESSAGES[code] || data.message || error?.message || fallbackMessage;
}
