/**
 * hooks/useProfile — perfil del usuario y días recientes (react-query).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { services } from '../app/services.js';
import { useAuth } from '../app/providers/AuthProvider.jsx';

/** Perfil del usuario actual. */
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => services.profile.get(user.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
}

/** Mutación para actualizar el perfil. */
export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) => services.profile.update(user.id, patch),
    onSuccess: (data) => qc.setQueryData(['profile', user?.id], data),
  });
}

/** Días recientes (para el panel lateral). */
export function useRecentDays() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recentDays', user?.id],
    queryFn: () => services.dayRepo.recent(user.id, 7),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });
}
