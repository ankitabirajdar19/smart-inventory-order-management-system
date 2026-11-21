import '@testing-library/jest-dom/vitest'

// jsdom lacks these browser APIs; Recharts and some components expect them.
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
