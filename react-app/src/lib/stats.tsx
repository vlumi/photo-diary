/* eslint-disable @typescript-eslint/no-explicit-any */
// Aggregates photo stats into chart data + table rows. Internal
// accumulators use `any` because their shape is built dynamically
// from runtime data; public entry points are properly typed.
import { createStatsContext } from "./stats/context";
import { buildGearTopic } from "./stats/gear";
import { buildGeneralTopic } from "./stats/general";
import { buildImageTopic } from "./stats/image";
import { buildLightTopic } from "./stats/light";
import { buildSettingsTopic } from "./stats/settings";
import { buildTimeTopic } from "./stats/time";
import { UNKNOWN, decodeTableRowKey, type StatsTopic } from "./stats/shared";

export type * from "./stats/shared";

const collectTopics = (
  ...args: Parameters<typeof createStatsContext>
): StatsTopic[] => {
  const context = createStatsContext(...args);
  const topics = [
    buildGeneralTopic(context),
    buildTimeTopic(context),
    buildGearTopic(context),
    buildSettingsTopic(context),
    buildImageTopic(context),
    buildLightTopic(context),
  ];
  // Internal carriers widen chart.type/table cells; runtime matches.
  return topics as unknown as StatsTopic[];
};

export default { UNKNOWN, decodeTableRowKey, collectTopics };
