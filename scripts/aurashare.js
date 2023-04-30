import { AuraLogic } from './AuraLogic.js';
import { Settings } from './settings.js';


let sceneTokens = [];

Hooks.once('canvasInit', (_canvas) => { 
    if(AuraLogic.shouldHandle()){
        sceneTokens = AuraLogic.createTokenArray();
    }
  });

Hooks.once('i18nInit', () => { 
    Settings.registerSettings();
  });

Hooks.on('updateToken', (token, update, _options, _userId) => {
    if(AuraLogic.shouldHandle() && (update?.hasOwnProperty('x') || update?.hasOwnProperty('y') || update?.hasOwnProperty('disposition'))){
        if(!sceneTokens[0]){
            AuraLogic.createTokenArray();
        }
        AuraLogic.refreshAuras(token, sceneTokens,  false);
    }
    return;
});

Hooks.on('updateActor', (actor, update, _options, _userId) => {
    if(AuraLogic.shouldHandle() && update?.system.attributes.hp){
        if(!sceneTokens[0]){
            AuraLogic.createTokenArray();
        }
        let tokens = actor.getActiveTokens();
        if(tokens?.length > 0){
            let token = tokens[0].document;
            AuraLogic.refreshAuras(token, sceneTokens, false);
        }
    }
    return;
});

Hooks.on('preDeleteToken', (token, _options, _userId) =>{
    if(AuraLogic.shouldHandle()){
        AuraLogic.refreshAuras(token, sceneTokens, true);
        AuraLogic.clearAllChildAuras(token);
    }    
});

Hooks.on('deleteToken', (token, _options, _userId) =>{
    if(AuraLogic.shouldHandle()){
        sceneTokens = AuraLogic.refreshTokenArray(token);
        console.log(sceneTokens);
    }    
});

Hooks.on('createToken', (token, _options, _userId) =>{
    if(AuraLogic.shouldHandle()){
        if(!sceneTokens[0]){
            AuraLogic.createTokenArray();
        }
        AuraLogic.refreshAuras(token, sceneTokens, false);
        sceneTokens = AuraLogic.refreshTokenArray(token);
    }    
});

Hooks.on('pf1ToggleActorBuff',  (actor, itemData) =>{
    if(AuraLogic.shouldHandle() && itemData.getItemDictionaryFlag('radius') > 0){
        if(!sceneTokens[0]){
            AuraLogic.createTokenArray();
        }
        let tokens = actor.getActiveTokens();
        if(tokens?.length > 0){
            let token = tokens[0].document;
            AuraLogic.refreshAuras(token, sceneTokens, false);
        }
    }
})
