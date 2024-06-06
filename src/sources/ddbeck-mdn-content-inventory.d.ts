declare interface Frontmatter {
  title: string;
  slug: string;
  "page-type": string;
  "browser-compat"?: string | string[];
}

declare interface InventoryItem {
  path: string;
  frontmatter: Frontmatter;
}

declare interface InventoryMetadata {
  commit: string;
  commitShort: string;
  authorDate: string;
}

declare namespace MDNContentInventory {
  const metadata: InventoryMetadata;
  const inventory: InventoryItem[];
}

declare module "@ddbeck/mdn-content-inventory" {
  export default MDNContentInventory;
}
