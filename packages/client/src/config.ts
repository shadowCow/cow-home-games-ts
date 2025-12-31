export type Config = {
  useInMemoryServices: boolean;
};

export const config: Config = {
  useInMemoryServices: import.meta.env.VITE_USE_IN_MEMORY_SERVICES === 'true',
};
