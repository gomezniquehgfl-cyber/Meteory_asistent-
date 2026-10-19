/**
 * Background Reminder & Autonomous Task Daemon for METEORY ASISTEN
 * Manages scheduled reminders, background alerts, and long-term user memory persistence.
 */

import { addUserMemory, auth } from '../firebase.ts';
import { jarvisVoice, sfx } from './speech.ts';

export interface ReminderItem {
  id: string;
  targetTime: string; // "17:00" or ISO format
  message: string;
  triggered: boolean;
}

export class ReminderDaemon {
  private static reminders: ReminderItem[] = [];
  private static timerInterval: number | null = null;
  private static onTriggerCallback?: (reminder: ReminderItem) => void;

  static init(callback: (reminder: ReminderItem) => void) {
    this.onTriggerCallback = callback;
    const uid = auth.currentUser?.uid || 'default';
    try {
      const saved = localStorage.getItem(`meteory_reminders_${uid}`);
      if (saved) {
        this.reminders = JSON.parse(saved);
      }
    } catch {}

    if (!this.timerInterval && typeof window !== 'undefined') {
      this.timerInterval = window.setInterval(() => {
        this.checkReminders();
      }, 10000); // Check every 10 seconds
    }
  }

  static addReminder(timeStr: string, message: string): ReminderItem {
    const item: ReminderItem = {
      id: `rem-${Date.now()}`,
      targetTime: timeStr,
      message,
      triggered: false,
    };
    this.reminders.push(item);
    this.saveToStorage();
    return item;
  }

  static getReminders(): ReminderItem[] {
    return this.reminders;
  }

  private static saveToStorage() {
    const uid = auth.currentUser?.uid || 'default';
    try {
      localStorage.setItem(`meteory_reminders_${uid}`, JSON.stringify(this.reminders));
    } catch {}
  }

  private static checkReminders() {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    for (const rem of this.reminders) {
      if (!rem.triggered && rem.targetTime === currentTimeStr) {
        rem.triggered = true;
        this.saveToStorage();
        sfx.playActivationBlip();
        if (this.onTriggerCallback) {
          this.onTriggerCallback(rem);
        }
      }
    }
  }

  /**
   * Automatically parse natural language reminders like "recuérdame dormir a las 17:00" or "avísame a las 5"
   */
  static parseAndScheduleReminder(prompt: string): string | null {
    const p = prompt.toLowerCase();
    const timeMatch = p.match(/(?:a las|alas|a la)\s+(\d{1,2})[:h](\d{2})?/i) || p.match(/(?:a las|alas|a la)\s+(\d{1,2})\s*(?:en punto|horas)?/i);

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

      // Handle afternoon / evening context
      if ((p.includes('tarde') || p.includes('noche') || p.includes('pm')) && hours < 12) {
        hours += 12;
      }

      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      let taskMsg = 'Recordatorio programado del sistema';
      if (p.includes('dormir')) taskMsg = 'Es hora de dormir y descansar';
      else if (p.includes('reunión') || p.includes('reunion')) taskMsg = 'Tienes una reunión programada';
      else if (p.includes('trabajar')) taskMsg = 'Inicia sesión de trabajo';

      this.addReminder(timeStr, taskMsg);
      return `Entendido. He programado una alerta en segundo plano para las ${timeStr} ("${taskMsg}"). Te avisaré puntualmente aunque estés en otra sección.`;
    }
    return null;
  }

  /**
   * Extract permanent user facts or memories to never forget across sessions
   */
  static async extractAndSaveMemory(prompt: string, userName: string) {
    const p = prompt.toLowerCase();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    let memorySnippet: string | null = null;
    if (p.includes('recuerda que') || p.includes('aprende que') || p.includes('anota que') || p.includes('mi favorito') || p.includes('tengo que')) {
      memorySnippet = prompt;
    }

    if (memorySnippet) {
      try {
        await addUserMemory(uid, memorySnippet);
      } catch {}
    }
  }
}
