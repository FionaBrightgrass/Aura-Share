import { AuraLogic } from './auralogic.js';
import { Settings } from './settings.js';
import { Utils } from './utils.js';


let sceneTokens = [];

Hooks.once('i18nInit', () => { 
    Settings.registerSettings();
  });

Hooks.on('canvasInit', (_canvas) => {  
    if(Utils.shouldHandle()){
        sceneTokens.length = 0;
        sceneTokens = Utils.createTokenArray();
    }
  });

Hooks.on('canvasReady', (_canvas) => {  
    if(Utils.shouldHandle()){
        sceneTokens.length = 0;
        sceneTokens =  Utils.createTokenArray();
    }
  });


Hooks.on('canvasTeardown', (_canvas) => {  
    if(Utils.shouldHandle()){
        sceneTokens.length = 0;
        return;
    }
  });

Hooks.on('updateToken', async (token, update, _options, _userId) => {
    if(Utils.shouldHandle() && (update.hasOwnProperty('x') || update.hasOwnProperty('y') || update.hasOwnProperty('disposition'))){
        sceneTokens = Utils.createTokenArray();
        AuraLogic.refreshAuras(token, sceneTokens, false);
    }
});

Hooks.on('updateActor', async(actor, update, _options, _userId) => {
    if(Utils.shouldHandle() && update.system.attributes.hp){
        if(sceneTokens?.length < 1){
            sceneTokens.length = 0;
            sceneTokens = Utils.createTokenArray();
        }
        let tokens = actor.getActiveTokens();
        if(tokens?.length > 0){
            let token = tokens[0].document;
            AuraLogic.refreshAuras(token, sceneTokens, false);
        }
    }
    return;
});

Hooks.on('preDeleteToken', async(token, _options, _userId) =>{
    if(Utils.shouldHandle()){
        console.log('predelete');
        AuraLogic.refreshAuras(token, sceneTokens, true);
        //AuraLogic.clearAllChildAuras(token);
    }    
});

Hooks.on('deleteToken', async(token, _options, _userId) =>{
    if(Utils.shouldHandle()){
        sceneTokens = Utils.createTokenArray(token);
    }    
});

Hooks.on('createToken', async(token, _options, _userId) =>{
    if(Utils.shouldHandle()){
        if(!sceneTokens[0]){
            sceneTokens.length = 0;
            sceneTokens = Utils.createTokenArray();
        }
        AuraLogic.refreshAuras(token, sceneTokens, false);
    }    
});

Hooks.on('pf1ToggleActorBuff',  async(actor, itemData) =>{
    if(Utils.shouldHandle() && itemData.getItemDictionaryFlag('radius') > 0){
        if(sceneTokens?.length < 1){
            sceneTokens.length = 0;
            sceneTokens = Utils.createTokenArray();
        }
        let tokens = actor.getActiveTokens();
        if(tokens?.length > 0){
            let token = tokens[0].document;
            AuraLogic.refreshAuras(token, sceneTokens, false);
        }
    }
})
