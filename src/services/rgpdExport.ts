// Service d'export des données utilisateur (RGPD)
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { analytics } from './analytics';
import { crashReporting } from './crashReporting';

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    created_at: string;
    metadata: any;
  };
  missions: any[];
  inspections: any[];
  documents: any[];
  payments: any[];
  settings: any;
  analytics_summary: {
    total_missions: number;
    total_inspections: number;
    total_payments: number;
    account_age_days: number;
  };
  export_date: string;
  export_version: string;
}

class RGPDExportService {
  private readonly EXPORT_VERSION = '1.0';

  /**
   * Exporter toutes les données utilisateur
   */
  async exportUserData(userId: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      console.log('📦 Début export données RGPD pour user:', userId);
      analytics.logEvent('rgpd_export_started', { user_id: userId });

      // 1. Récupérer les données utilisateur
      const userData = await this.fetchUserData(userId);
      if (!userData) {
        throw new Error('Impossible de récupérer les données utilisateur');
      }

      // 2. Récupérer les missions
      const missions = await this.fetchUserMissions(userId);
      
      // 3. Récupérer les inspections
      const inspections = await this.fetchUserInspections(userId);
      
      // 4. Récupérer les documents
      const documents = await this.fetchUserDocuments(userId);
      
      // 5. Récupérer les paiements
      const payments = await this.fetchUserPayments(userId);
      
      // 6. Récupérer les paramètres
      const settings = await this.fetchUserSettings(userId);

      // 7. Compiler le rapport
      const exportData: UserDataExport = {
        user: userData,
        missions,
        inspections,
        documents,
        payments,
        settings,
        analytics_summary: {
          total_missions: missions.length,
          total_inspections: inspections.length,
          total_payments: payments.length,
          account_age_days: this.calculateAccountAge(userData.created_at),
        },
        export_date: new Date().toISOString(),
        export_version: this.EXPORT_VERSION,
      };

      // 8. Sauvegarder en JSON
      const filePath = await this.saveToFile(exportData, userId);

      console.log('✅ Export RGPD terminé:', filePath);
      analytics.logEvent('rgpd_export_completed', {
        user_id: userId,
        total_missions: missions.length,
        total_inspections: inspections.length,
        file_size: JSON.stringify(exportData).length,
      });

      return { success: true, filePath };

    } catch (error: any) {
      console.error('❌ Erreur export RGPD:', error);
      crashReporting.reportError(error, {
        service: 'rgpd_export',
        user_id: userId,
      });

      analytics.logEvent('rgpd_export_failed', {
        user_id: userId,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les données utilisateur
   */
  private async fetchUserData(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les missions
   */
  private async fetchUserMissions(userId: string) {
    const { data: created } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', userId);

    const { data: received } = await supabase
      .from('missions')
      .select('*')
      .eq('assigned_user_id', userId);

    return {
      created: created || [],
      received: received || [],
    };
  }

  /**
   * Récupérer les inspections
   */
  private async fetchUserInspections(userId: string) {
    // Récupérer les missions de l'utilisateur
    const { data: missions } = await supabase
      .from('missions')
      .select('id')
      .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);

    if (!missions || missions.length === 0) return [];

    const missionIds = missions.map(m => m.id);

    // Récupérer les inspections liées
    const { data: inspections } = await supabase
      .from('inspections')
      .select('*')
      .in('mission_id', missionIds);

    return inspections || [];
  }

  /**
   * Récupérer les documents
   */
  private async fetchUserDocuments(userId: string) {
    const { data } = await supabase
      .from('inspection_documents')
      .select('*')
      .eq('user_id', userId);

    return data || [];
  }

  /**
   * Récupérer les paiements
   */
  private async fetchUserPayments(userId: string) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    return data || [];
  }

  /**
   * Récupérer les paramètres
   */
  private async fetchUserSettings(userId: string) {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    return data || {};
  }

  /**
   * Calculer l'âge du compte en jours
   */
  private calculateAccountAge(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Sauvegarder dans un fichier JSON
   */
  private async saveToFile(data: UserDataExport, userId: string): Promise<string> {
    const fileName = `finality_export_${userId}_${Date.now()}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    const jsonContent = JSON.stringify(data, null, 2);
    await FileSystem.writeAsStringAsync(filePath, jsonContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return filePath;
  }

  /**
   * Partager le fichier d'export
   */
  async shareExport(filePath: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert(
          'Partage non disponible',
          'Le partage de fichiers n\'est pas disponible sur cet appareil'
        );
        return false;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Exporter mes données Finality',
        UTI: 'public.json',
      });

      console.log('✅ Fichier partagé avec succès');
      analytics.logEvent('rgpd_export_shared');
      
      return true;
    } catch (error: any) {
      console.error('❌ Erreur partage export:', error);
      crashReporting.reportError(error, {
        service: 'rgpd_export',
        action: 'share',
      });
      return false;
    }
  }

  /**
   * Exporter au format PDF (version premium)
   */
  async exportToPDF(userId: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      console.log('📄 Export PDF en cours...');
      
      // TODO: Implémenter la génération PDF avec pdf-lib
      // Pour l'instant, retourner une erreur friendly
      
      Alert.alert(
        'Export PDF',
        'L\'export PDF sera disponible dans une prochaine version.\nUtilisez l\'export JSON pour le moment.',
        [{ text: 'OK' }]
      );

      return { 
        success: false, 
        error: 'PDF export not yet implemented' 
      };

    } catch (error: any) {
      console.error('❌ Erreur export PDF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprimer un export
   */
  async deleteExport(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log('🗑️ Export supprimé:', filePath);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ Erreur suppression export:', error);
      return false;
    }
  }

  /**
   * Lister les exports existants
   */
  async listExports(): Promise<string[]> {
    try {
      const directory = FileSystem.documentDirectory;
      if (!directory) return [];

      const files = await FileSystem.readDirectoryAsync(directory);
      const exports = files.filter(file => 
        file.startsWith('finality_export_') && file.endsWith('.json')
      );

      return exports.map(file => `${directory}${file}`);
    } catch (error: any) {
      console.error('❌ Erreur liste exports:', error);
      return [];
    }
  }

  /**
   * Obtenir la taille d'un export
   */
  async getExportSize(filePath: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      return fileInfo.exists ? (fileInfo.size || 0) : 0;
    } catch (error: any) {
      console.error('❌ Erreur taille export:', error);
      return 0;
    }
  }

  /**
   * Formater la taille en MB/KB
   */
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const rgpdExportService = new RGPDExportService();
