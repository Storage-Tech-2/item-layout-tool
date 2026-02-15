import { CORE_SIZE, HALL_GAP } from "./constants";
import type { HallConfig, HallId, HallOrientation, HallSideConfig } from "./types";
import { getHallSize } from "./utils";

export type HallDirection = "north" | "east" | "south" | "west";
export type StorageLayoutPreset =  "single" | "double" | "triple" | "cross" | "h" | "hcross" | "octa";

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

export type StorageLayoutDefinition = {
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
    return `Hall ${hallId}`;
}


const SINGLE_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Front",
        shape: "rectangle",
        width: CORE_SIZE / 4,
        height: CORE_SIZE,
        halls: [
            {
                id: 1,
                name: "Main Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
        ],
    },
};


const DOUBLE_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: CORE_SIZE / 2,
        height: CORE_SIZE,
        halls: [
            {
                id: 1,
                name: "Main Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 2,
                name: "Main Hall",
                direction: "west",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
        ],
    },
};


const TRIPLE_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: CORE_SIZE,
        height: CORE_SIZE,
        halls: [
            {
                id: 1,
                name: "East Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 2,
                name: "West Hall",
                direction: "west",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 3,
                name: "South Hall",
                direction: "south",
                sections: [
                    {
                        slices: 8,
                        sideLeft: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                        sideRight: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                    },
                ],
            },
        ],
    },
};


const CROSS_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: CORE_SIZE,
        height: CORE_SIZE,
        halls: [
            {
                id: 1,
                name: "North Hall",
                direction: "north",
                sections: [
                    {
                        slices: 8,
                        sideLeft: { type: "bulk", rowsPerSlice: 1 },
                        sideRight: { type: "bulk", rowsPerSlice: 1 },
                    },
                ],
            },
            {
                id: 2,
                name: "East Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 3,
                name: "South Hall",
                direction: "south",
                sections: [
                    {
                        slices: 8,
                        sideLeft: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                        sideRight: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                    },
                ],
            },
            {
                id: 4,
                name: "West Hall",
                direction: "west",
                sections: [
                    {
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
        name: "Core",
        shape: "rectangle",
        width: Math.max(Math.round(CORE_SIZE * 0.5), 92),
        height: Math.max(Math.round(CORE_SIZE * 2), 320),
        halls: [
            {
                id: 1,
                name: "Northwest Hall",
                direction: "west",
                sections: [
                    {
                        slices: 8,
                        sideLeft: { type: "bulk", rowsPerSlice: 1 },
                        sideRight: { type: "bulk", rowsPerSlice: 1 },
                    },
                ],
            },
            {
                id: 2,
                name: "Southwest Hall",
                direction: "west",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 3,
                name: "Northeast Hall",
                direction: "east",
                sections: [
                    {
                        slices: 8,
                        sideLeft: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                        sideRight: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                    },
                ],
            },
            {
                id: 4,
                name: "Southeast Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
        ],
    },
};


const HCROSS_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: Math.max(Math.round(CORE_SIZE * 0.8), 92),
        height: Math.max(Math.round(CORE_SIZE * 1.6), 320),
        halls: [
            {
                id: 1,
                name: "Northwest Hall",
                direction: "west",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 2,
                name: "Southwest Hall",
                direction: "west",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 3,
                name: "Northeast Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 4,
                name: "Southeast Hall",
                direction: "east",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "chest", rowsPerSlice: 4 },
                        sideRight: { type: "chest", rowsPerSlice: 4 },
                    },
                ],
            },
            {
                id: 5,
                name: "North Hall",
                direction: "north",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 6,
                name: "South Hall",
                direction: "south",
                sections: [
                    {
                        slices: 16,
                        sideLeft: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                        sideRight: { type: "mis", rowsPerSlice: 1, misSlotsPerSlice: 54 },
                    },
                ],
            },
        ],
    },
};

const OCTA_LAYOUT: StorageLayoutDefinition = {
    core: {
        name: "Core",
        shape: "rectangle",
        width: CORE_SIZE * 1.5,
        height: CORE_SIZE * 1.5,
        halls: [
            {
                id: 1,
                name: "North Hall 1",
                direction: "north",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 2,
                name: "North Hall 2",
                direction: "north",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
             {
                id: 3,
                name: "South Hall 1",
                direction: "south",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 4,
                name: "South Hall 2",
                direction: "south",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
             {
                id: 5,
                name: "East Hall 1",
                direction: "east",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 6,
                name: "East Hall 2",
                direction: "east",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
             {
                id: 7,
                name: "West Hall 1",
                direction: "west",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
            {
                id: 8,
                name: "West Hall 2",
                direction: "west",
                sections: [
                    {
                        slices: 32,
                        sideLeft: { type: "bulk", rowsPerSlice: 2 },
                        sideRight: { type: "bulk", rowsPerSlice: 2 },
                    },
                ],
            },
           
        ],
    },
};


const STORAGE_LAYOUTS: Record<StorageLayoutPreset, StorageLayoutDefinition> = {
    single: SINGLE_LAYOUT,
    double: DOUBLE_LAYOUT,
    triple: TRIPLE_LAYOUT,
    cross: CROSS_LAYOUT,
    h: H_LAYOUT,
    hcross: HCROSS_LAYOUT,
    octa: OCTA_LAYOUT,
};

export function getLayoutHallName(
    preset: StorageLayoutPreset,
    hallId: HallId,
): string | undefined {
    const definition = STORAGE_LAYOUTS[preset];
    const hallsById = mapHallsById(definition);
    return hallsById[hallId]?.name;
}

function hallIdFromLayoutHall(hall: Hall, fallbackIndex: number): HallId {
    if (Number.isFinite(hall.id) && hall.id > 0) {
        return hall.id;
    }
    return fallbackIndex + 1;
}

function mapHallsById(definition: StorageLayoutDefinition): Partial<Record<HallId, Hall>> {
    const mapped: Partial<Record<HallId, Hall>> = {};
    for (const [index, hall] of definition.core.halls.entries()) {
        const hallId = hallIdFromLayoutHall(hall, index);
        if (!mapped[hallId]) {
            mapped[hallId] = hall;
        }
    }
    return mapped;
}

function normalizeSide(side: HallSide | HallSideConfig | undefined): HallSideConfig {
    if (!side) {
        return {
            type: "bulk",
            rowsPerSlice: 1,
            misSlotsPerSlice: 54,
            misWidth: 1,
        };
    }
    const misWidth = side.type === "mis" ? side.misWidth ?? 2 : 1;
    return {
        type: side.type,
        rowsPerSlice: side.rowsPerSlice,
        misSlotsPerSlice: side.misSlotsPerSlice ?? 54,
        misWidth,
    };
}

export function buildInitialHallConfigs(
    preset: StorageLayoutPreset = "cross",
): Record<HallId, HallConfig> {
    const definition = STORAGE_LAYOUTS[preset];
    const hallsById = mapHallsById(definition);
    const result: Record<HallId, HallConfig> = {};
    for (const hall of definition.core.halls) {
        const hallId = hallIdFromLayoutHall(hall, hall.id - 1);
        const layoutHall = hallsById[hallId];
        const sections = layoutHall?.sections ?? [];
        result[hallId] = {
            name: layoutHall?.name ?? defaultHallName(hallId),
            direction: layoutHall?.direction ?? "east",
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

export function resolveStorageLayout(
    preset: StorageLayoutPreset,
    hallConfigs: Record<HallId, HallConfig>,
    center: number,
): ResolvedStorageLayout {
    const definition = STORAGE_LAYOUTS[preset];
    const hallsById = mapHallsById(definition);
    const coreLeft = center - definition.core.width / 2;
    const coreTop = center - definition.core.height / 2;

    const positions: ResolvedStorageLayout["positions"] = {};
    const directions: ResolvedStorageLayout["directions"] = {};
    const byDirection = new Map<HallDirection, HallId[]>();
    const hallIds = Object.keys(hallConfigs).map((key) => Number(key));
    for (const hallId of hallIds) {
        const layoutHall = hallsById[hallId];
        const hallDirection = hallConfigs[hallId]?.direction ?? layoutHall?.direction ?? "east";
        if (!byDirection.has(hallDirection)) {
            byDirection.set(hallDirection, []);
        }
        byDirection.get(hallDirection)!.push(hallId);
    }

    for (const [direction, hallIds] of byDirection.entries()) {
        const anchor = directionAnchor(direction);
        const orientation = directionOrientation(direction);
        const isNorthSouth = direction === "north" || direction === "south";
        const placementGap = 12;
        const hallPerpendicularSpans = hallIds.map((hallId) => {
            const size = getHallSize(hallConfigs[hallId], orientation);
            return isNorthSouth ? size.width : size.height;
        });
        const totalPerpendicularSpan =
            hallPerpendicularSpans.reduce((sum, span) => sum + span, 0) +
            Math.max(0, hallPerpendicularSpans.length - 1) * placementGap;
        let cursor = -totalPerpendicularSpan / 2;
        const offsets = hallPerpendicularSpans.map((span) => {
            const centerOffset = cursor + span / 2;
            cursor += span + placementGap;
            return centerOffset;
        });

        for (const [index, hallId] of hallIds.entries()) {
            const size = getHallSize(hallConfigs[hallId], orientation);
            const baseX =
                anchorCoordinate(coreLeft, definition.core.width, anchor.x) + anchor.offsetX;
            const baseY =
                anchorCoordinateY(coreTop, definition.core.height, anchor.y) + anchor.offsetY;
            const offset = offsets[index] ?? 0;
            const offsetX = isNorthSouth ? offset : 0;
            const offsetY = isNorthSouth ? 0 : offset;

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
