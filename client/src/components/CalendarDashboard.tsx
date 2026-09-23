import React, { useState, useEffect } from 'react';
import { CalendarRecord, api } from '../services/api.js';
import { Calendar as CalIcon, Clock, Users, Plus, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export const CalendarDashboard: React.FC = () => {
  const [events, setEvents] = useState<CalendarRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [attendees, setAttendees] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split('T')[0]);
  const [freeSlots, setFreeSlots] = useState<string[]>([]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getCalendarEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkSlots = async () => {
    try {
      const res = await api.checkAvailability(availabilityDate);
      setFreeSlots(res.freeSlots || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    checkSlots();
  }, [availabilityDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime) return;
    try {
      const atts = attendees.split(',').map(s => s.trim()).filter(Boolean);
      await api.createCalendarEvent(title, startTime, atts);
      setTitle('');
      setStartTime('');
      setAttendees('');
      fetchEvents();
      checkSlots();
    } catch (err: any) {
      alert(`Error creating event: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-wide text-slate-100 flex items-center gap-2">
            <CalIcon className="w-5 h-5 text-cyan-400" />
            Calendar & Availability Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Timezone: <code className="text-cyan-400 font-mono">Asia/Karachi</code>. Finds availability, manages appointments, and enforces attendee invitation confirmation gates.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 text-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability & Booking (1 col) */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold mb-3">
              Check Free Windows
            </h3>
            <div className="space-y-3">
              <input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
              />
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-400">Available Slots for {availabilityDate}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {freeSlots.map(slot => (
                    <span
                      key={slot}
                      className="text-[11px] font-mono px-2 py-1 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300"
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold mb-3">
              Schedule Appointment
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Event Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sync with Ali Hassan"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Start Time (ISO or Date/Time)</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Attendees (Comma Separated)</label>
                <input
                  type="text"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  placeholder="ali.hassan@example.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!title || !startTime}
                className="w-full py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all disabled:opacity-40"
              >
                Schedule Event
              </button>
            </form>
          </div>
        </div>

        {/* Scheduled Events List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {events.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <CalIcon className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No scheduled events found.</p>
              <p className="text-xs text-slate-500 mt-1">Say: "Schedule a meeting with Ali tomorrow at 10 AM"</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">
                      {event.title}
                    </h4>
                    <span className="text-[11px] text-cyan-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(event.start_time).toLocaleString()} ({event.timezone})
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${
                    event.status === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {event.status === 'confirmed' ? 'Confirmed' : 'Pending Invitations Approval'}
                  </span>
                </div>

                {event.attendees && event.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {event.attendees.map(att => (
                      <span
                        key={att}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-1"
                      >
                        <Users className="w-3 h-3 text-cyan-400" />
                        {att}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
