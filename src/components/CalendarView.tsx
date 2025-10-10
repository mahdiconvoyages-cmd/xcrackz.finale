import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, type CalendarEvent } from '../services/calendarService';

interface CalendarViewProps {
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
}

export default function CalendarView({ ownerId, ownerName, canEdit, canDelete, onClose }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'other' as 'mission' | 'appointment' | 'personal' | 'other',
    color: '#3b82f6',
    is_all_day: false,
  });

  useEffect(() => {
    loadEvents();
  }, [currentDate, ownerId]);

  const loadEvents = async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const data = await getCalendarEvents(ownerId, start, end);
    setEvents(data);
    setLoading(false);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      event_type: 'other',
      color: '#3b82f6',
      is_all_day: false,
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start_time: new Date(event.start_time).toISOString().slice(0, 16),
      end_time: new Date(event.end_time).toISOString().slice(0, 16),
      location: event.location || '',
      event_type: event.event_type,
      color: event.color,
      is_all_day: event.is_all_day,
    });
    setShowEventModal(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventForm.start_time || !eventForm.end_time) {
      alert('Veuillez renseigner les dates de début et de fin');
      return;
    }

    const eventData = {
      owner_id: ownerId,
      created_by_id: null,
      title: eventForm.title,
      description: eventForm.description || null,
      event_type: eventForm.event_type,
      start_time: new Date(eventForm.start_time).toISOString(),
      end_time: new Date(eventForm.end_time).toISOString(),
      location: eventForm.location || null,
      mission_id: null,
      color: eventForm.color,
      is_all_day: eventForm.is_all_day,
      reminder_minutes: 15,
      status: 'scheduled' as const,
    };

    if (selectedEvent) {
      const success = await updateCalendarEvent(selectedEvent.id, eventData);
      if (success) {
        setShowEventModal(false);
        loadEvents();
      }
    } else {
      const newEvent = await createCalendarEvent(eventData);
      if (newEvent) {
        setShowEventModal(false);
        loadEvents();
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;

    const success = await deleteCalendarEvent(selectedEvent.id);
    if (success) {
      setShowEventModal(false);
      loadEvents();
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];

    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart.getDate() === date.getDate() &&
             eventStart.getMonth() === date.getMonth() &&
             eventStart.getFullYear() === date.getFullYear();
    });
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Planning de {ownerName}</h2>
            <p className="text-slate-600 text-sm mt-1">
              {canEdit ? 'Vous pouvez créer et modifier des événements' : 'Lecture seule'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-slate-900 min-w-[200px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-semibold"
              >
                Aujourd'hui
              </button>
              {canEdit && (
                <button
                  onClick={handleCreateEvent}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  Nouvel événement
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map(day => (
                <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">
                  {day}
                </div>
              ))}

              {getDaysInMonth().map((date, index) => {
                const dayEvents = date ? getEventsForDay(date) : [];
                const isToday = date &&
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={index}
                    className={`min-h-[120px] border rounded-lg p-2 ${
                      date ? 'bg-white' : 'bg-slate-50'
                    } ${isToday ? 'ring-2 ring-teal-500' : 'border-slate-200'}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-teal-600' : 'text-slate-700'}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              onClick={() => canEdit && handleEditEvent(event)}
                              className={`text-xs p-1 rounded truncate ${canEdit ? 'cursor-pointer hover:opacity-80' : ''}`}
                              style={{ backgroundColor: event.color + '20', color: event.color }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-slate-500 font-semibold">
                              +{dayEvents.length - 3} autre(s)
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showEventModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-slate-900">
                {selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h3>

              <form onSubmit={handleSubmitEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Titre *</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="mission">Mission</option>
                    <option value="appointment">Rendez-vous</option>
                    <option value="personal">Personnel</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Début *</label>
                    <input
                      type="datetime-local"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fin *</label>
                    <input
                      type="datetime-local"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Lieu</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Couleur</label>
                  <input
                    type="color"
                    value={eventForm.color}
                    onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition"
                  >
                    {selectedEvent ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition font-semibold"
                  >
                    Annuler
                  </button>
                  {selectedEvent && canDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
