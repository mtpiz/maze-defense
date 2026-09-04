import benchmarkArenaSource from '@tower-defense/world-01/benchmark.arena.json';
import { compileArena, type ArenaSource, type CompiledArena } from '@tower-defense/content';

export const BENCHMARK_ARENA_SOURCE = benchmarkArenaSource as ArenaSource;

export const createBenchmarkArena = (): CompiledArena => compileArena(BENCHMARK_ARENA_SOURCE);
