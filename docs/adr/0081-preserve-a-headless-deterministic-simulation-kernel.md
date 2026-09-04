# Preserve a headless deterministic simulation kernel

V2 will preserve the prototype's strongest technical property while redesigning its interface. Authoritative gameplay advances at a fixed 30 deterministic ticks per second, consumes explicit player Commands, and emits snapshots plus presentation events for interpolated rendering at up to 60 frames per second.

The kernel must run without Pixi, Preact, audio, native APIs, or wall-clock assumptions so it can support unit tests, balance simulations, pause and speed changes, deterministic replays, and future Creator Clear verification. It begins in-process for the Pixi proof but sits behind a transport seam that permits a Web Worker if profiling demonstrates main-thread contention.
