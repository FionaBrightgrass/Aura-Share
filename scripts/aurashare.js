import { AuraLogic } from './AuraLogic.js';
import { Settings } from './settings.js';

Hooks.once('i18nInit', () => { 
    Settings.registerSettings();
  });

Hooks.on('updateToken', (token, update, _options, _userId) => {
    if(AuraLogic.shouldHandle() && (update?.hasOwnProperty('x') || update?.hasOwnProperty('y') || update?.hasOwnProperty('disposition'))){
        AuraLogic.refreshAuras(token, false);
    }
    return;
});

Hooks.on('updateActor', (actor, update, _options, _userId) => {
    let tokens = actor.getActiveTokens();
    if(tokens?.length > 0 && AuraLogic.shouldHandle() && (update?.system.attributes.hp)){
        let token = tokens[0].document;
        AuraLogic.refreshAuras(token, false);
    }
    return;
});

Hooks.on('preDeleteToken', (token, _options, _userId) =>{
    if(AuraLogic.shouldHandle()){
        AuraLogic.refreshAuras(token, true);
        AuraLogic.clearAllChildAuras(token);
    }    
});

Hooks.on('createToken', (token, _options, _userId) =>{
    if(AuraLogic.shouldHandle()){
        AuraLogic.refreshAuras(token, false);
    }    
});


Hooks.on('pf1ToggleActorBuff',  (actor, itemData) =>{
    let tokens = actor.getActiveTokens();
    if(tokens?.length > 0 && AuraLogic.shouldHandle() && itemData.getItemDictionaryFlag('radius') > 0){
        let token = tokens[0].document;
        AuraLogic.refreshAuras(token, false);
    }
})
