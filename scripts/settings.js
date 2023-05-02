import { AuraShareMenu } from './menu.js';

export class Settings {
    static registerSettings() {
            game.settings.register('aurashare', 'Diehard', {
                name: 'Diehard',
                hint: 'Should actors with "Diehard" continue to share auras when at 0 HP?',
                scope: 'world',   
                config: true,     
                type: Boolean,    
                default: true
            });
            game.settings.register('aurashare', 'UnconsciousAuras', {
                name: 'Unconscious Auras',
                hint: 'Should all actors continue to share auras when below 0 HP? (Overrides the Diehard setting)',
                scope: 'world',   
                config: true,     
                type: Boolean,     
                default: true
            });
            game.settings.register('aurashare', 'DeleteAuras', {
                name: 'Delete Auras',
                hint: 'Should auras be deleted when an actor is out of range? (If not, they get deactivated)',
                scope: 'world',   
                config: true,     
                type: Boolean,     
                default: true
            });
    }
}