export type Config = {
  useInMemoryUsers: boolean;
};

export const config: Config = {
  useInMemoryUsers: process.env.USE_IN_MEMORY_USERS === 'true',
};
