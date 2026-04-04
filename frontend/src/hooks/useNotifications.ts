'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

/** User's notifications. */
export function useNotifications(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params as Record<string, unknown>),
    queryFn: () => api.notifications.list(params),
  });
}

/** Notification templates (admin). */
export function useNotificationTemplates() {
  return useQuery({
    queryKey: queryKeys.notificationTemplates,
    queryFn: () => api.notifications.listTemplates(),
  });
}

/** Notification mutations. */
export function useNotificationMutations() {
  const qc = useQueryClient();

  const sendNotification = useMutation({
    mutationFn: (data: { user_id: string; channel: string; subject: string; body: string }) =>
      api.notifications.send(data),
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { subject?: string; body_template?: string; is_active?: boolean } }) =>
      api.notifications.updateTemplate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notificationTemplates }),
  });

  return {
    sendNotification: sendNotification.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    isSending: sendNotification.isPending,
  };
}
