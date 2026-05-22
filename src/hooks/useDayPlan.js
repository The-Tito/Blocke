/**
 * hooks/useDayPlan — carga el día (creándolo si hace falta) y sus bloques.
 */
import { useQuery } from '@tanstack/react-query';
import { services } from '../app/services.js';
import { useAuth } from '../app/providers/AuthProvider.jsx';

/**
 * @param {string} dateKey  fecha "YYYY-MM-DD"
 * @returns react-query result con { day, blocks }
 */
export function useDayPlan(dateKey) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['day', user?.id, dateKey],
    queryFn: () => services.planning.loadDay(user.id, dateKey),
    enabled: Boolean(user?.id && dateKey),
  });
}

/** Clave de query del día (para invalidar tras mutaciones). */
export function dayQueryKey(userId, dateKey) {
  return ['day', userId, dateKey];
}
