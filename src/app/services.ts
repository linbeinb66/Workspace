import { createContext, useContext } from 'react';
import type { AppServices } from './bootstrap';

export const ServicesContext = createContext<AppServices | null>(null);
export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('应用尚未初始化');
  return services;
}
