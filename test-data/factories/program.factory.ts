import { faker } from "@faker-js/faker";

export type ProgramInput = {
  name: string;
  description: string;
};

/**
 * Happy-path program payload. Names stay unique across parallel workers.
 */
export function buildProgram(
  overrides: Partial<ProgramInput> = {},
): ProgramInput {
  const suffix = `${Date.now()}-${faker.string.alphanumeric(7)}`;
  return {
    name: `${faker.commerce.department()} Program ${suffix}`.slice(0, 100),
    description: faker.lorem.sentence(),
    ...overrides,
  };
}
