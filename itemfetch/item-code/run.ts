import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { OUTPUT_PATH } from "./config";
import { parseBlocks, parseItems } from "./parser";
import { loadJavaSources } from "./source-loader";

export async function runItemCodeFetch(): Promise<void> {
  const { itemsJavaSource, blocksJavaSource, sourceInfo } = await loadJavaSources();

  const blocks = parseBlocks(blocksJavaSource);
  const blockMap = new Map(blocks.map((block) => [block.fieldName, block]));
  const items = parseItems(itemsJavaSource, blockMap);

  const output = {
    generatedAt: new Date().toISOString(),
    source: sourceInfo,
    counts: {
      blockCount: blocks.length,
      itemCount: items.length,
      itemCountWithBlockLoot: items.filter((item) => item.blockLoot !== null).length,
      noLootTableBlockCount: blocks.filter((block) => block.loot.noLootTable).length,
      overrideLootTableBlockCount: blocks.filter(
        (block) => block.loot.overrideLootTable !== null,
      ).length,
    },
    blocks,
    items,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}
