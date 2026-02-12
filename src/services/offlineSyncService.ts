import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

type QueueActionType = 'create' | 'update' | 'delete' | 'rpc';

interface QueuedAction {
  id: string;
  type: QueueActionType;
  table?: string;
  data?: any;
  functionName?: string;
  args?: Record<string, any>;
  timestamp: number;
  retries: number;
}

class OfflineSyncService {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private listeners: Array<(status: SyncStatus) => void> = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = true;

  constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  /**
   * Écouter les changements de connexion réseau
   */
  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log('📡 Statut réseau:', this.isOnline ? 'En ligne' : 'Hors ligne');
      
      this.notifyListeners({
        status: this.isOnline ? 'online' : 'offline',
        queueLength: this.queue.length,
      });

      // Si on vient de se reconnecter, traiter la queue
      if (wasOffline && this.isOnline && this.queue.length > 0) {
        console.log('🔄 Reconnexion détectée, traitement de la queue...');
        this.processQueue();
      }
    });
  }

  /**
   * Charger la queue depuis AsyncStorage
   */
  private async loadQueue() {
    try {
      const queueStr = await AsyncStorage.getItem('sync_queue');
      if (queueStr) {
        this.queue = JSON.parse(queueStr);
        console.log(`📥 Queue chargée: ${this.queue.length} actions en attente`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la queue:', error);
    }
  }

  /**
   * Sauvegarder la queue dans AsyncStorage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la queue:', error);
    }
  }

  /**
   * Ajouter une action à la queue
   */
  async addToQueue(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<string> {
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(action);
    await this.saveQueue();

    console.log(`➕ Action ajoutée à la queue: ${type} ${table}`);
    
    this.notifyListeners({
      status: this.isOnline ? 'syncing' : 'queued',
      queueLength: this.queue.length,
    });

    // Si en ligne, traiter immédiatement
    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  async queueRpc(functionName: string, args: Record<string, any>): Promise<string> {
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rpc',
      functionName,
      args,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(action);
    await this.saveQueue();

    console.log(`🧮 RPC ${functionName} ajouté à la queue offline`);

    this.notifyListeners({
      status: this.isOnline ? 'syncing' : 'queued',
      queueLength: this.queue.length,
    });

    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  /**
   * Traiter la queue d'actions
   */
  async processQueue() {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyListeners({
      status: 'syncing',
      queueLength: this.queue.length,
    });

    console.log(`🔄 Traitement de ${this.queue.length} actions...`);

    const actionsToProcess = [...this.queue];
    const successfulActions: string[] = [];
    const failedActions: QueuedAction[] = [];

    for (const action of actionsToProcess) {
      try {
        await this.executeAction(action);
        successfulActions.push(action.id);
        console.log(`✅ Action ${action.id} exécutée avec succès`);
      } catch (error) {
        console.error(`❌ Échec de l'action ${action.id}:`, error);
        
        // Incrémenter le compteur de tentatives
        action.retries++;
        
        // Supprimer après 5 tentatives
        if (action.retries < 5) {
          failedActions.push(action);
        } else {
          console.warn(`⚠️ Action ${action.id} abandonnée après 5 tentatives`);
        }
      }
    }

    // Mettre à jour la queue
    this.queue = failedActions;
    await this.saveQueue();

    this.isProcessing = false;
    
    this.notifyListeners({
      status: this.queue.length > 0 ? 'error' : 'synced',
      queueLength: this.queue.length,
      successCount: successfulActions.length,
      errorCount: failedActions.length,
    });

    console.log(
      `✨ Sync terminée: ${successfulActions.length} succès, ${failedActions.length} échecs`
    );
  }

  /**
   * Exécuter une action en base de données
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    const { type, table, data } = action;

    switch (type) {
      case 'create':
        const { error: createError } = await supabase.from(table).insert(data);
        if (createError) throw createError;
        break;

      case 'update':
        const { id, ...updateData } = data;
        const { error: updateError } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
      case 'rpc':
        if (!action.functionName) {
          throw new Error('RPC action missing function name');
        }
        const { error: rpcError } = await supabase.rpc(action.functionName, action.args ?? {});
        if (rpcError) throw rpcError;
        break;
    }
  }

  /**
   * Ajouter un listener pour les changements de statut
   */
  addListener(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
    
    // Envoyer le statut actuel immédiatement
    callback({
      status: this.isOnline ? (this.queue.length > 0 ? 'syncing' : 'synced') : 'offline',
      queueLength: this.queue.length,
    });
  }

  /**
   * Retirer un listener
   */
  removeListener(callback: (status: SyncStatus) => void) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * Démarrer la synchronisation automatique
   */
  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        console.log('⏰ Auto-sync déclenché');
        this.processQueue();
      }
    }, intervalMs);

    console.log(`🔁 Auto-sync activé (intervalle: ${intervalMs / 1000}s)`);
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏸️ Auto-sync désactivé');
    }
  }

  /**
   * Vider complètement la queue
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    console.log('🗑️ Queue vidée');
    
    this.notifyListeners({
      status: 'synced',
      queueLength: 0,
    });
  }

  /**
   * Obtenir le statut actuel
   */
  getStatus(): SyncStatus {
    return {
      status: this.isOnline ? (this.queue.length > 0 ? 'syncing' : 'synced') : 'offline',
      queueLength: this.queue.length,
      isOnline: this.isOnline,
    };
  }
}

export interface SyncStatus {
  status: 'offline' | 'syncing' | 'synced' | 'error' | 'queued' | 'online';
  queueLength: number;
  successCount?: number;
  errorCount?: number;
  isOnline?: boolean;
}

// Instance singleton
export const offlineSyncService = new OfflineSyncService();
