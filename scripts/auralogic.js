//Synopsis: Copies aura buffs between actors in the Pathfinder 1.E system in FoundryVTT
//
//Create by:   Jeremy/Cactuar       
//Date:         4/19/23
//
//Details:
// If an actor has a buff in their buffs tab that ends with (Received)
// It will clone it to all allies within the radius of the aura.
// Allied gets a 0 radius copy of the aura, which can't be copied to others. (radius > 0 is the trigger)
// The radius needs to be set as a dictionary flag in the buff itself, as follows:        
//        name       value
//       radius        xx

export class AuraLogic{

    //This is main the entry point from the hooks:
    static async tradeAuras(ActiveToken, PassiveTokens){
        let Auras_ActiveToken = this.getAuras(ActiveToken, true);
        Promise.all(PassiveTokens.map(async (PassiveToken) => {
            if(PassiveToken?.id != ActiveToken?.id){
                let Auras_PassiveToken = this.getAuras(PassiveToken, true);
                if(Auras_ActiveToken?.length > 0){
                    //Active Token -> Inactive
                    this.updateAuraData(ActiveToken, Auras_ActiveToken, PassiveToken);
                }
                if(Auras_PassiveToken?.length > 0){
                    //Inactive Token -> Active
                    this.updateAuraData(PassiveToken, Auras_PassiveToken, ActiveToken);
                }
            }
        }))
        return;
    }

    //This is the secondary entry point from the hooks:
    //forceRemoveAuras only fires just before token deletion:
    static async forceRemoveAuras(ActiveToken, PassiveTokens){
        let Auras_ActiveToken = this.getAuras(ActiveToken, true);
        if(Auras_ActiveToken?.length > 0 ) {
            Promise.all(PassiveTokens.map(async (PassiveToken) => {
                if(PassiveToken?.id != ActiveToken?.id){
                    let aurasToRemove = [];
                    Promise.all(Auras_ActiveToken.map(async (aura) => {
                        let activeActor = ActiveToken.actor;
                        let newAura = this.generateChildAura(activeActor, aura);
                        aurasToRemove.push(newAura);
                    }));
                    if(aurasToRemove.length > 0){
                        if(game.settings.get('aurashare', 'DeleteAuras')){
                            this.deleteAuras(aurasToRemove, PassiveToken);
                        }else{
                            this.deactivateAuras(aurasToRemove, PassiveToken);
                        }
                    }
                }
            }))
        }
        return;
    }
    

    static async updateAuraData(activeToken, parentAuras, inactiveToken){
        let distance = !!pf1.utils.measureDistance ? pf1.utils.measureDistance({ x: inactiveToken.x, y: inactiveToken.y }, { x: activeToken.x, y: activeToken.y }) : canvas.grid.measureDistance(inactiveToken, activeToken); 
        let aurasToSync = [];
        let aurasToRemove = [];
        let activeActor = activeToken.actor;
        //Make lists of Add/Remove auras
        if(parentAuras?.length > 0 && distance != undefined){
            Promise.all(parentAuras.map(async (parentAura) => {
                let newAura = this.generateChildAura(activeActor, parentAura);
                let shareIfInactive = this.getInactiveShareFlag(parentAura);
                if (this.validateLifeform(activeActor) && parseInt(parentAura.system.flags.dictionary.radius) >= distance && (parentAura.system.active || shareIfInactive) ){
                    if(this.validateDisposition(activeToken, inactiveToken, parentAura)){
                        //             alive?             && aura applicable (range, etc) THIS NEEDS TO BE REWORKED
                        aurasToSync.push(newAura);
                    }
                }
                else{
                    aurasToRemove.push(newAura);          
                }
            }));
        }
        //Add:
        if(aurasToSync.length > 0){
            let inactiveActor = inactiveToken.actor;
            let newAuras = [];
            Promise.all(aurasToSync.map(async (aura) => {
                let childAura = inactiveActor.items?.getName(aura.name); 
                if(!childAura){
                    newAuras.push(aura);
                }else                       
                {
                    childAura.setActive(true);                      
                }
            }));
            if(newAuras.length > 0){
                inactiveToken.actor.createEmbeddedDocuments('Item', newAuras); 
            }
        }
        //Remove
        if(aurasToRemove.length > 0){
            if(game.settings.get('aurashare', 'DeleteAuras')){
                this.deleteAuras(aurasToRemove, inactiveToken);
            }else{
                this.deactivateAuras(aurasToRemove, inactiveToken);
            }
        }
        return;
    }

    static getAuras(token, getUninheritedAuras){
        //will filter for parent/child auras automatically using the booleon getParentAuras flag:
        let auras = [];
        let auraActor = token.actor;
        //Check to see if the actor has a buff with a flag and then calculate auras. 
        if(auraActor.itemTypes.buff.length > 0){ 
                auras = (auraActor.items?.filter(o => o.system?.flags?.dictionary?.radius >= 0));
                //Auras with a radius greater than 0 share.
        }
        return auras;
    }
    
    static deleteAuras(auras, inactiveToken){
        let inactiveActor = inactiveToken.actor;
        let auraIDsToDelete = [];
        //we're making an array containing aura objects, but only if the name matches an existing aura.
        Promise.all(auras.map(async (aura) => {
            let foundAura = inactiveActor.items.getName(aura.name) ?? inactiveActor.getEmbeddedDocument('Item', aura._id);
            if(foundAura){
                auraIDsToDelete.push(foundAura._id);
            }
        }));
        if(auraIDsToDelete?.length > 0){
            inactiveToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
            //remove the aura documents from the actor
        }
        return;
    }

    static deactivateAuras(auras, inactiveToken){
        //Unchecks the "activate" box, basically.
        let inactiveActor = inactiveToken.actor;
        Promise.all(auras.map(async (aura) => {
            let foundAura = inactiveActor.items?.getName(aura.name);
            if(foundAura){
                foundAura.setActive(false);
            }
        }));
        return;
    }

    static clearAllChildAuras(token){
        let auras = this.getAuras(token, false);
        //child auras only.
        if(auras){
            this.deleteAuras(auras, token);                                               
        }
    }

    static generateChildAura(activeActor, parentAura){
        //Converts aura data into child aura data.
        let newAura = activeActor.getEmbeddedDocument('Item', parentAura._id).toObject();
        // replaces @ references to parent rollData with their current values
        newAura.system.changes.forEach(c => {c.formula = Roll.replaceFormulaData(c.formula, activeActor._rollData)})
        newAura.name = parentAura.name + " (" + activeActor.name + ")";
        newAura.system.identifiedName = parentAura.name + " (" + activeActor.name + ")";
        newAura.system.flags.dictionary.radius = 0;
        newAura.system.active = true;
        newAura.system.buffType = "temp";
        return newAura;
    }

    static validateAura(parentAura, activeToken, activeActor, inactiveToken){
        //check a bunch of conditionas if an aura can be shared
        let shareIfInactive = this.getInactiveShareFlag(parentAura);
        let correctDisposition = this.validateDisposition(activeToken, inactiveToken, parentAura) ?? true;
        return ((parentAura.system.active || shareIfInactive) && this.validateLifeform(activeActor, parentAura) && correctDisposition);
    }

    static validateDisposition(activeToken, inactiveToken, aura){
        //Checks if the aura can be shared based on flags and disposition.
        let activeTokenDisposition = activeToken.disposition;
        let inactiveTokenDisposition = inactiveToken.disposition;
        let hostileAura = aura.hasItemBooleanFlag('shareEnemies');
        //Everyone
        if(aura.hasItemBooleanFlag('shareAll')){
            return true;
        }
        //Neutral
        if(aura.hasItemBooleanFlag('shareNeutral') && inactiveTokenDisposition == 0){
            return true;
        }
        //Enemies
        if(hostileAura){
            if(activeTokenDisposition == (inactiveTokenDisposition * -1)){
                return true;
            }
        }
        //Allies
        else{
            if(activeTokenDisposition == inactiveTokenDisposition){
                return true;
            }
        }
        return false;
    }

    static validateLifeform(actor, aura){
        //Bzzztttt check the scanner. Detect lifeforms... bzzzt.
        let allowUnconsciousAuras = game.settings.get('aurashare', 'UnconsciousAuras');
        let shareThreshold = 1;
        if(game.settings.get('aurashare', 'ShareZero')){
            shareThreshold = 0;
            //if they have 0 HP we will share the aura if this flag is on.
        }
        if(aura?.hasItemBooleanFlag('shareUnconscious')){
            return true;
        }
        if (allowUnconsciousAuras){
            return true;
        }
        let hp = actor.system.attributes.hp.value;
        if(hp >= shareThreshold || this.dieHardCheck(actor)){
            return true;
        }
        return false;
    }

    static getInactiveShareFlag(aura){
        //Check if an inactive aura should be shared.
        if(aura.hasItemBooleanFlag('shareInactive')){
           return true;
        }
        return false;
    }

    static dieHardCheck(actor){
        let diehardEnabled = game.settings.get('aurashare', 'Diehard');
        let hasDiehardKey = actor.items.find(o => o.flags?.core?.sourceId === "Compendium.pf1.feats.O0e0UCim27GPKFuW");
        if((actor.items.getName('Diehard') || hasDiehardKey) && diehardEnabled){
            return true;
        }
        return false;
    }

}