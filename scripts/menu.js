export class AuraShareMenu extends FormApplication {
    // lots of other things...
  
    getData() {
      return game.settings.get('Pathfinder-Aura-Share', 'AuraSettingsMenu');
    }
  
    _updateObject(event, formData) {
      const data = expandObject(formData);
      game.settings.set('Pathfinder-Aura-Share', 'AuraSettingsMenu', data);
    }
  }