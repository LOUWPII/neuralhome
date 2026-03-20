/**
 * Room Anchor System — Sprint 1
 * Each template has a fixed set of anchor positions.
 * Concepts from the PDF are mapped to these anchors by the LLM.
 * KnowledgeObjects float above their assigned anchor.
 */

export const ROOM_ANCHORS = {
    neon_dev: [
        {
            id: "main_terminal",
            label: "Main Terminal",
            semanticHint: "core concept, central idea, main topic, primary theory",
            position: [0, 0, 0],        // Central hologram pedestal
            displayOffset: [0, 2.2, 0], // Float above
        },
        {
            id: "left_panel",
            label: "Left Holo Panel",
            semanticHint: "process, algorithm, steps, methodology, procedure, flow",
            position: [-8, 0, -3],
            displayOffset: [0, 4.5, 0],
        },
        {
            id: "right_panel",
            label: "Right Holo Panel",
            semanticHint: "data, statistics, numbers, results, metrics, analysis",
            position: [8, 0, -3],
            displayOffset: [0, 4.5, 0],
        },
        {
            id: "server_rack_a",
            label: "Server Rack A",
            semanticHint: "storage, database, memory, components, infrastructure, architecture",
            position: [-12, 0, -8],
            displayOffset: [0, 5, 0],
        },
        {
            id: "server_rack_b",
            label: "Server Rack B",
            semanticHint: "processing, computation, execution, runtime, performance",
            position: [12, 0, -8],
            displayOffset: [0, 5, 0],
        },
        {
            id: "floor_grid_front",
            label: "Front Grid Zone",
            semanticHint: "introduction, definition, overview, basics, fundamentals",
            position: [0, 0, 6],
            displayOffset: [0, 1.8, 0],
        },
        {
            id: "floor_grid_left",
            label: "Left Grid Zone",
            semanticHint: "input, variables, parameters, arguments, dependencies",
            position: [-6, 0, 5],
            displayOffset: [0, 1.8, 0],
        },
        {
            id: "floor_grid_right",
            label: "Right Grid Zone",
            semanticHint: "output, result, return value, conclusion, summary",
            position: [6, 0, 5],
            displayOffset: [0, 1.8, 0],
        },
    ],

    silicon_valley: [
        {
            id: "main_monitor",
            label: "Main Monitor",
            semanticHint: "core concept, central idea, main topic, primary theory, overview",
            position: [-12, 0, 0],
            displayOffset: [0, 3.8, 0],
        },
        {
            id: "whiteboard",
            label: "Whiteboard",
            semanticHint: "explanation, diagram, visual, breakdown, steps, methodology",
            position: [0, 0, -18],
            displayOffset: [0, 5, 0],
        },
        {
            id: "server_a",
            label: "Server Rack A",
            semanticHint: "data storage, database, infrastructure, backend, architecture",
            position: [14, 0, 0],
            displayOffset: [0, 5, 0],
        },
        {
            id: "server_b",
            label: "Server Rack B",
            semanticHint: "processing, computation, algorithms, performance, runtime",
            position: [14, 0, 4],
            displayOffset: [0, 5, 0],
        },
        {
            id: "central_podium",
            label: "Central Podium",
            semanticHint: "presentation, key finding, main result, highlight, showcase",
            position: [0, 0, 0],
            displayOffset: [0, 2.5, 0],
        },
        {
            id: "desk_area",
            label: "Desk Area",
            semanticHint: "details, implementation, code, technical, specification, configuration",
            position: [-12, 0, 4],
            displayOffset: [0, 2.5, 0],
        },
        {
            id: "entrance",
            label: "Entrance Zone",
            semanticHint: "introduction, background, context, motivation, problem statement",
            position: [0, 0, 14],
            displayOffset: [0, 1.8, 0],
        },
        {
            id: "corner_meeting",
            label: "Meeting Corner",
            semanticHint: "conclusion, summary, discussion, future work, implications",
            position: [-14, 0, -14],
            displayOffset: [0, 2, 0],
        },
    ],
};

/**
 * Helper — given a theme, returns the anchor list as a simple array
 * of { id, label, semanticHint } for the LLM prompt.
 */
export function getAnchorsForLLM(theme) {
    const anchors = ROOM_ANCHORS[theme] || ROOM_ANCHORS.neon_dev;
    return anchors.map(({ id, label, semanticHint }) => ({
        id,
        label,
        semantic_hint: semanticHint,
    }));
}

/**
 * Helper — given a theme and anchor ID, returns the world display position.
 */
export function getAnchorDisplayPosition(theme, anchorId, fallbackIndex = 0) {
    const anchors = ROOM_ANCHORS[theme] || ROOM_ANCHORS.neon_dev;
    const anchor = anchors.find(a => a.id === anchorId);
    if (!anchor) {
        // Fallback: circular scatter
        const angle = (fallbackIndex / 8) * Math.PI * 2;
        return [Math.cos(angle) * 6, 1.8, Math.sin(angle) * 6];
    }
    const [ax, ay, az] = anchor.position;
    const [ox, oy, oz] = anchor.displayOffset;
    return [ax + ox, ay + oy, az + oz];
}
