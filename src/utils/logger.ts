/**
 * Logger utilitaire pour gérer les logs en production
 * Les logs sont désactivés en production pour améliorer les performances
 */
const IS_DEV = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  error: (...args: any[]) => {
    // On garde les erreurs même en production pour le monitoring
    console.error(...args);
  },

  warn: (...args: any[]) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },

  info: (...args: any[]) => {
    if (IS_DEV) {
      console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (IS_DEV) {
      console.debug(...args);
    }
  }
};
