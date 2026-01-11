import { supabase } from './supabaseClient'
import type { Notification } from '@/types/database.types'

// Get all notifications for current user
export async function getNotifications(limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as unknown as Notification[]
}

// Get unread notifications
export async function getUnreadNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as Notification[]
}

// Get unread notification count
export async function getUnreadNotificationCount() {
  const { data, error } = await supabase.rpc('get_unread_notification_count')

  if (error) throw error
  return (data as number) || 0
}

// Mark a notification as read
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  } as never)

  if (error) throw error
  return data as boolean
}

// Mark all notifications as read
export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_read')

  if (error) throw error
  return (data as number) || 0
}

// Subscribe to new notifications (realtime)
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
