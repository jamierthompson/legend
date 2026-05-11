/*
 * Test setup. Loaded once before any test file runs (configured via
 * setupFiles in vitest.config.ts).
 *
 * Registers the jest-dom matchers on Vitest's expect so tests can use:
 *   expect(element).toBeInTheDocument()
 *   expect(element).toHaveTextContent("...")
 *   expect(element).toBeVisible()
 */
import "@testing-library/jest-dom/vitest";
