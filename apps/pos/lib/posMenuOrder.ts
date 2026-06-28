const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER

export function getMenuSortOrder(item: any): number {
  if (typeof item?.sort_order === 'number') return item.sort_order

  const platformOrder = item?.platform_prices?._menu_sort_order
  if (typeof platformOrder === 'number' && Number.isFinite(platformOrder)) {
    return platformOrder
  }

  return FALLBACK_ORDER
}

export function withMenuSortOrder(platformPrices: any, sortOrder: number) {
  const nextPlatformPrices =
    platformPrices && typeof platformPrices === 'object' && !Array.isArray(platformPrices)
      ? { ...platformPrices }
      : {}

  nextPlatformPrices._menu_sort_order = sortOrder
  return nextPlatformPrices
}

export function sortMenuItemsByOrder<T extends { name?: string; created_at?: string }>(items: T[]): T[] {
  return [...items].sort((a: any, b: any) => {
    const aOrder = getMenuSortOrder(a)
    const bOrder = getMenuSortOrder(b)

    if (aOrder !== bOrder) return aOrder - bOrder

    const aCreatedAt = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bCreatedAt = b?.created_at ? new Date(b.created_at).getTime() : 0
    if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt

    return (a?.name || '').localeCompare(b?.name || '', 'th')
  })
}
