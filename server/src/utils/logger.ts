export const log = (...args: unknown[]) => {
  // small wrapper so we can replace implementation later
  // eslint-disable-next-line no-console
  console.log(...args);
};
