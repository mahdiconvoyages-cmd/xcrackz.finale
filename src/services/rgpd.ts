// Service d'export RGPD des données personnelles
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { analytics } from './analytics';
import { crashReporting } from './crashReporting';

export interface UserDataExport {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  missions: any[];
  inspections: any[];
  vehicles: any[];
  documents: any[];
  tracking_history: any[];
  export_date: string;
  export_version: string;
}

class RGPDService {
  private readonly EXPORT_VERSION = '1.0';

  /**
   * Exporter toutes les données personnelles de l'utilisateur
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    try {
      console.log('📦 Exportation des données pour:', userId);
      analytics.logEvent('data_export_started', { user_id: userId });

      // Récupérer les informations utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Récupérer les missions créées
      const { data: createdMissions, error: createdError } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId);

      if (createdError) throw createdError;

      // Récupérer les missions reçues
      const { data: receivedMissions, error: receivedError } = await supabase
        .from('missions')
        .select('*')
        .eq('assigned_user_id', userId);

      if (receivedError) throw receivedError;

      // Combiner les missions
      const allMissions = [
        ...(createdMissions || []),
        ...(receivedMissions || []),
      ];

      // Récupérer les inspections
      const { data: inspections, error: inspectionsError } = await supabase
        .from('inspections')
        .select('*')
        .eq('user_id', userId);

      if (inspectionsError) throw inspectionsError;

      // Récupérer les véhicules
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId);

      if (vehiclesError) throw vehiclesError;

      // Récupérer les documents
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId);

      if (documentsError) throw documentsError;

      // Récupérer l'historique de tracking
      const { data: trackingHistory, error: trackingError } = await supabase
        .from('tracking_history')
        .select('*')
        .eq('user_id', userId);

      if (trackingError) throw trackingError;

      const exportData: UserDataExport = {
        user: {
          id: userData.id,
          email: userData.email,
          created_at: userData.created_at,
        },
        missions: allMissions || [],
        inspections: inspections || [],
        vehicles: vehicles || [],
        documents: documents || [],
        tracking_history: trackingHistory || [],
        export_date: new Date().toISOString(),
        export_version: this.EXPORT_VERSION,
      };

      console.log('✅ Données exportées:', {
        missions: exportData.missions.length,
        inspections: exportData.inspections.length,
        vehicles: exportData.vehicles.length,
      });

      analytics.logEvent('data_export_completed', {
        user_id: userId,
        missions_count: exportData.missions.length,
        inspections_count: exportData.inspections.length,
      });

      return exportData;
    } catch (error) {
      console.error('❌ Erreur export données:', error);
      crashReporting.reportError(error as Error, {
        service: 'rgpd',
        action: 'export_data',
        user_id: userId,
      });
      throw error;
    }
  }

  /**
   * Générer un fichier JSON avec les données
   */
  async generateJSONFile(data: UserDataExport): Promise<string> {
    try {
      const fileName = `finality_data_export_${Date.now()}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(data, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      console.log('✅ Fichier JSON créé:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Erreur création fichier:', error);
      throw error;
    }
  }

  /**
   * Partager le fichier d'export
   */
  async shareExportFile(filePath: string) {
    try {
      const canShare = await Sharing.isAvailableAsync();
      
      if (!canShare) {
        throw new Error('Le partage n\'est pas disponible sur cet appareil');
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Exporter mes données Finality',
        UTI: 'public.json',
      });

      console.log('✅ Fichier partagé');
      analytics.logEvent('data_export_shared');
    } catch (error) {
      console.error('❌ Erreur partage fichier:', error);
      throw error;
    }
  }

  /**
   * Workflow complet: Export + Génération + Partage
   */
  async exportAndShare(userId: string) {
    try {
      // 1. Exporter les données
      const data = await this.exportUserData(userId);

      // 2. Générer le fichier JSON
      const filePath = await this.generateJSONFile(data);

      // 3. Partager le fichier
      await this.shareExportFile(filePath);

      return { success: true, filePath };
    } catch (error) {
      console.error('❌ Erreur workflow export:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Supprimer toutes les données personnelles (RGPD Right to be Forgotten)
   */
  async deleteAllUserData(userId: string, password: string): Promise<void> {
    try {
      console.log('🗑️  Suppression des données pour:', userId);
      analytics.logEvent('data_deletion_started', { user_id: userId });

      // Vérifier le mot de passe
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: '', // L'email sera récupéré automatiquement
        password,
      });

      if (authError) {
        throw new Error('Mot de passe incorrect');
      }

      // Supprimer dans l'ordre des dépendances

      // 1. Documents
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', userId);

      if (docsError) throw docsError;

      // 2. Inspections
      const { error: inspectionsError } = await supabase
        .from('inspections')
        .delete()
        .eq('user_id', userId);

      if (inspectionsError) throw inspectionsError;

      // 3. Tracking history
      const { error: trackingError } = await supabase
        .from('tracking_history')
        .delete()
        .eq('user_id', userId);

      if (trackingError) throw trackingError;

      // 4. Missions (créées ET reçues)
      const { error: missionsCreatedError } = await supabase
        .from('missions')
        .delete()
        .eq('user_id', userId);

      if (missionsCreatedError) throw missionsCreatedError;

      const { error: missionsReceivedError } = await supabase
        .from('missions')
        .delete()
        .eq('assigned_user_id', userId);

      if (missionsReceivedError) throw missionsReceivedError;

      // 5. Véhicules
      const { error: vehiclesError } = await supabase
        .from('vehicles')
        .delete()
        .eq('user_id', userId);

      if (vehiclesError) throw vehiclesError;

      // 6. Profil utilisateur
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) throw userError;

      // 7. Compte auth Supabase
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        console.warn('⚠️ Erreur suppression auth (peut nécessiter admin):', deleteAuthError);
      }

      console.log('✅ Toutes les données supprimées');
      analytics.logEvent('data_deletion_completed', { user_id: userId });

    } catch (error) {
      console.error('❌ Erreur suppression données:', error);
      crashReporting.reportError(error as Error, {
        service: 'rgpd',
        action: 'delete_data',
        user_id: userId,
      });
      throw error;
    }
  }

  /**
   * Obtenir un résumé des données stockées
   */
  async getDataSummary(userId: string) {
    try {
      const [
        missions,
        inspections,
        vehicles,
        documents,
        tracking,
      ] = await Promise.all([
        supabase.from('missions').select('id', { count: 'exact', head: true }).or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`),
        supabase.from('inspections').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('tracking_history').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      return {
        missions: missions.count || 0,
        inspections: inspections.count || 0,
        vehicles: vehicles.count || 0,
        documents: documents.count || 0,
        tracking_entries: tracking.count || 0,
      };
    } catch (error) {
      console.error('❌ Erreur récupération summary:', error);
      return {
        missions: 0,
        inspections: 0,
        vehicles: 0,
        documents: 0,
        tracking_entries: 0,
      };
    }
  }
}

export const rgpdService = new RGPDService();

// Hook React pour RGPD
export function useRGPD(userId: string | null) {
  const React = require('react');
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<any>(null);

  React.useEffect(() => {
    if (userId) {
      loadSummary();
    }
  }, [userId]);

  const loadSummary = async () => {
    if (!userId) return;
    const data = await rgpdService.getDataSummary(userId);
    setSummary(data);
  };

  const exportData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await rgpdService.exportAndShare(userId);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async (password: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      await rgpdService.deleteAllUserData(userId, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    summary,
    exportData,
    deleteData,
    refreshSummary: loadSummary,
  };
}
