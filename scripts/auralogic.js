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

    static async refreshAuras(parentToken, childTokens, deleteOnly){
        //Main loop to reresh auras on all tokens relative to the parent token.
        let giveAuras = await this.getAuras(parentToken, true);
        Promise.all(childTokens.map(async (childToken) => {
            if(childToken?.id != parentToken?.id){
                let receiveAuras = this.getAuras(childToken, true);
                if(giveAuras?.length > 0){
                    if(deleteOnly){
                        //this flag is meant for when a token is deleted or dies.
                        await this.clearSingleAuraSet(parentToken, giveAuras, childToken);
                    }else{
                        this.applyActorAuras(parentToken, giveAuras, childToken);
                        //PARENT  ->   CHILD
                    }
                }
                if(receiveAuras?.length > 0){
                    this.applyActorAuras(childToken, receiveAuras, parentToken);
                    //CHILD   ->   PARENT
                }
            }
        }))
        return;
    }
    
    static async applyActorAuras(parentToken, parentAuras, childToken){
        //Secondary loop to apply all auras from a parent to a child.
        let distance = canvas.grid.measureDistance(childToken, parentToken); 
        let aurasToAdd = [];
        let aurasToRemove = [];
        let parentActor = parentToken.getActor();
        if(parentAuras?.length > 0 && distance != undefined){
            Promise.all(parentAuras.map(async (parentAura) => {
                let newAura = this.generateChildAura(parentActor, parentAura);
                if(this.validateLifeform(parentActor) && this.validateAura(parentAura, distance, parentToken, parentActor, childToken)){
                    //Is the actor alive, or do they have the diehard feat? And is the aura even in range and valid?
                    aurasToAdd.push(newAura);
                }else{
                    //If not we can remove the aura.
                    aurasToRemove.push(newAura);
                }
            }));
        }
        if(aurasToAdd.length > 0){
            this.addAuras(aurasToAdd, childToken);
        }
        if(aurasToRemove.length > 0){
            if(game.settings.get('aurashare', 'DeleteAuras')){
                //Toggles delete and remove
                this.deleteAuras(aurasToRemove, childToken);
            }else{
                this.deactivateAuras(aurasToRemove, childToken);
            }
        }
        return;
    }

    static getAuras(token, getParentAuras){
        //will filter for parent/child auras automatically using the booleon getParentAuras flag:
        let auraActor = token.getActor();
        let auras = [];
        if(getParentAuras == true){
            auras = (auraActor.items?.filter(o => o.system?.flags?.dictionary?.radius > 0));
            //Auras with a radius greater than 0 share.
        }else{
            auras = (auraActor.items?.filter(o => o.system?.flags?.dictionary?.radius === 0)); 
            //likewise auras with a radius of 0 do not share.
        }
        return auras;
    }

    static async clearSingleAuraSet(parentToken, parentAuras, childToken){
        let aurasToRemove = [];
        if(parentAuras?.length > 0 ){
            //push all auras to an array:
            Promise.all(parentAuras.map(async (parentAura) => {
                let parentActor = parentToken.getActor();
                let newAura = this.generateChildAura(parentActor, parentAura);
                aurasToRemove.push(newAura);
            }));
        }
        if(aurasToRemove.length > 0){
            if(game.settings.get('aurashare', 'DeleteAuras')){
                //deletes or deactives
                this.deleteAuras(aurasToRemove, childToken);
            }else{
                this.deactivateAuras(aurasToRemove, childToken);
            }
        }
        return;
    }

    static async addAuras(auras, childToken){  
        let aurasToAdd = [];
        let childActor = childToken.getActor();
        Promise.all(auras.map(async (aura) => {
            let foundAura = childActor.items?.getName(aura.name); 
            if(!foundAura){
                aurasToAdd.push(aura);
            }else                       
            {
                foundAura.setActive(true);                         
            }
        }));
        if(aurasToAdd?.length > 0){
            childToken.actor.createEmbeddedDocuments('Item', aurasToAdd); 
        }
        return;
    }

    static async deleteAuras(auras, childToken){
        let childActor = childToken.getActor();
        let auraIDsToDelete = [];
        //we're making an array containing aura objects, but only if the name matches an existing aura.
        Promise.all(auras.map(async (aura) => {
            let foundAura = childActor.items.getName(aura.name) ?? childActor.getEmbeddedDocument('Item', aura._id);
            if(foundAura){
                auraIDsToDelete.push(foundAura._id);
            }
        }));
        if(auraIDsToDelete?.length > 0){
            childToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
            //remove the aura documents from the actor
        }
        return;
    }

    static async deactivateAuras(auras, childToken){
        //Unchecks the "activate" box, basically.
        let childActor = childToken.getActor();
        Promise.all(auras.map(async (aura) => {
            let foundAura = childActor.items?.getName(aura.name);
            if(foundAura){
                foundAura.setActive(false);
            }
        }));
        return;
    }

    static async clearAllChildAuras(token){
        let auras = this.getAuras(token, false);
        //child auras only.
        if(auras){
            await this.deleteAuras(auras, token);                                               
        }
    }

    static generateChildAura(parentActor, parentAura){
        //Converts aura data into child aura data.
        let newAura = parentActor.getEmbeddedDocument('Item', parentAura._id).toObject();
        newAura.name = parentAura.name + " (" + parentActor.name + ")";
        newAura.system.identifiedName = parentAura.name + " (" + parentActor.name + ")";
        newAura.system.flags.dictionary.radius = 0;
        newAura.system.active = true;
        newAura.system.buffType = "temp";
        return newAura;
    }

    static validateAura(parentAura, distance, parentToken, parentActor, childToken){
        //check a bunch of conditionas if an aura can be shared
        let radius = parentAura.getItemDictionaryFlag('radius');
        let inRange = (distance <= radius);
        let shareIfInactive = this.getInactiveShareFlag(parentAura);
        let correctDisposition = this.validateDisposition(parentToken, childToken, parentAura) ?? true;
        return ((parentAura.system.active || shareIfInactive) && inRange && this.validateLifeform(parentActor, parentAura) && correctDisposition);
    }

    static validateDisposition(parentToken, childToken, aura){
        //Checks if the aura can be shared based on flags and disposition.
        let parentTokenDisposition = parentToken.disposition;
        let childTokenDisposition = childToken.disposition;
        let hostileAura = aura.hasItemBooleanFlag('shareEnemies');
        //Everyone
        if(aura.hasItemBooleanFlag('shareAll')){
            return true;
        }
        //Neutral
        if(aura.hasItemBooleanFlag('shareNeutral') && childTokenDisposition == 0){
            return true;
        }
        //Enemies
        if(hostileAura){
            if(parentTokenDisposition == (childTokenDisposition * -1)){
                return true;
            }
        }
        //Allies
        else{
            if(parentTokenDisposition == childTokenDisposition){
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