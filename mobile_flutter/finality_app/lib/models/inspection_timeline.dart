import 'package:intl/intl.dart';

class InspectionTimelineEvent {
  final String eventType; // departure_inspection, arrival_inspection, document_scanned, expense_recorded
  final DateTime timestamp;
  final String? inspectionId;
  final String? documentId;
  final String? expenseId;
  final Map<String, dynamic> data;

  InspectionTimelineEvent({
    required this.eventType,
    required this.timestamp,
    this.inspectionId,
    this.documentId,
    this.expenseId,
    required this.data,
  });

  factory InspectionTimelineEvent.fromJson(Map<String, dynamic> json) {
    return InspectionTimelineEvent(
      eventType: json['event_type'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      inspectionId: json['inspection_id'] as String?,
      documentId: json['document_id'] as String?,
      expenseId: json['expense_id'] as String?,
      data: json['data'] as Map<String, dynamic>,
    );
  }

  String get formattedTime {
    final format = DateFormat('HH:mm');
    return format.format(timestamp);
  }

  String get formattedDate {
    final format = DateFormat('dd MMM yyyy', 'fr_FR');
    return format.format(timestamp);
  }

  String get eventTitle {
    switch (eventType) {
      case 'departure_inspection':
        return 'Inspection de départ';
      case 'arrival_inspection':
        return 'Inspection d\'arrivée';
      case 'document_scanned':
        return 'Document scanné';
      case 'expense_recorded':
        return 'Dépense enregistrée';
      default:
        return eventType;
    }
  }

  String get eventIcon {
    switch (eventType) {
      case 'departure_inspection':
        return '📤';
      case 'arrival_inspection':
        return '📥';
      case 'document_scanned':
        return '📄';
      case 'expense_recorded':
        return '💰';
      default:
        return '📌';
    }
  }
}

class InspectionTimelineReport {
  final Map<String, dynamic> mission;
  final Map<String, dynamic> vehicle;
  final List<InspectionTimelineEvent> timeline;
  final String reportType;

  InspectionTimelineReport({
    required this.mission,
    required this.vehicle,
    required this.timeline,
    required this.reportType,
  });

  factory InspectionTimelineReport.fromJson(Map<String, dynamic> json) {
    final timelineJson = json['timeline'] as List? ?? [];
    final timeline = timelineJson
        .map((e) => InspectionTimelineEvent.fromJson(e as Map<String, dynamic>))
        .toList();

    return InspectionTimelineReport(
      mission: json['mission'] as Map<String, dynamic>,
      vehicle: json['vehicle'] as Map<String, dynamic>,
      timeline: timeline,
      reportType: json['report_type'] as String? ?? 'full',
    );
  }
}
