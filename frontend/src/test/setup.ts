// Registers @testing-library/jest-dom matchers (toBeInTheDocument, toHaveClass,
// ...) on Vitest's `expect`, and — because this file is part of the tsconfig
// `src` compilation — makes their TYPES available to every test file too.
import '@testing-library/jest-dom/vitest'
