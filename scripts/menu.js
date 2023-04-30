export class AuraShareMenu extends FormApplication {
  getData() {
    return game.settings.get('fionaaurashare', 'AuraShareMenu');
  }

  _updateObject(event, formData) {
    const data = expandObject(formData);
    game.settings.set('fionaaurashare', 'AuraShareMenu', data);
  }
}