import { validateAccess } from './authService.js';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  attendees: string[];
  timezone: string;
  status: 'confirmed' | 'pending_confirmation' | 'cancelled';
  created_at: string;
  updated_at: string;
}

const storedEvents: CalendarEvent[] = [
  {
    id: 'evt-demo-1',
    title: 'Daily Standup & Sync',
    description: 'Project progress and blockers sync',
    start_time: new Date(Date.now() + 3600000 * 2).toISOString(),
    end_time: new Date(Date.now() + 3600000 * 2.5).toISOString(),
    attendees: ['ahmed.raza@example.com', 'ali.hassan@example.com'],
    timezone: 'Asia/Karachi',
    status: 'confirmed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-jarvis-passcode, x-jarvis-token, x-jarvis-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const auth = validateAccess(req);
  if (!auth.authorized) {
    res.status(auth.status || 401).json({ success: false, error: auth.error, message: auth.message });
    return;
  }

  const url = req.url || '';
  const path = url.split('?')[0].replace(/^\/api\/calendar\/?/, '');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  // GET /api/calendar/availability
  if (path.startsWith('availability')) {
    let queryDate = req.query?.date;
    if (!queryDate && url.includes('date=')) {
      try {
        queryDate = new URL(url, 'http://localhost').searchParams.get('date');
      } catch {}
    }
    if (!queryDate) {
      queryDate = new Date().toISOString().split('T')[0];
    }
    
    // Free slots logic
    const potentialSlots = ['10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '05:30 PM'];
    const bookedSlots = storedEvents
      .filter(e => e.start_time.startsWith(queryDate as string))
      .map(e => new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const freeSlots = potentialSlots.filter(s => !bookedSlots.includes(s));

    res.status(200).json({
      success: true,
      date: queryDate,
      freeSlots,
      existingEvents: storedEvents.filter(e => e.start_time.startsWith(queryDate as string))
    });
    return;
  }

  // POST /api/calendar/events
  if (req.method === 'POST' && (path === 'events' || path.endsWith('/events'))) {
    const { title, startTime, attendees, description } = body || {};
    if (!title || !startTime) {
      res.status(400).json({ success: false, error: 'title and startTime are required' });
      return;
    }

    const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const parsedStart = new Date(startTime).toISOString();
    const parsedEnd = new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();
    const now = new Date().toISOString();

    const newEvent: CalendarEvent = {
      id,
      title,
      description: description || 'Scheduled via JARVIS Calendar Engine',
      start_time: parsedStart,
      end_time: parsedEnd,
      attendees: Array.isArray(attendees) ? attendees : [],
      timezone: 'Asia/Karachi',
      status: 'confirmed',
      created_at: now,
      updated_at: now
    };
    storedEvents.push(newEvent);

    res.status(200).json({
      success: true,
      event: newEvent,
      message: `Event "${title}" confirmed and added to calendar.`
    });
    return;
  }

  // GET /api/calendar
  res.status(200).json({ success: true, events: storedEvents });
}
