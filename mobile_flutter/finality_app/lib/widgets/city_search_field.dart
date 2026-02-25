// ============================================================
// CitySearchField — autocomplete villes France uniquement
//
// Source : api-adresse.data.gouv.fr (rapide & précis)
// ============================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

const _kTeal   = Color(0xFF0D9488);
const _kGray   = Color(0xFF64748B);
const _kBorder = Color(0xFFE2E8F0);

class CitySearchField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final ValueChanged<String>? onSelected;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final VoidCallback? onSubmitted;

  const CitySearchField({
    super.key,
    required this.controller,
    required this.hint,
    this.icon = Icons.location_city_outlined,
    this.onSelected,
    this.focusNode,
    this.textInputAction,
    this.onSubmitted,
  });

  @override
  State<CitySearchField> createState() => _CitySearchFieldState();
}

class _CitySearchFieldState extends State<CitySearchField> {
  List<_Suggestion> _suggestions = [];
  Timer? _debounce;
  final _layerLink = LayerLink();
  OverlayEntry? _overlay;
  late FocusNode _focus;

  @override
  void initState() {
    super.initState();
    _focus = widget.focusNode ?? FocusNode();
    _focus.addListener(() {
      if (!_focus.hasFocus) _hideOverlay();
    });
    widget.controller.addListener(_onControllerChange);
  }

  void _onControllerChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _debounce?.cancel();
    widget.controller.removeListener(_onControllerChange);
    if (widget.focusNode == null) _focus.dispose();
    _hideOverlay();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      _hideOverlay();
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () => _fetchAll(value));
  }

  // ── Fetch from France API ───────────────────────────────────────────────

  Future<void> _fetchAll(String query) async {
    final results = await _fetchFrance(query);

    if (!mounted) return;
    if (results.isNotEmpty) {
      setState(() => _suggestions = results);
      _updateOverlay();
    } else {
      _hideOverlay();
    }
  }

  /// France — api-adresse.data.gouv.fr (rapide, précis)
  Future<List<_Suggestion>> _fetchFrance(String query) async {
    try {
      final res = await http.get(Uri.parse(
        '${ApiConfig.adresseGouvBase}/search/'
        '?q=${Uri.encodeComponent(query)}&type=municipality&limit=8',
      ));
      if (res.statusCode != 200) return [];
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final features = (data['features'] as List?) ?? [];
      return features.map((f) {
        final p = (f['properties'] as Map<String, dynamic>?) ?? {};
        return _Suggestion(
          city:       p['city'] as String? ?? (p['label'] as String? ?? ''),
          postalCode: p['postcode'] as String? ?? '',
          context:    p['context'] as String? ?? '',
        );
      }).where((s) => s.city.isNotEmpty).toList();
    } catch (_) {
      return [];
    }
  }

  // ── Selection & overlay ───────────────────────────────────────────────────

  void _select(_Suggestion s) {
    widget.controller.text = s.city;
    widget.onSelected?.call(s.city);
    _hideOverlay();
    _focus.unfocus();
    widget.onSubmitted?.call();
  }

  void _hideOverlay() {
    _overlay?.remove();
    _overlay = null;
    if (mounted) setState(() => _suggestions = []);
  }

  void _updateOverlay() {
    _overlay?.remove();
    _overlay = null;
    if (_suggestions.isEmpty) return;

    final renderBox = context.findRenderObject() as RenderBox?;
    if (renderBox == null) return;
    final size = renderBox.size;

    _overlay = OverlayEntry(
      builder: (_) => Positioned(
        width: size.width,
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: Offset(0, size.height + 4),
          child: Material(
            elevation: 6,
            borderRadius: BorderRadius.circular(12),
            color: Colors.white,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 4),
                shrinkWrap: true,
                itemCount: _suggestions.length,
                separatorBuilder: (_, __) => const Divider(height: 1, indent: 40),
                itemBuilder: (_, i) {
                  final s = _suggestions[i];
                  return InkWell(
                    onTap: () => _select(s),
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      child: Row(
                        children: [
                          const Text('🇫🇷', style: TextStyle(fontSize: 18)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(s.city,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF0F172A))),
                                if (s.context.isNotEmpty)
                                  Text(s.context,
                                      style: const TextStyle(
                                          fontSize: 11, color: _kGray),
                                      overflow: TextOverflow.ellipsis),
                              ],
                            ),
                          ),
                          if (s.postalCode.length >= 2)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE6FFFA),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                  s.postalCode.length >= 5
                                      ? s.postalCode.substring(0, 5)
                                      : s.postalCode,
                                  style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: _kTeal)),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
    Overlay.of(context).insert(_overlay!);
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: TextField(
        controller: widget.controller,
        focusNode: _focus,
        onChanged: _onChanged,
        textCapitalization: TextCapitalization.words,
        textInputAction: widget.textInputAction ?? TextInputAction.next,
        onSubmitted: (_) => widget.onSubmitted?.call(),
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: const TextStyle(color: _kGray, fontSize: 14),
          prefixIcon: Icon(widget.icon, size: 18, color: _kGray),
          suffixIcon: widget.controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close, size: 16, color: _kGray),
                  onPressed: () {
                    widget.controller.clear();
                    _hideOverlay();
                    if (mounted) setState(() {});
                  },
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _kBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _kBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _kTeal, width: 1.5),
          ),
        ),
      ),
    );
  }
}

class _Suggestion {
  final String city;
  final String postalCode;
  final String context;
  const _Suggestion({
    required this.city,
    required this.postalCode,
    required this.context,
  });
}
