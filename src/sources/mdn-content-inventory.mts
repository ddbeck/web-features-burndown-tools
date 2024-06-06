import mdnContentInventory from "@ddbeck/mdn-content-inventory";

export const metadata = mdnContentInventory.metadata;

export const slugsToCompatKeys = (() => {
  const result = new Map<string, string[]>();
  for (const item of mdnContentInventory.inventory) {
    result.set(item.frontmatter.slug, keys(item.frontmatter["browser-compat"]));
  }
  return result;
})();

export const compatKeys = (() => {
  return [...slugsToCompatKeys.values()].flat();
})();

function keys(browserCompat: string | string[] | undefined): string[] {
  return Array.isArray(browserCompat)
    ? browserCompat
    : typeof browserCompat === "string"
      ? [browserCompat]
      : [];
}
