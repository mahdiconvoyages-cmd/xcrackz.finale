/**
 * 🧠 Clara AI - Système de Mémoire Personnalisée
 * 
 * Clara apprend à connaître son utilisateur:
 * - Habitudes (heures de travail, trajets fréquents)
 * - Préférences (type de véhicules, style de conduite)
 * - Historique interactions
 * - Contexte personnalisé
 * - Apprentissage continu
 * 
 * Objectif: Rendre Clara de plus en plus familière et pertinente avec le temps
 */

import { supabase } from '../lib/supabase';

// Storage web (localStorage)
const storage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
};

const STORAGE_KEYS = {
  USER_MEMORY: '@clara_user_memory_',
  INTERACTIONS: '@clara_interactions_',
  PREFERENCES: '@clara_preferences_',
  LEARNING_DATA: '@clara_learning_',
};

export interface UserMemory {
  userId: string;
  profile: {
    firstName?: string;
    preferredName?: string; // Comment l'utilisateur préfère être appelé
    role?: string; // chauffeur, dispatcher, etc.
    experience?: 'débutant' | 'intermédiaire' | 'expert';
    lastUpdated: number;
  };
  
  habits: {
    // Heures de travail habituelles
    workingHours?: {
      start: string; // "08:00"
      end: string; // "18:00"
      days: string[]; // ["lundi", "mardi", ...]
    };
    
    // Fréquence d'utilisation
    avgMissionsPerWeek?: number;
    avgInspectionsPerDay?: number;
    
    // Trajets fréquents
    frequentRoutes?: Array<{
      from: string;
      to: string;
      count: number;
      avgDuration: number; // minutes
    }>;
    
    // Véhicules préférés
    favoriteVehicles?: Array<{
      make: string;
      model: string;
      count: number;
    }>;
  };
  
  preferences: {
    // Communication
    communicationStyle?: 'formel' | 'casual' | 'technique';
    detailLevel?: 'concis' | 'détaillé' | 'exhaustif';
    
    // Notifications
    notificationTiming?: 'immédiate' | 'regroupée' | 'fin_journée';
    
    // Assistance
    assistanceLevel?: 'autonome' | 'guidé' | 'main_tenue';
    
    // Interface
    themePreference?: 'light' | 'dark' | 'auto';
    language?: 'fr' | 'en';
  };
  
  interactions: {
    totalConversations: number;
    totalQuestions: number;
    avgResponseTime: number; // ms
    lastInteractionDate: number;
    
    // Topics fréquents
    frequentTopics?: Array<{
      topic: string;
      count: number;
      lastAsked: number;
    }>;
    
    // Questions récurrentes
    commonQuestions?: Array<{
      question: string;
      category: string;
      count: number;
    }>;
  };
  
  context: {
    // Mission en cours
    currentMission?: {
      id: string;
      reference: string;
      vehicle: string;
      startedAt: number;
    };
    
    // Dernières actions
    recentActions?: Array<{
      type: string;
      timestamp: number;
      details: any;
    }>;
    
    // Problèmes rencontrés
    commonIssues?: Array<{
      issue: string;
      count: number;
      lastOccurred: number;
      resolved: boolean;
    }>;
  };
  
  learning: {
    // Ce que Clara a appris sur l'utilisateur
    insights?: Array<{
      category: string;
      insight: string;
      confidence: number; // 0-1
      learnedAt: number;
    }>;
    
    // Corrections utilisateur
    corrections?: Array<{
      claraSaid: string;
      userCorrected: string;
      timestamp: number;
    }>;
  };
}

/**
 * Gestionnaire de mémoire utilisateur pour Clara
 */
export class ClaraMemoryManager {
  private userId: string;
  private memory: UserMemory | null = null;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  /**
   * Charger la mémoire utilisateur
   */
  async loadMemory(): Promise<UserMemory> {
    try {
      // 1. Charger depuis cache local
      const cached = await storage.getItem(
        `${STORAGE_KEYS.USER_MEMORY}${this.userId}`
      );
      
      if (cached) {
        this.memory = JSON.parse(cached);
        
        // 2. Synchroniser avec Supabase en arrière-plan
        this.syncWithServer();
        
        return this.memory!; // Non-null assertion (vient d'être défini)
      }
      
      // 3. Charger depuis serveur si pas de cache
      const { data, error } = await supabase
        .from('user_ai_memory')
        .select('*')
        .eq('user_id', this.userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        this.memory = data.memory_data;
      } else {
        // 4. Créer nouvelle mémoire
        this.memory = this.createEmptyMemory();
      }
      
      // Sauvegarder en cache
      await this.saveToCache();
      
      return this.memory!; // Non-null assertion (toujours défini à ce point)
    } catch (error) {
      console.error('❌ Erreur chargement mémoire Clara:', error);
      this.memory = this.createEmptyMemory();
      return this.memory!; // Non-null assertion (vient d'être créé)
    }
  }
  
  /**
   * Créer mémoire vide
   */
  private createEmptyMemory(): UserMemory {
    return {
      userId: this.userId,
      profile: {
        lastUpdated: Date.now(),
      },
      habits: {},
      preferences: {
        communicationStyle: 'casual',
        detailLevel: 'détaillé',
        assistanceLevel: 'guidé',
      },
      interactions: {
        totalConversations: 0,
        totalQuestions: 0,
        avgResponseTime: 0,
        lastInteractionDate: Date.now(),
        frequentTopics: [],
        commonQuestions: [],
      },
      context: {
        recentActions: [],
        commonIssues: [],
      },
      learning: {
        insights: [],
        corrections: [],
      },
    };
  }
  
  /**
   * Enregistrer une interaction
   */
  async recordInteraction(
    question: string,
    category: string,
    responseTime: number
  ) {
    if (!this.memory) await this.loadMemory();
    
    // Mettre à jour statistiques
    this.memory!.interactions.totalQuestions++;
    this.memory!.interactions.lastInteractionDate = Date.now();
    this.memory!.interactions.avgResponseTime = 
      (this.memory!.interactions.avgResponseTime * 
       (this.memory!.interactions.totalQuestions - 1) + responseTime) /
      this.memory!.interactions.totalQuestions;
    
    // Ajouter à topics fréquents
    const topics = this.memory!.interactions.frequentTopics || [];
    const existing = topics.find(t => t.topic === category);
    
    if (existing) {
      existing.count++;
      existing.lastAsked = Date.now();
    } else {
      topics.push({
        topic: category,
        count: 1,
        lastAsked: Date.now(),
      });
    }
    
    this.memory!.interactions.frequentTopics = topics
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
    
    // Ajouter question commune
    const questions = this.memory!.interactions.commonQuestions || [];
    const existingQ = questions.find(q => 
      q.question.toLowerCase() === question.toLowerCase()
    );
    
    if (existingQ) {
      existingQ.count++;
    } else {
      questions.push({
        question,
        category,
        count: 1,
      });
    }
    
    this.memory!.interactions.commonQuestions = questions
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
    
    await this.save();
  }
  
  /**
   * Apprendre une habitude
   */
  async learnHabit(type: string, data: any) {
    if (!this.memory) await this.loadMemory();
    
    switch (type) {
      case 'mission_completed':
        // Analyser véhicule préféré
        const vehicles = this.memory!.habits.favoriteVehicles || [];
        const vehicleKey = `${data.vehicle_brand} ${data.vehicle_model}`;
        const existing = vehicles.find(v => 
          `${v.make} ${v.model}` === vehicleKey
        );
        
        if (existing) {
          existing.count++;
        } else {
          vehicles.push({
            make: data.vehicle_brand,
            model: data.vehicle_model,
            count: 1,
          });
        }
        
        this.memory!.habits.favoriteVehicles = vehicles
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        break;
      
      case 'route_completed':
        const routes = this.memory!.habits.frequentRoutes || [];
        const routeKey = `${data.from}-${data.to}`;
        const existingRoute = routes.find(r => 
          `${r.from}-${r.to}` === routeKey
        );
        
        if (existingRoute) {
          existingRoute.count++;
          existingRoute.avgDuration = 
            (existingRoute.avgDuration * (existingRoute.count - 1) + data.duration) /
            existingRoute.count;
        } else {
          routes.push({
            from: data.from,
            to: data.to,
            count: 1,
            avgDuration: data.duration,
          });
        }
        
        this.memory!.habits.frequentRoutes = routes
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        break;
    }
    
    await this.save();
  }
  
  /**
   * Ajouter un insight (ce que Clara a appris)
   */
  async addInsight(
    category: string,
    insight: string,
    confidence: number = 0.8
  ) {
    if (!this.memory) await this.loadMemory();
    
    const insights = this.memory!.learning.insights || [];
    
    insights.push({
      category,
      insight,
      confidence,
      learnedAt: Date.now(),
    });
    
    this.memory!.learning.insights = insights
      .sort((a, b) => b.learnedAt - a.learnedAt)
      .slice(0, 50); // Garder les 50 plus récents
    
    await this.save();
    
    console.log(`🧠 Clara a appris: ${insight} (${Math.round(confidence * 100)}% confiance)`);
  }
  
  /**
   * Enregistrer une correction utilisateur
   */
  async recordCorrection(claraSaid: string, userCorrected: string) {
    if (!this.memory) await this.loadMemory();
    
    const corrections = this.memory!.learning.corrections || [];
    
    corrections.push({
      claraSaid,
      userCorrected,
      timestamp: Date.now(),
    });
    
    this.memory!.learning.corrections = corrections
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);
    
    await this.save();
    
    console.log('📝 Clara a enregistré la correction');
  }
  
  /**
   * Obtenir un contexte personnalisé pour Clara
   */
  getPersonalizedContext(): string {
    if (!this.memory) return '';
    
    const parts: string[] = [];
    
    // Nom préféré
    if (this.memory.profile.preferredName) {
      parts.push(`L'utilisateur préfère être appelé "${this.memory.profile.preferredName}".`);
    }
    
    // Expérience
    if (this.memory.profile.experience) {
      parts.push(`Niveau d'expérience: ${this.memory.profile.experience}.`);
    }
    
    // Véhicules préférés
    if (this.memory.habits.favoriteVehicles?.length) {
      const top = this.memory.habits.favoriteVehicles[0];
      parts.push(`Véhicule favori: ${top.make} ${top.model} (${top.count} missions).`);
    }
    
    // Topics fréquents
    if (this.memory.interactions.frequentTopics?.length) {
      const topics = this.memory.interactions.frequentTopics
        .slice(0, 3)
        .map(t => t.topic)
        .join(', ');
      parts.push(`Topics fréquents: ${topics}.`);
    }
    
    // Style de communication
    if (this.memory.preferences.communicationStyle) {
      parts.push(`Style préféré: ${this.memory.preferences.communicationStyle}.`);
    }
    
    // Insights récents
    if (this.memory.learning.insights?.length) {
      const recentInsights = this.memory.learning.insights
        .slice(0, 3)
        .map(i => i.insight)
        .join(' ');
      parts.push(`Observations: ${recentInsights}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Sauvegarder la mémoire
   */
  private async save() {
    try {
      // 1. Sauvegarder en cache local
      await this.saveToCache();
      
      // 2. Sauvegarder sur serveur (async, non-bloquant)
      this.syncWithServer();
    } catch (error) {
      console.error('❌ Erreur sauvegarde mémoire:', error);
    }
  }
  
  /**
   * Sauvegarder en cache local
   */
  private async saveToCache() {
    if (!this.memory) return;
    
    await storage.setItem(
      `${STORAGE_KEYS.USER_MEMORY}${this.userId}`,
      JSON.stringify(this.memory)
    );
  }
  
  /**
   * Synchroniser avec serveur
   */
  private async syncWithServer() {
    if (!this.memory) return;
    
    try {
      const { error } = await supabase
        .from('user_ai_memory')
        .upsert({
          user_id: this.userId,
          memory_data: this.memory,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      console.log('☁️ Mémoire synchronisée avec serveur');
    } catch (error) {
      console.warn('⚠️ Sync serveur échoué (non-bloquant):', error);
    }
  }
}

/**
 * Hook React pour utiliser la mémoire Clara
 */
export function useClaraMemory(userId: string) {
  const [manager] = React.useState(() => new ClaraMemoryManager(userId));
  const [memory, setMemory] = React.useState<UserMemory | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    manager.loadMemory().then(mem => {
      setMemory(mem);
      setLoading(false);
    });
  }, [manager]);
  
  return {
    memory,
    loading,
    manager,
    getContext: () => manager.getPersonalizedContext(),
  };
}

// Export React import
import React from 'react';
