import { AuraShareMenu } from './menu.js';

export class Settings {
    static registerSettings() {
            game.settings.register('Pathfinder-Aura-Share', 'Diehard', {
                name: 'Diehard',
                hint: 'Should actors with "Diehard" continue to share auras when at 0 HP?',
                scope: 'world',     // "world" = sync to db, "client" = local storage
                config: true,       // false if you dont want it to show in module config
                type: Boolean,       // Number, Boolean, String, Object
                default: true
            });
            game.settings.register('Pathfinder-Aura-Share', 'UnconsciousAuras', {
                name: 'Unconscious Auras',
                hint: 'Should all actors continue to share auras when at 0 HP? (Overwrite Diehard setting)',
                scope: 'world',     // "world" = sync to db, "client" = local storage
                config: true,       // false if you dont want it to show in module config
                type: Boolean,       // Number, Boolean, String, Object
                default: true
            });
    }

    /**
     * For more information about FormApplications, see:
     * https://hackmd.io/UsmsgTj6Qb6eDw3GTi5XCg
     */
}