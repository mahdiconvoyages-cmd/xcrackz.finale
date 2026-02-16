import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { 
  getMyAvailabilities, 
  getContactAvailabilities,
  setAvailability,
  setAvailabilityRange,
  deleteAvailability,
  type Availability 
} from '../services/availabilityService';

interface AvailabilityCalendarProps {
  userId: string;
  userName: string;
  isOwnCalendar: boolean; // True si c'est mon propre calendrier
  onClose: () => void;
}

export default function AvailabilityCalendar({ userId, userName, isOwnCalendar, onClose }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<'available' | 'unavailable' | 'partially_available'>('available');
  const [modalStartTime, setModalStartTime] = useState('');
  const [modalEndTime, setModalEndTime] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeEndDate, setRangeEndDate] = useState<string | null>(null);

  useEffect(() => {
    loadAvailabilities();
  }, [currentDate, userId]);

  const loadAvailabilities = async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const data = isOwnCalendar
      ? await getMyAvailabilities(userId, start, end)
      : await getContactAvailabilities(userId, start, end);
    
    setAvailabilities(data);
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

  const handleDayClick = (date: string) => {
    if (!isOwnCalendar) return; // Lecture seule pour les contacts

    if (rangeMode) {
      if (!selectedDate) {
        setSelectedDate(date);
      } else {
        setRangeEndDate(date);
        setShowModal(true);
      }
    } else {
      setSelectedDate(date);
      const existing = availabilities.find(a => a.date === date);
      if (existing) {
        setModalStatus(existing.status);
        setModalStartTime(existing.start_time || '');
        setModalEndTime(existing.end_time || '');
        setModalNotes(existing.notes || '');
      } else {
        setModalStatus('available');
        setModalStartTime('');
        setModalEndTime('');
        setModalNotes('');
      }
      setShowModal(true);
    }
  };

  const handleSaveAvailability = async () => {
    if (!selectedDate) return;

    if (rangeMode && rangeEndDate) {
      // Mode plage
      const daysUpdated = await setAvailabilityRange(
        userId,
        selectedDate < rangeEndDate ? selectedDate : rangeEndDate,
        selectedDate > rangeEndDate ? selectedDate : rangeEndDate,
        modalStatus,
        modalStartTime || undefined,
        modalEndTime || undefined,
        modalNotes || undefined
      );
      
      if (daysUpdated > 0) {
        alert(`${daysUpdated} jours mis à jour`);
      }
    } else {
      // Mode jour unique
      const success = await setAvailability(
        userId,
        selectedDate,
        modalStatus,
        modalStartTime || undefined,
        modalEndTime || undefined,
        modalNotes || undefined
      );

      if (!success) {
        alert('Erreur lors de l\'enregistrement');
      }
    }

    setShowModal(false);
    setSelectedDate(null);
    setRangeEndDate(null);
    setRangeMode(false);
    loadAvailabilities();
  };

  const handleDeleteAvailability = async () => {
    if (!selectedDate || !confirm('Supprimer cette disponibilité ?')) return;

    const success = await deleteAvailability(userId, selectedDate);
    if (success) {
      setShowModal(false);
      setSelectedDate(null);
      loadAvailabilities();
    }
  };

  const getAvailabilityForDate = (date: string): Availability | undefined => {
    return availabilities.find(a => a.date === date);
  };

  const getStatusColor = (status: 'available' | 'unavailable' | 'partially_available') => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white border-green-600';
      case 'unavailable':
        return 'bg-red-500 text-white border-red-600';
      case 'partially_available':
        return 'bg-orange-500 text-white border-orange-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusLabel = (status: 'available' | 'unavailable' | 'partially_available') => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'unavailable':
        return 'Indisponible';
      case 'partially_available':
        return 'Partiellement disponible';
      default:
        return '';
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];

    // Jours vides au début
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
      days.push(null);
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Disponibilités de {userName}
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              {isOwnCalendar ? 'Gérez vos disponibilités' : 'Consultez les disponibilités'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Controls */}
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

            <div className="flex gap-2">
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-semibold"
              >
                Aujourd'hui
              </button>
              {isOwnCalendar && (
                <button
                  onClick={() => setRangeMode(!rangeMode)}
                  className={`px-4 py-2 rounded-lg transition font-semibold ${
                    rangeMode
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {rangeMode ? 'Mode plage ✓' : 'Mode jour'}
                </button>
              )}
            </div>
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Indisponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Partiellement disponible</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
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
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-[100px]"></div>;
                }

                const dateStr = formatDate(date);
                const availability = getAvailabilityForDate(dateStr);
                const isToday =
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();
                const isSelected = selectedDate === dateStr;
                const isInRange = rangeMode && selectedDate && !rangeEndDate && dateStr > selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr)}
                    disabled={!isOwnCalendar}
                    className={`min-h-[100px] border-2 rounded-lg p-2 transition ${
                      isToday ? 'border-teal-500' : 'border-slate-200'
                    } ${
                      isSelected ? 'ring-2 ring-teal-500' : ''
                    } ${
                      isInRange ? 'bg-teal-50' : ''
                    } ${
                      availability
                        ? getStatusColor(availability.status)
                        : 'bg-green-500 text-white border-green-600'  // Par défaut = disponible (vert)
                    } ${
                      !isOwnCalendar ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
                    }`}
                  >
                    <div className="text-lg font-semibold mb-1">{date.getDate()}</div>
                    {availability && (
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">
                          {getStatusLabel(availability.status)}
                        </div>
                        {availability.start_time && availability.end_time && (
                          <div className="flex items-center gap-1 justify-center">
                            <Clock className="w-3 h-3" />
                            <span>{availability.start_time} - {availability.end_time}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'édition */}
      {showModal && isOwnCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {rangeMode && rangeEndDate
                ? `Définir disponibilités du ${selectedDate} au ${rangeEndDate}`
                : `Disponibilité pour le ${selectedDate}`}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Statut *
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2"
                >
                  <option value="available">Disponible</option>
                  <option value="unavailable">Indisponible</option>
                  <option value="partially_available">Partiellement disponible</option>
                </select>
              </div>

              {modalStatus === 'partially_available' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Heure début
                    </label>
                    <input
                      type="time"
                      value={modalStartTime}
                      onChange={(e) => setModalStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Heure fin
                    </label>
                    <input
                      type="time"
                      value={modalEndTime}
                      onChange={(e) => setModalEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveAvailability}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition font-semibold"
              >
                Enregistrer
              </button>
              {!rangeMode && getAvailabilityForDate(selectedDate!) && (
                <button
                  onClick={handleDeleteAvailability}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold"
                >
                  Supprimer
                </button>
              )}
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedDate(null);
                  setRangeEndDate(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
