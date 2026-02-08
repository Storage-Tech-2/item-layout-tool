import { CORE_SIZE, HALL_GAP, HALL_LABELS, HALL_ORDER } from "./constants";
import type { HallConfig, HallId, HallOrientation } from "./types";
import { getHallSize } from "./utils";

export type HallDirection = "north" | "east" | "south" | "west";
export type StorageLayoutPreset = "cross" | "h";

export type HallCore = {
    name: string;
    shape: "rectangle" | "ellipse";
    width: number;
    height: number;
    halls: Hall[];
};

export type Hall = {
    id: number;
    name: string;
    direction: HallDirection;
    sections: HallSection[];
};

export type HallSection = {
    name: string;
    slices: number;
    sideLeft?: HallSide;
    sideRight?: HallSide;
};

export type HallSide = {
    type: "bulk" | "chest" | "mis";
    rowsPerSlice: number;
    misSlotsPerSlice?: number;
    misUnitsPerSlice?: number;
};

type HallAnchor = {
    x: "left" | "center" | "right";
    y: "top" | "center" | "bottom";
    offsetX: number;
    offsetY: number;
    transform: string;
};

type StorageLayoutDefinition = {
    core: HallCore;
};

export type ResolvedStorageLayout = {
    core: {
        left: number;
        top: number;
        width: number;
        height: number;
        label: string;
    };
    positions: Record<HallId, { left: number; top: number; transform: string; width: number; height: number }>;
    orientations: Record<HallId, HallOrientation>;
    reverseSlices: Record<HallId, boolean>;
};

const CROSS_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: CORE_SIZE,
        height: CORE_SIZE,
        halls: [
            { id: 1, name: HALL_LABELS.north, direction: "north", sections: [] },
            { id: 2, name: HALL_LABELS.east, direction: "east", sections: [] },
            { id: 3, name: HALL_LABELS.south, direction: "south", sections: [] },
            { id: 4, name: HALL_LABELS.west, direction: "west", sections: [] },
        ],
    },
};

const H_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Main Core",
        shape: "rectangle",
        width: Math.max(Math.round(CORE_SIZE * 2.1), 320),
        height: Math.max(Math.round(CORE_SIZE * 0.5), 92),
        halls: [
            { id: 1, name: HALL_LABELS.north, direction: "north", sections: [] },
            { id: 2, name: HALL_LABELS.east, direction: "north", sections: [] },
            { id: 3, name: HALL_LABELS.south, direction: "south", sections: [] },
            { id: 4, name: HALL_LABELS.west, direction: "south", sections: [] },
        ],
    },
};

const STORAGE_LAYOUTS: Record<StorageLayoutPreset, StorageLayoutDefinition> = {
    cross: CROSS_LAYOUT,
    h: H_LAYOUT,
};

function toHallConfig(
    layoutHall: Hall | undefined,
    fallback: HallConfig,
): HallConfig {
    if (!layoutHall || layoutHall.sections.length === 0) {
        return fallback;
    }
    const fallbackSection = fallback.sections[0];
    if (!fallbackSection) {
        return fallback;
    }
    return {
        name: layoutHall.name,
        sections: layoutHall.sections.map((section) => ({
            slices: Math.max(1, section.slices),
            sideLeft: {
                ...fallbackSection.sideLeft,
                ...(section.sideLeft ?? {}),
            },
            sideRight: {
                ...fallbackSection.sideRight,
                ...(section.sideRight ?? {}),
            },
        })),
    };
}

function anchorCoordinate(start: number, span: number, anchor: "left" | "center" | "right"): number {
    if (anchor === "left") {
        return start;
    }
    if (anchor === "right") {
        return start + span;
    }
    return start + span / 2;
}

function anchorCoordinateY(start: number, span: number, anchor: "top" | "center" | "bottom"): number {
    if (anchor === "top") {
        return start;
    }
    if (anchor === "bottom") {
        return start + span;
    }
    return start + span / 2;
}

function directionOrientation(direction: HallDirection): HallOrientation {
    return direction === "north" || direction === "south" ? "vertical" : "horizontal";
}

function directionAnchor(direction: HallDirection): HallAnchor {
    switch (direction) {
        case "north":
            return {
                x: "center",
                y: "top",
                offsetX: 0,
                offsetY: -HALL_GAP,
                transform: "translate(-50%, -100%)",
            };
        case "south":
            return {
                x: "center",
                y: "bottom",
                offsetX: 0,
                offsetY: HALL_GAP,
                transform: "translate(-50%, 0)",
            };
        case "east":
            return {
                x: "right",
                y: "center",
                offsetX: HALL_GAP,
                offsetY: 0,
                transform: "translate(0, -50%)",
            };
        case "west":
            return {
                x: "left",
                y: "center",
                offsetX: -HALL_GAP,
                offsetY: 0,
                transform: "translate(-100%, -50%)",
            };
    }
}

function directionReverseSlices(direction: HallDirection): boolean {
    return direction === "north" || direction === "west";
}

function laneOffset(index: number, count: number, spacing: number): number {
    return (index - (count - 1) / 2) * spacing;
}

export function resolveStorageLayout(
    preset: StorageLayoutPreset,
    hallConfigs: Record<HallId, HallConfig>,
    center: number,
): ResolvedStorageLayout {
    const definition = STORAGE_LAYOUTS[preset];
    const coreLeft = center - definition.core.width / 2;
    const coreTop = center - definition.core.height / 2;

    const positions: ResolvedStorageLayout["positions"] = {
        north: { left: 0, top: 0, transform: "", width: 0, height: 0 },
        east: { left: 0, top: 0, transform: "", width: 0, height: 0 },
        south: { left: 0, top: 0, transform: "", width: 0, height: 0 },
        west: { left: 0, top: 0, transform: "", width: 0, height: 0 },
    };
    const orientations: ResolvedStorageLayout["orientations"] = {
        north: "vertical",
        east: "horizontal",
        south: "vertical",
        west: "horizontal",
    };
    const reverseSlices: ResolvedStorageLayout["reverseSlices"] = {
        north: false,
        east: false,
        south: false,
        west: false,
    };

    const byDirection = new Map<HallDirection, HallId[]>();
    const effectiveHallConfigs: Record<HallId, HallConfig> = {
        north: hallConfigs.north,
        east: hallConfigs.east,
        south: hallConfigs.south,
        west: hallConfigs.west,
    };
    for (const hallId of HALL_ORDER) {
        const layoutHall = definition.core.halls[HALL_ORDER.indexOf(hallId)];
        effectiveHallConfigs[hallId] = toHallConfig(layoutHall, hallConfigs[hallId]);
        const hallDirection = layoutHall?.direction ?? hallId;
        if (!byDirection.has(hallDirection)) {
            byDirection.set(hallDirection, []);
        }
        byDirection.get(hallDirection)!.push(hallId);
    }

    for (const [direction, hallIds] of byDirection.entries()) {
        const anchor = directionAnchor(direction);
        const orientation = directionOrientation(direction);
        const maxPerpSpan = hallIds.reduce((max, hallId) => {
            const size = getHallSize(effectiveHallConfigs[hallId], orientation);
            const perpendicular = orientation === "vertical" ? size.width : size.height;
            return Math.max(max, perpendicular);
        }, 0);
        const spacing = maxPerpSpan + HALL_GAP;

        for (const [index, hallId] of hallIds.entries()) {
            const size = getHallSize(effectiveHallConfigs[hallId], orientation);
            const baseX =
                anchorCoordinate(coreLeft, definition.core.width, anchor.x) + anchor.offsetX;
            const baseY =
                anchorCoordinateY(coreTop, definition.core.height, anchor.y) + anchor.offsetY;
            const offset = laneOffset(index, hallIds.length, spacing);
            const offsetX = direction === "north" || direction === "south" ? offset : 0;
            const offsetY = direction === "east" || direction === "west" ? offset : 0;

            positions[hallId] = {
                left: baseX + offsetX,
                top: baseY + offsetY,
                transform: anchor.transform,
                width: size.width,
                height: size.height,
            };
            orientations[hallId] = orientation;
            reverseSlices[hallId] = directionReverseSlices(direction);
        }
    }

    return {
        core: {
            left: coreLeft,
            top: coreTop,
            width: definition.core.width,
            height: definition.core.height,
            label: definition.core.name,
        },
        positions,
        orientations,
        reverseSlices,
    };
}
