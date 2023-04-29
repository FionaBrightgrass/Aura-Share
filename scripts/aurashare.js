import { AuraUtils } from './aurautils.js';
import { Settings } from './settings.js';

Hooks.once('i18nInit', () => { 
    Settings.registerSettings();
  });

Hooks.on('updateToken', (token, update, _options, _userId) => {
    if(AuraUtils.shouldHandle() && (update?.hasOwnProperty('x') || update?.hasOwnProperty('y') || update?.hasOwnProperty('disposition'))){
        AuraUtils.refreshAuras(token, false);
    }
    return;
});

Hooks.on('updateActor', (actor, update, _options, _userId) => {
    let tokens = actor.getActiveTokens();
    if(tokens?.length > 0 && AuraUtils.shouldHandle() && (update?.system.attributes.hp)){
        let token = tokens[0].document;
        AuraUtils.refreshAuras(token, false);
    }
    return;
});

Hooks.on('preDeleteToken', (token, _options, _userId) =>{
    if(AuraUtils.shouldHandle()){
        AuraUtils.refreshAuras(token, true);
        AuraUtils.clearAllChildAuras(token);
    }    
});

Hooks.on('createToken', (token, _options, _userId) =>{
    if(AuraUtils.shouldHandle()){
        AuraUtils.refreshAuras(token, false);
    }    
});


Hooks.on('pf1ToggleActorBuff',  (actor, itemData) =>{
    let tokens = actor.getActiveTokens();
    if(tokens?.length > 0 && AuraUtils.shouldHandle() && itemData.getItemDictionaryFlag('radius') > 0){
        let token = tokens[0].document;
        AuraUtils.refreshAuras(token, false);
    }
})
