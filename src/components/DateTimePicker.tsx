import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';

interface DateTimePickerProps {
  label: string;
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  required?: boolean;
  minDate?: Date;
}

export default function ModernDateTimePicker({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  required = false,
  minDate,
}: DateTimePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    date ? new Date(date) : new Date()
  );
  const [selectedTime, setSelectedTime] = useState(() => {
    if (time) {
      const [hours, minutes] = time.split(':');
      const d = new Date();
      d.setHours(parseInt(hours), parseInt(minutes));
      return d;
    }
    return new Date();
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Sélectionner une date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Sélectionner une heure';
    return timeStr;
  };

  const handleDateConfirm = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      onDateChange(formattedDate);
    }
  };

  const handleTimeConfirm = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      onTimeChange(`${hours}:${minutes}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>

      <View style={styles.pickersRow}>
        {/* Date Picker */}
        <TouchableOpacity
          style={[styles.pickerButton, styles.dateButton]}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.pickerContent}>
            <Feather name="calendar" size={20} color="#14b8a6" />
            <View style={styles.pickerTextContainer}>
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>
                {formatDate(date)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Time Picker */}
        <TouchableOpacity
          style={[styles.pickerButton, styles.timeButton]}
          onPress={() => setShowTimePicker(true)}
        >
          <View style={styles.pickerContent}>
            <Feather name="clock" size={20} color="#14b8a6" />
            <View style={styles.pickerTextContainer}>
              <Text style={styles.pickerLabel}>Heure</Text>
              <Text style={time ? styles.pickerValue : styles.pickerPlaceholder}>
                {formatTime(time)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              transparent
              animationType="slide"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.modalButton}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Sélectionner une date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        handleDateConfirm({}, selectedDate);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[styles.modalButton, styles.modalButtonPrimary]}>
                        OK
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateConfirm}
                    minimumDate={minDate}
                    locale="fr-FR"
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateConfirm}
              minimumDate={minDate}
            />
          )}
        </>
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              transparent
              animationType="slide"
              visible={showTimePicker}
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.modalButton}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Sélectionner une heure</Text>
                    <TouchableOpacity
                      onPress={() => {
                        handleTimeConfirm({}, selectedTime);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={[styles.modalButton, styles.modalButtonPrimary]}>
                        OK
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeConfirm}
                    locale="fr-FR"
                    is24Hour={true}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={handleTimeConfirm}
              is24Hour={true}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  required: {
    color: '#ef4444',
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  dateButton: {
    flex: 1.2,
  },
  timeButton: {
    flex: 0.8,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerTextContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButton: {
    fontSize: 16,
    color: '#64748B',
    paddingHorizontal: 8,
  },
  modalButtonPrimary: {
    color: '#14b8a6',
    fontWeight: '600',
  },
});
