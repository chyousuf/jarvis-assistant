import { getDatabase, logActivity } from '../db/database.js';
import { APP_TIMEZONE } from '../config.js';
import crypto from 'crypto';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  attendees: string[];
  timezone: string;
  status: 'confirmed' | 'pending_confirmation' | 'cancelled';
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Checks schedule and finds availability for a given date
 */
export async function checkAvailability(dateStr: string): Promise<{ date: string; existingEvents: CalendarEvent[]; freeSlots: string[] }> {
  const db = getDatabase();
  const searchDate = new Date(dateStr);
  const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999)).toISOString();

  const rows = db.prepare(`
    SELECT * FROM calendar_events
    WHERE start_time >= ? AND start_time <= ? AND status != 'cancelled'
    ORDER BY start_time ASC
  `).all(startOfDay, endOfDay) as any[];

  const events: CalendarEvent[] = rows.map(r => ({
    ...r,
    attendees: JSON.parse(r.attendees || '[]')
  }));

  // Identify typical free business slots (e.g. 10:00 AM, 2:00 PM, 4:00 PM)
  const potentialSlots = ['10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM'];
  const bookedTitles = events.map(e => new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const freeSlots = potentialSlots.filter(s => !bookedTitles.includes(s));

  logActivity('calendar', 'check_availability', { dateStr, count: events.length });

  return {
    date: dateStr,
    existingEvents: events,
    freeSlots
  };
}

/**
 * Creates a calendar event.
 * If external attendees are included, requires explicit confirmation before transmitting invitations.
 */
export async function createCalendarEvent(
  title: string,
  startTime: string,
  endTime?: string,
  attendees: string[] = [],
  description = '',
  timezone = APP_TIMEZONE
): Promise<{ event: CalendarEvent; requiresConfirmation: boolean }> {
  const db = getDatabase();
  const id = `cal-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Parse start and end times
  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 45 * 60 * 1000); // 45 min default

  // Check if external attendees require confirmation
  const requiresConfirmation = attendees.length > 0;
  const initialStatus = requiresConfirmation ? 'pending_confirmation' : 'confirmed';

  // Deduplication idempotency key
  const idempotency_key = crypto
    .createHash('sha256')
    .update(`${title}|${startDate.toISOString()}|${attendees.sort().join(',')}`)
    .digest('hex');

  const existing = db.prepare('SELECT * FROM calendar_events WHERE idempotency_key = ?').get(idempotency_key) as any;
  if (existing) {
    return {
      event: {
        ...existing,
        attendees: JSON.parse(existing.attendees || '[]')
      },
      requiresConfirmation: false
    };
  }

  const event: CalendarEvent = {
    id,
    title,
    description,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    attendees,
    timezone,
    status: initialStatus,
    idempotency_key,
    created_at: now,
    updated_at: now
  };

  db.prepare(`
    INSERT INTO calendar_events (id, title, description, start_time, end_time, attendees, timezone, status, idempotency_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.title,
    event.description,
    event.start_time,
    event.end_time,
    JSON.stringify(event.attendees),
    event.timezone,
    event.status,
    event.idempotency_key,
    event.created_at,
    event.updated_at
  );

  logActivity('calendar', 'create_event', { id, title, startTime: event.start_time, attendeesCount: attendees.length });

  return { event, requiresConfirmation };
}

/**
 * Confirms event invitations
 */
export function confirmEventInvitations(eventId: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const res = db.prepare("UPDATE calendar_events SET status = 'confirmed', updated_at = ? WHERE id = ?").run(now, eventId);
  logActivity('calendar', 'confirm_invitations', { eventId });
  return (res as any).changes > 0;
}

export function listCalendarEvents(): CalendarEvent[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM calendar_events WHERE status != 'cancelled' ORDER BY start_time ASC").all() as any[];
  return rows.map(r => ({
    ...r,
    attendees: JSON.parse(r.attendees || '[]')
  }));
}
