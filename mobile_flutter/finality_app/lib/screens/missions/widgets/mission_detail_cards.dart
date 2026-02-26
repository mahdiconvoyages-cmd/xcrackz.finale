import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../../models/mission.dart';
import '../../../theme/premium_theme.dart';

// ══════════════════════════════════════════════════════════════════
//  REUSABLE CARD SHELL
// ══════════════════════════════════════════════════════════════════

/// Standard card container used by all mission detail cards.
class MissionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final Widget child;

  const MissionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.color,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(width: 8),
              Text(title, style: TextStyle(color: color, fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  STATUS BADGE
// ══════════════════════════════════════════════════════════════════

class MissionStatusBadge extends StatelessWidget {
  final String status;
  const MissionStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    String label;
    switch (status) {
      case 'pending':
        bgColor = PremiumTheme.accentAmber;
        label = 'En attente';
        break;
      case 'assigned':
        bgColor = PremiumTheme.primaryBlue;
        label = 'Assignee';
        break;
      case 'in_progress':
        bgColor = PremiumTheme.primaryPurple;
        label = 'En cours';
        break;
      case 'completed':
        bgColor = PremiumTheme.accentGreen;
        label = 'Terminee';
        break;
      default:
        bgColor = PremiumTheme.textSecondary;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  SHARE CODE CARD
// ══════════════════════════════════════════════════════════════════

class MissionShareCodeCard extends StatelessWidget {
  final Mission mission;
  const MissionShareCodeCard({super.key, required this.mission});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: const Color(0xFF6366F1).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.key, color: Colors.white, size: 22),
              SizedBox(width: 8),
              Text('Code de mission', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            mission.status == 'in_progress'
                ? 'Ce code reste actif. Un autre chauffeur peut prendre le relais.'
                : 'Partagez ce code pour permettre a un chauffeur de rejoindre la mission',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.3)),
                  ),
                  child: Text(
                    mission.shareCode!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: mission.shareCode!));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Code copie dans le presse-papier'),
                      backgroundColor: PremiumTheme.accentGreen,
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                icon: const Icon(Icons.copy, color: Colors.white),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(0.2),
                  padding: const EdgeInsets.all(14),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  DRIVER CARD
// ══════════════════════════════════════════════════════════════════

class MissionDriverCard extends StatelessWidget {
  final Mission mission;
  final String? driverName;
  final bool isCreator;
  final VoidCallback? onChangeDriver;

  const MissionDriverCard({
    super.key,
    required this.mission,
    this.driverName,
    required this.isCreator,
    this.onChangeDriver,
  });

  @override
  Widget build(BuildContext context) {
    final hasDriver = mission.assignedToUserId != null;
    return MissionCard(
      icon: Icons.person_pin,
      title: 'Chauffeur',
      color: PremiumTheme.primaryBlue,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasDriver) ...[
            Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: PremiumTheme.primaryBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.person, color: PremiumTheme.primaryBlue, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        driverName ?? 'Chauffeur assigne',
                        style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
                      ),
                      const Text('Chauffeur actuel', style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ] else ...[
            const Text(
              'Aucun chauffeur assigne',
              style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 15),
            ),
            const SizedBox(height: 4),
            const Text(
              'Partagez le code de mission pour qu\'un chauffeur rejoigne',
              style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 13),
            ),
          ],
          if (isCreator && hasDriver && mission.status != 'completed') ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onChangeDriver,
                icon: const Icon(Icons.swap_horiz, size: 20),
                label: const Text('Changer de chauffeur'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: PremiumTheme.accentAmber,
                  side: BorderSide(color: PremiumTheme.accentAmber.withOpacity(0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Le code de mission restera actif pour le nouveau chauffeur.',
              style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  INSPECTION STATUS CARD
// ══════════════════════════════════════════════════════════════════

class MissionInspectionStatusCard extends StatelessWidget {
  final Mission mission;
  final bool hasDeparture;
  final bool hasArrival;
  final bool hasRestitutionDeparture;
  final bool hasRestitutionArrival;

  const MissionInspectionStatusCard({
    super.key,
    required this.mission,
    required this.hasDeparture,
    required this.hasArrival,
    required this.hasRestitutionDeparture,
    required this.hasRestitutionArrival,
  });

  @override
  Widget build(BuildContext context) {
    return MissionCard(
      icon: Icons.checklist,
      title: 'Inspections',
      color: PremiumTheme.primaryTeal,
      child: Column(
        children: [
          _inspectionRow('Inspection depart', hasDeparture, Icons.login),
          const SizedBox(height: 10),
          _inspectionRow('Inspection arrivee', hasArrival, Icons.logout),
          if (mission.hasRestitution) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE65100).withOpacity(0.2)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.swap_horiz_rounded, color: Color(0xFFE65100), size: 16),
                  SizedBox(width: 6),
                  Text('Restitution', style: TextStyle(color: Color(0xFFE65100), fontSize: 12, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            const SizedBox(height: 10),
            _inspectionRow('Inspection depart restitution', hasRestitutionDeparture, Icons.login),
            const SizedBox(height: 10),
            _inspectionRow('Inspection arrivee restitution', hasRestitutionArrival, Icons.logout),
          ],
          if (mission.status == 'in_progress' && (!hasDeparture || !hasArrival ||
              (mission.hasRestitution && (!hasRestitutionDeparture || !hasRestitutionArrival)))) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PremiumTheme.accentAmber.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: PremiumTheme.accentAmber.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: PremiumTheme.accentAmber, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      mission.hasRestitution
                          ? 'Les 4 inspections (depart, arrivee, restitution depart, restitution arrivee) sont obligatoires.'
                          : 'Les deux inspections (depart et arrivee) sont obligatoires pour terminer la mission.',
                      style: TextStyle(color: PremiumTheme.accentAmber.withOpacity(0.9), fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _inspectionRow(String label, bool done, IconData icon) {
    return Row(
      children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(
            color: done ? PremiumTheme.accentGreen.withOpacity(0.1) : PremiumTheme.textTertiary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            done ? Icons.check_circle : Icons.radio_button_unchecked,
            color: done ? PremiumTheme.accentGreen : PremiumTheme.textTertiary,
            size: 20,
          ),
        ),
        const SizedBox(width: 10),
        Icon(icon, size: 18, color: done ? PremiumTheme.textPrimary : PremiumTheme.textTertiary),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: done ? PremiumTheme.textPrimary : PremiumTheme.textTertiary,
            fontSize: 15,
            fontWeight: done ? FontWeight.w600 : FontWeight.normal,
            decoration: done ? TextDecoration.lineThrough : null,
          ),
        ),
        const Spacer(),
        Text(
          done ? 'Fait' : 'A faire',
          style: TextStyle(
            color: done ? PremiumTheme.accentGreen : PremiumTheme.accentAmber,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  MANDATAIRE CARD
// ══════════════════════════════════════════════════════════════════

class MissionMandataireCard extends StatelessWidget {
  final Mission mission;
  const MissionMandataireCard({super.key, required this.mission});

  @override
  Widget build(BuildContext context) {
    return MissionCard(
      icon: Icons.person_outline,
      title: 'Mandataire',
      color: PremiumTheme.primaryPurple,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            mission.mandataireName ?? 'Non renseigne',
            style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.w600),
          ),
          if (mission.mandataireCompany != null && mission.mandataireCompany!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.business, color: PremiumTheme.primaryPurple, size: 16),
                const SizedBox(width: 6),
                Text(mission.mandataireCompany!, style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 15)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  VEHICLE CARD
// ══════════════════════════════════════════════════════════════════

class MissionVehicleCard extends StatelessWidget {
  final Mission mission;
  const MissionVehicleCard({super.key, required this.mission});

  @override
  Widget build(BuildContext context) {
    final label = mission.hasRestitution ? 'Vehicule Aller' : 'Vehicule';
    return MissionCard(
      icon: Icons.directions_car,
      title: label,
      color: PremiumTheme.primaryTeal,
      child: Column(
        children: [
          if (mission.hasRestitution)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: PremiumTheme.primaryBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('ALLER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: PremiumTheme.primaryBlue)),
            ),
          if (mission.vehicleBrand != null || mission.vehicleModel != null)
            _infoRow(Icons.directions_car, 'Marque / Modele', '${mission.vehicleBrand ?? ''} ${mission.vehicleModel ?? ''}'.trim()),
          if (mission.vehicleType != null)
            _infoRow(Icons.category, 'Type', mission.vehicleType!),
          if (mission.vehiclePlate != null)
            _infoRow(Icons.pin, 'Immatriculation', mission.vehiclePlate!),
          if (mission.vehicleVin != null)
            _infoRow(Icons.confirmation_number, 'N VIN', mission.vehicleVin!),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, color: PremiumTheme.primaryTeal.withOpacity(0.7), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 12)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 15)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  ITINERARY CARD
// ══════════════════════════════════════════════════════════════════

class MissionItineraryCard extends StatelessWidget {
  final Mission mission;
  final void Function(String phoneNumber) onPhoneCall;

  const MissionItineraryCard({
    super.key,
    required this.mission,
    required this.onPhoneCall,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');
    return MissionCard(
      icon: Icons.route,
      title: 'Itineraire',
      color: PremiumTheme.accentGreen,
      child: Column(
        children: [
          LocationBlock(
            color: PremiumTheme.accentGreen,
            label: 'ENLEVEMENT',
            address: mission.pickupAddress ?? 'Non specifie',
            contactName: mission.pickupContactName,
            contactPhone: mission.pickupContactPhone,
            date: mission.pickupDate != null ? dateFormat.format(mission.pickupDate!) : null,
            onPhoneCall: onPhoneCall,
          ),
          _routeConnector(PremiumTheme.accentGreen, PremiumTheme.primaryBlue),
          LocationBlock(
            color: PremiumTheme.primaryBlue,
            label: 'LIVRAISON',
            address: mission.deliveryAddress ?? 'Non specifie',
            contactName: mission.deliveryContactName,
            contactPhone: mission.deliveryContactPhone,
            date: mission.deliveryDate != null ? dateFormat.format(mission.deliveryDate!) : null,
            onPhoneCall: onPhoneCall,
          ),
        ],
      ),
    );
  }

  Widget _routeConnector(Color from, Color to) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          const SizedBox(width: 16),
          Container(
            width: 2,
            height: 30,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [from, to],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.arrow_downward, color: PremiumTheme.textTertiary, size: 16),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  RESTITUTION CARD
// ══════════════════════════════════════════════════════════════════

class MissionRestitutionCard extends StatelessWidget {
  final Mission mission;
  final void Function(String phoneNumber) onPhoneCall;

  const MissionRestitutionCard({
    super.key,
    required this.mission,
    required this.onPhoneCall,
  });

  static const Color _restitutionOrange = Color(0xFFE65100);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: _restitutionOrange.withOpacity(0.08), blurRadius: 15, offset: const Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          children: [
            // Orange gradient header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFFE65100), Color(0xFFF57C00)]),
              ),
              child: Row(
                children: [
                  const Icon(Icons.swap_horiz_rounded, color: Colors.white, size: 22),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text('Restitution - Vehicule Retour', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('PHASE 2', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
            // Body
            Container(
              width: double.infinity,
              color: PremiumTheme.cardBg,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Vehicle info box
                  _vehicleInfoBox(),
                  const SizedBox(height: 16),
                  LocationBlock(
                    color: _restitutionOrange,
                    label: 'ENLEVEMENT RETOUR',
                    address: mission.restitutionPickupAddress ?? 'Non specifie',
                    onPhoneCall: onPhoneCall,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        const SizedBox(width: 16),
                        Container(
                          width: 2, height: 30,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFFE65100), Color(0xFFD32F2F)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_downward, color: PremiumTheme.textTertiary, size: 16),
                      ],
                    ),
                  ),
                  LocationBlock(
                    color: const Color(0xFFD32F2F),
                    label: 'LIVRAISON RETOUR',
                    address: mission.restitutionDeliveryAddress ?? 'Non specifie',
                    onPhoneCall: onPhoneCall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _vehicleInfoBox() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _restitutionOrange.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _restitutionOrange.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _restitutionOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.directions_car, color: _restitutionOrange, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${mission.restitutionVehicleBrand ?? ''} ${mission.restitutionVehicleModel ?? ''}'.trim().isEmpty
                      ? 'Vehicule retour'
                      : '${mission.restitutionVehicleBrand ?? ''} ${mission.restitutionVehicleModel ?? ''}'.trim(),
                  style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
                ),
                if (mission.restitutionVehiclePlate != null) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _restitutionOrange.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      mission.restitutionVehiclePlate!,
                      style: const TextStyle(color: _restitutionOrange, fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: _restitutionOrange.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text('RETOUR', style: TextStyle(color: _restitutionOrange, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  PRICE CARD
// ══════════════════════════════════════════════════════════════════

class MissionPriceCard extends StatelessWidget {
  final double price;
  const MissionPriceCard({super.key, required this.price});

  @override
  Widget build(BuildContext context) {
    return MissionCard(
      icon: Icons.euro,
      title: 'Prix',
      color: PremiumTheme.accentAmber,
      child: Text(
        '${price.toStringAsFixed(2)} EUR',
        style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 22, fontWeight: FontWeight.bold),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  NOTES CARD
// ══════════════════════════════════════════════════════════════════

class MissionNotesCard extends StatelessWidget {
  final String notes;
  const MissionNotesCard({super.key, required this.notes});

  @override
  Widget build(BuildContext context) {
    return MissionCard(
      icon: Icons.note_outlined,
      title: 'Notes',
      color: PremiumTheme.textSecondary,
      child: Text(
        notes,
        style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 15),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  TRACKING CARD
// ══════════════════════════════════════════════════════════════════

class MissionTrackingCard extends StatelessWidget {
  final bool isActive;
  final String? publicLink;
  final VoidCallback onToggle;
  final VoidCallback? onCopyLink;
  final VoidCallback? onShareLink;

  const MissionTrackingCard({
    super.key,
    required this.isActive,
    this.publicLink,
    required this.onToggle,
    this.onCopyLink,
    this.onShareLink,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PremiumTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? PremiumTheme.accentGreen.withOpacity(0.5) : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                isActive ? Icons.gps_fixed : Icons.gps_off,
                color: isActive ? PremiumTheme.accentGreen : PremiumTheme.textTertiary,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isActive ? 'Tracking GPS Actif' : 'Tracking GPS Inactif',
                      style: TextStyle(
                        color: isActive ? PremiumTheme.accentGreen : PremiumTheme.textSecondary,
                        fontWeight: FontWeight.bold, fontSize: 15,
                      ),
                    ),
                    Text(
                      isActive ? 'Position mise a jour toutes les 3s' : 'Activez pour partager votre position',
                      style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Switch(value: isActive, onChanged: (_) => onToggle(), activeColor: PremiumTheme.accentGreen),
            ],
          ),
          if (isActive && publicLink != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: PremiumTheme.lightBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Text(publicLink!, style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onCopyLink,
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('Copier'),
                    style: OutlinedButton.styleFrom(foregroundColor: PremiumTheme.primaryTeal, side: const BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onShareLink,
                    icon: const Icon(Icons.share, size: 16),
                    label: const Text('Partager'),
                    style: ElevatedButton.styleFrom(backgroundColor: PremiumTheme.primaryTeal, foregroundColor: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  LOCATION BLOCK (shared between itinerary and restitution cards)
// ══════════════════════════════════════════════════════════════════

class LocationBlock extends StatelessWidget {
  final Color color;
  final String label;
  final String address;
  final String? contactName;
  final String? contactPhone;
  final String? date;
  final void Function(String)? onPhoneCall;

  const LocationBlock({
    super.key,
    required this.color,
    required this.label,
    required this.address,
    this.contactName,
    this.contactPhone,
    this.date,
    this.onPhoneCall,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.circle, color: color, size: 10),
              const SizedBox(width: 8),
              Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
            ],
          ),
          const SizedBox(height: 8),
          Text(address, style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.w500)),
          if (date != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today, color: color.withOpacity(0.7), size: 14),
                const SizedBox(width: 6),
                Text(date!, style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 13)),
              ],
            ),
          ],
          if (contactName != null || contactPhone != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.04),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: color.withOpacity(0.15)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.person, color: color, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          contactName != null && contactName!.isNotEmpty ? contactName! : 'Contact non renseigne',
                          style: TextStyle(
                            color: contactName != null && contactName!.isNotEmpty ? PremiumTheme.textPrimary : PremiumTheme.textTertiary,
                            fontSize: 15, fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (contactPhone != null && contactPhone!.isNotEmpty)
                    InkWell(
                      onTap: () => onPhoneCall?.call(contactPhone!),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: color.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.phone, color: color, size: 20),
                            const SizedBox(width: 10),
                            Text(contactPhone!, style: const TextStyle(color: PremiumTheme.textPrimary, fontSize: 17, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
                              child: const Text('Appeler', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: PremiumTheme.textTertiary.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.phone_disabled, color: PremiumTheme.textTertiary, size: 18),
                          SizedBox(width: 8),
                          Text('Aucun numero de telephone', style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 14)),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════
//  SHARE BUTTON (for tracking share card)
// ══════════════════════════════════════════════════════════════════

class ShareButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const ShareButton({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
