export interface POSMenuLabelFields {
  name?: string | null;
  name_th?: string | null;
  name_en?: string | null;
  name_zh?: string | null;
}

const normalize = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const getPrimaryMenuName = (item: POSMenuLabelFields) =>
  normalize(item.name) || normalize(item.name_th) || normalize(item.name_en) || normalize(item.name_zh) || "-";

export const getSecondaryMenuName = (
  item: POSMenuLabelFields,
  preferredLocale: "en" | "zh" = "en"
) => {
  const primary = getPrimaryMenuName(item);
  const candidates =
    preferredLocale === "zh"
      ? [normalize(item.name_zh), normalize(item.name_en), normalize(item.name_th)]
      : [normalize(item.name_en), normalize(item.name_zh), normalize(item.name_th)];

  return candidates.find(candidate => candidate && candidate !== primary) || null;
};

export const getMenuSearchText = (item: POSMenuLabelFields) =>
  [item.name, item.name_th, item.name_en, item.name_zh]
    .map(normalize)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
