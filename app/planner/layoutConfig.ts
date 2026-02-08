import { CORE_SIZE, HALL_GAP, HALL_ORDER } from "./constants";
import type { HallConfig, HallId, HallOrientation, HallSideConfig } from "./types";
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
    misWidth?: number;
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
    directions: Record<HallId, HallDirection>;
};

function defaultHallName(hallId: HallId): string {
    switch (hallId) {
        case "north":
            return "North Hall";
        case "east":
            return "East Hall";
        case "south":
            return "South Hall";
        case "west":
            return "West Hall";
    }
}

const CROSS_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: CORE_SIZE,
        height: CORE_SIZE,
        halls: [
            {
                id: 1,
                name: defaultHallName("north"),
                direction: "north",
                sections: [
                    {
                        name: "North",
                        slices: 8,
                        sideLeft: { type: "bulk", rowsPerSlice: 1 },
                        sideRight: { type: "bulk", rowsPerSlice: 1 },
                    },
                ],
            },
            {
                id: 2,
                name: defaultHallName("east"),
                direction: "east",
                sections: [
                    {
                        name: "East",
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 3,
                name: defaultHallName("south"),
                direction: "south",
                sections: [
                    {
                        name: "South",
                        slices: 8,
                        sideLeft: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                        sideRight: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                    },
                ],
            },
            {
                id: 4,
                name: defaultHallName("west"),
                direction: "west",
                sections: [
                    {
                        name: "West",
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
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
            {
                id: 1,
                name: defaultHallName("north"),
                direction: "north",
                sections: [
                    {
                        name: "North",
                        slices: 8,
                        sideLeft: { type: "bulk", rowsPerSlice: 1 },
                        sideRight: { type: "bulk", rowsPerSlice: 1 },
                    },
                ],
            },
            {
                id: 2,
                name: defaultHallName("east"),
                direction: "north",
                sections: [
                    {
                        name: "East",
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 3,
                name: defaultHallName("south"),
                direction: "south",
                sections: [
                    {
                        name: "South",
                        slices: 8,
                        sideLeft: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                        sideRight: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                    },
                ],
            },
            {
                id: 4,
                name: defaultHallName("west"),
                direction: "south",
                sections: [
                    {
                        name: "West",
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
        ],
    },
};

const STORAGE_LAYOUTS: Record<StorageLayoutPreset, StorageLayoutDefinition> = {
    cross: CROSS_LAYOUT,
    h: H_LAYOUT,
};

function normalizeSide(side: HallSide | HallSideConfig | undefined): HallSideConfig {
    if (!side) {
        return {
            type: "bulk",
            rowsPerSlice: 1,
            misSlotsPerSlice: 54,
            misUnitsPerSlice: 1,
            misWidth: 1,
        };
    }
    const misWidth = side.type === "mis" ? side.misWidth ?? 2 : 1;
    return {
        type: side.type,
        rowsPerSlice: side.rowsPerSlice,
        misSlotsPerSlice: side.misSlotsPerSlice ?? 54,
        misUnitsPerSlice: side.rowsPerSlice ?? 1,
        misWidth,
    };
}

export function buildInitialHallConfigs(
    preset: StorageLayoutPreset = "cross",
): Record<HallId, HallConfig> {
    const definition = STORAGE_LAYOUTS[preset];
    const result = {} as Record<HallId, HallConfig>;
    for (const hallId of HALL_ORDER) {
        const layoutHall = definition.core.halls[HALL_ORDER.indexOf(hallId)];
        const sections = layoutHall?.sections ?? [];
        result[hallId] = {
            name: layoutHall?.name,
            sections: sections.map((section) => ({
                slices: Math.max(1, section.slices),
                sideLeft: normalizeSide(section.sideLeft),
                sideRight: normalizeSide(section.sideRight),
            })),
        };
    }
    return result;
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

export function directionOrientation(direction: HallDirection): HallOrientation {
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

export function directionReverseSlices(direction: HallDirection): boolean {
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
    const directions: ResolvedStorageLayout["directions"] = {
        north: definition.core.halls[0]?.direction ?? "north",
        east: definition.core.halls[1]?.direction ?? "east",
        south: definition.core.halls[2]?.direction ?? "south",
        west: definition.core.halls[3]?.direction ?? "west",
    };
    const byDirection = new Map<HallDirection, HallId[]>();
    for (const hallId of HALL_ORDER) {
        const layoutHall = definition.core.halls[HALL_ORDER.indexOf(hallId)];
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
            const size = getHallSize(hallConfigs[hallId], orientation);
            const perpendicular = orientation === "vertical" ? size.width : size.height;
            return Math.max(max, perpendicular);
        }, 0);
        const spacing = maxPerpSpan + HALL_GAP;

        for (const [index, hallId] of hallIds.entries()) {
            const size = getHallSize(hallConfigs[hallId], orientation);
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
            directions[hallId] = direction;
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
        directions,
    };
}
