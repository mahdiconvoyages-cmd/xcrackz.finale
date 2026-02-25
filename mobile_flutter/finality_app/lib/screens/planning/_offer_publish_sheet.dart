// OfferPublishSheet — bottom sheet pour publier une offre de lift

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../widgets/city_search_field.dart';

const _kTeal   = Color(0xFF0D9488);
const _kDark   = Color(0xFF0F172A);
const _kGray   = Color(0xFF64748B);
const _kBorder = Color(0xFFE2E8F0);

class OfferPublishSheet extends StatefulWidget {
  final VoidCallback onPublished;
  final String userId;
  final String? defaultFrom;
  final String? defaultTo;

  const OfferPublishSheet({
    super.key,
    required this.onPublished,
    required this.userId,
    this.defaultFrom,
    this.defaultTo,
  });

  @override
  State<OfferPublishSheet> createState() => _OfferPublishSheetState();
}

class _OfferPublishSheetState extends State<OfferPublishSheet> {
  final _sb = Supabase.instance.client;

  final _fromCtrl = TextEditingController();
  final _toCtrl   = TextEditingController();
  TimeOfDay _time = const TimeOfDay(hour: 8, minute: 0);
  DateTime? _date;
  int _seats = 1;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fromCtrl.text = widget.defaultFrom ?? '';
    _toCtrl.text   = widget.defaultTo ?? '';
  }

  @override
  void dispose() {
    _fromCtrl.dispose();
    _toCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time,
    );
    if (picked != null) setState(() => _time = picked);
  }

  String get _timeLabel =>
      '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

  Future<void> _publish() async {
    if (_fromCtrl.text.trim().isEmpty || _toCtrl.text.trim().isEmpty || _date == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Remplis tous les champs')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await _sb.from('ride_offers').insert({
        'user_id':          widget.userId,
        'origin_city':      _fromCtrl.text.trim(),
        'destination_city': _toCtrl.text.trim(),
        'departure_date':   DateFormat('yyyy-MM-dd').format(_date!),
        'departure_time':   '$_timeLabel:00',
        'seats_available':  _seats,
        'status':           'active',
      });
      if (!mounted) return;
      Navigator.pop(context);
      widget.onPublished();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Offre publiée !'),
          backgroundColor: _kTeal,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final keyboardBottom = MediaQuery.of(context).viewInsets.bottom;
    final navPad = MediaQuery.of(context).padding.bottom;
    final extraBottom = keyboardBottom > 0 ? keyboardBottom : navPad;
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + extraBottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(child: Container(
            width: 36, height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          )),
          const SizedBox(height: 16),
          const Text('Publier une offre de lift',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _kDark)),
          const SizedBox(height: 16),
          CitySearchField(
            controller: _fromCtrl,
            hint: 'Départ',
            icon: Icons.trip_origin,
          ),
          const SizedBox(height: 10),
          CitySearchField(
            controller: _toCtrl,
            hint: 'Arrivée',
            icon: Icons.location_on_outlined,
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: GestureDetector(
                onTap: _pickDate,
                child: _infoTile(
                  Icons.calendar_today,
                  _date == null
                      ? 'Date'
                      : DateFormat('EEE d MMM', 'fr_FR').format(_date!),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: GestureDetector(
                onTap: _pickTime,
                child: _infoTile(Icons.access_time, _timeLabel),
              ),
            ),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _infoTile(Icons.event_seat, '$_seats place${_seats > 1 ? "s" : ""}'),
            const SizedBox(width: 8),
            SizedBox(
              width: 44, height: 44,
              child: InkWell(
                borderRadius: BorderRadius.circular(22),
                onTap: () => setState(() { if (_seats > 1) _seats--; }),
                child: _circleBtn(Icons.remove),
              ),
            ),
            const SizedBox(width: 6),
            SizedBox(
              width: 44, height: 44,
              child: InkWell(
                borderRadius: BorderRadius.circular(22),
                onTap: () => setState(() { if (_seats < 4) _seats++; }),
                child: _circleBtn(Icons.add),
              ),
            ),
          ]),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _loading ? null : _publish,
            style: FilledButton.styleFrom(
              backgroundColor: _kTeal,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: _loading
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Publier', style: TextStyle(fontSize: 15)),
          ),
        ],
      ),
    );
  }

  Widget _infoTile(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _kBorder),
      ),
      child: Row(children: [
        Icon(icon, size: 16, color: _kGray),
        const SizedBox(width: 6),
        Text(text, style: const TextStyle(fontSize: 13, color: _kDark)),
      ]),
    );
  }

  Widget _circleBtn(IconData icon) {
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Icon(icon, size: 16, color: _kDark),
    );
  }
}
