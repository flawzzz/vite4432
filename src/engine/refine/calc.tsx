export type Outcome = "SUCCESS" | "KEEP" | "FAIL" | "BREAK";
export type State = { level: number; failGuard: 0 | 1 | 2 };

export type Prob = {
    success: number; // percent, e.g. 12.5
    keep: number;
    fail: number;
    break: number;
};

export type RefineAttempt = {
    prev: State;
    next: State;
    outcome: Outcome;
    prob: Prob;
    roll: number; // 0 <= roll < 100
};

export type RefineCost = {
    stone: number;
    catalyst: number;
    rion: number;
    gold: number;
    terra: number;
};

const MIN_LEVEL = 0;
const MAX_LEVEL = 9;

function clampLevel(level: number): number {
    if (!Number.isFinite(level)) return MIN_LEVEL;
    return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.trunc(level)));
}

function clampGuardLevel(guardLevel: number): 0 | 1 | 2 {
    if (guardLevel === 1 || guardLevel === 2) return guardLevel;
    return 0;
}

export function getProb(level: number, guardLevel: 0 | 1 | 2): Prob {
    const lvl = clampLevel(level);
    const guard = clampGuardLevel(guardLevel);

    const success = [45, 30, 20, 20, 17, 15, 10, 7, 3, 1];
    const remain = [55, 40, 50, 45, 44, 42, 60, 53, 37, 29];
    const remain_first = [55, 50, 60, 55, 54, 52, 60, 53, 37, 29];
    const remain_second = [55, 70, 80, 75, 74, 72, 60, 53, 37, 29];
    const fail = [0, 30, 30, 30, 30, 30, 0, 0, 0, 0];
    const fail_first = [0, 20, 20, 20, 20, 20, 0, 0, 0, 0];
    const fail_second = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const destroy = [0, 0, 0, 5, 9, 13, 30, 40, 60, 70];

    const remains = [remain, remain_first, remain_second];
    const fails = [fail, fail_first, fail_second];


    return {
        success: success[lvl],
        keep: remains[guard][lvl],
        fail: fails[guard][lvl],
        break: destroy[lvl],
    };
}

function rollOutcomeDetailed(p: Prob, rng: () => number = Math.random): { outcome: Outcome; roll: number } {
    // 0 <= roll < 100
    const roll = rng() * 100;

    const s = p.success;
    const k = s + p.keep;
    const f = k + p.fail;

    if (roll < s) return { outcome: "SUCCESS", roll };
    if (roll < k) return { outcome: "KEEP", roll };
    if (roll < f) return { outcome: "FAIL", roll };
    return { outcome: "BREAK", roll };
}

function transition(s: State, o: Outcome): State {
    if (o === "FAIL") {
        return { level: clampLevel(s.level - 1), failGuard: (Math.min(2, s.failGuard + 1) as 0 | 1 | 2) };
    }
    if (o === "SUCCESS") {
        return { level: clampLevel(s.level + 1), failGuard: 0 };
    }
    if (o === "BREAK") {
        return { level: 0, failGuard: 0 }; // 파괴 후 규칙에 맞게 수정
    }
    // KEEP
    return s; // 보정 유지/리셋 규칙 있으면 여기서 반영
}

export function refineAttempt(prev: State, rng: () => number = Math.random): RefineAttempt {
    const safePrev: State = {
        level: clampLevel(prev.level),
        failGuard: clampGuardLevel(prev.failGuard),
    };

    const prob = getProb(safePrev.level, safePrev.failGuard);
    const { outcome, roll } = rollOutcomeDetailed(prob, rng);
    const next = transition(safePrev, outcome);

    return { prev: safePrev, next, outcome, prob, roll };
}


export function getRefineCost(level: number): RefineCost {
    const lvl = clampLevel(level);

    const stone = [99, 116, 135, 157, 177, 200, 220, 240, 260, 280];
    const catalyst = [2, 2, 2, 3, 3, 3, 4, 4, 4, 5];
    const rion = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7];
    const gold = [6200000, 7502000, 8900700, 10427000, 12254000, 13979000, 15806000, 17781000, 19881000, 22136000];

    return {
        stone: stone[lvl],
        catalyst: catalyst[lvl],
        rion: rion[lvl],
        gold: gold[lvl],
        terra: stone[lvl] * 400 + catalyst[lvl] * 70000 + rion[lvl] * 10000 + gold[lvl] / 200,
    };
}




export function calc(begin_level: number, guard_level: 0 | 1 | 2): {
    level: number; failGuard: number
    stone: number; catalyst: number; rion: number
    terra: number;
} {
    const safeBegin = clampLevel(begin_level);
    const attempt = refineAttempt({ level: safeBegin, failGuard: guard_level });
    const cost = getRefineCost(safeBegin);
    return {
        level: attempt.next.level, failGuard: attempt.next.failGuard,
        stone: cost.stone, catalyst: cost.catalyst, rion: cost.rion,
        terra: cost.terra,
    };
}
