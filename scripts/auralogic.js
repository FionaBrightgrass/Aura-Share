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
// (You can find the dictionary flags when you edit the buff in the buffs tab of a character sheet)
// Adding a Boolean Flag of "shareInactive" causes auras to share even if toggled off (for buggs that don't affect self)
// It will basically add these steps into the game right after sightRefresh.
// Tokens refresh sight at the end of movement by default, so this reduces how often it fires. There's likely a better hook.
// Unconcious tokens do not give buffs
// When a token faints all buffs it offers are removed.

export class AuraLogic{
    static GetAuras(token, getParentAuras){
        //will filter for parent/child auras automatically using the booleon getParentAuras flag.;
        let auraActor = token.getActor();
        let auras = [];
        if(getParentAuras == true){
            auras = (auraActor.items?.filter(o => o.system?.flags?.dictionary?.radius > 0));
            //Auras with a radius greater than 0 share.
        }else{
            auras = (auraActor.items?.filter(o => o.system?.flags?.dictionary?.radius === 0)); 
            //likewise auras with a radius of 0 do not share.
        }
        return auras ?? null;
    }

    static AddAuras(auras, childToken){
        let aurasToAdd = [];
        let childActor = childToken.getActor();
        //we're making an array containing aura objects, but only if the aura doesn't exist in the actor's collection.
        auras.forEach(aura => {
            if(!childActor.items.getName(aura.name)){
                aurasToAdd.push(aura);
            }
        });
        if(aurasToAdd?.length > 0){
            childToken.actor.createEmbeddedDocuments('Item', aurasToAdd);
            //This is where the aura is granted.
        }
        return;
    }

    static RemoveAuras(auras, childToken){
        let childActor = childToken.getActor();
        let auraIDsToDelete = [];
        //we're making an array containing aura objects, but only if the name matches an existing aura.
        auras.forEach(aura => {
            let foundAura = childActor.items.getName(aura.name)
            if(foundAura){
                auraIDsToDelete.push(foundAura._id);
            }
        });
        if(auraIDsToDelete?.length > 0){
            childToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
            auraIDsToDelete.forEach(auraID => {
                game.items.delete(auraID);
            });
            //remove the aura documents from the actor
        }
        return;
    }
    
    static clearSingleAuraSet(parentToken, childToken){
        let parentAuras = this.GetAuras(parentToken, true);
        let aurasToRemove = [];
        if(parentAuras?.length > 0 ){
            parentAuras.forEach( parentAura => {
                //Create Aura Copy//
                let parentActor = parentToken.getActor();
                let newAura = parentActor.items.getName(parentAura.name).toObject();
                newAura.name = parentAura.name + " (" + parentToken.name + ")";
                newAura.system.identifiedName = parentAura.name + " (" + parentToken.name + ")";
                newAura.system.flags.dictionary.radius = 0;
                newAura.system.active = true;
                newAura.id = parentAura.id;
                aurasToRemove.push(newAura);
            });
        }
        if(aurasToRemove.length > 0){
            this.RemoveAuras(aurasToRemove, childToken);
        }
        return;
    }

    static clearAllChildAuras(token){
        let auras = this.GetAuras(token, false);
        if(auras){
            this.RemoveAuras(auras, token);
        }
    }

    static ApplyActorAuras(parentToken, childToken){
        let distance = canvas.grid.measureDistance(childToken, parentToken); 
        let parentAuras = this.GetAuras(parentToken, true);
        let aurasToAdd = [];
        let aurasToRemove = [];
        //Grabs the parent auras of the token that just moved
        if(parentAuras?.length > 0 && distance != undefined){
            parentAuras.forEach( parentAura => {
                //Create Aura Copy//
                let parentActor = parentToken.getActor();
                let newAura = parentActor.items.getName(parentAura.name).toObject();
                newAura.name = parentAura.name + " (" + parentToken.name + ")";
                newAura.system.identifiedName = parentAura.name + " (" + parentToken.name + ")";
                newAura.system.flags.dictionary.radius = 0;
                newAura.system.active = true;
                newAura.id = parentAura.id;
                //we grabbed the aura, added the parents (name) to it, set the radius to 0 (necessary), and told the system that it will be active when applied.
                let radius = parentAura.getItemDictionaryFlag('radius');
                let inRange = (distance <= radius);
                let shareIfInactive = this.GetInactiveShareFlag(parentAura);
                let canShareAura = this.CanShareAura(parentToken, childToken, parentAura) ?? true;
                let validateAura = ((parentAura.system.active || shareIfInactive) && inRange && !this.IsUnconscious(parentActor) && canShareAura);
                //if the buff has a radius but the distance is greater.
                if(validateAura){
                    aurasToAdd.push(newAura);
                }else{
                    aurasToRemove.push(newAura);
                }
            });
        }
        if(aurasToAdd.length > 0){
            this.AddAuras(aurasToAdd, childToken);
        }
        if(aurasToRemove.length > 0){
            this.RemoveAuras(aurasToRemove, childToken);
        }
        return;
    }

    static refreshAuras(activeToken, passiveTokens, deleteOnly){
        passiveTokens.forEach(passiveToken => {
            if(passiveToken?.id != activeToken?.id){
                if(!deleteOnly){
                    if(this.GetAuras(passiveToken, true)){
                        this.ApplyActorAuras(passiveToken, activeToken);
                        //Main token moved, let's see if it lost anyone's auras.
                    }
                    if(this.GetAuras(passiveToken, true)){
                        this.ApplyActorAuras(activeToken, passiveToken);
                    }
                }
                else{
                    this.clearSingleAuraSet(activeToken, passiveToken);
                }

            }
        });
        return;
    }

    static CanShareAura(parentToken, childToken, aura){
        //verifies that the aura is set to apply to allies, or else if enemies verifies that target is an enemy.
        let parentTokenDisposition = parentToken.disposition;
        let childTokenDisposition = childToken.disposition;
        let hostileAura = aura.hasItemBooleanFlag('shareEnemies');
        if(hostileAura){
            if(parentTokenDisposition == (childTokenDisposition * -1)){
                return true;
            }
        }
        else{
            if(parentTokenDisposition == childTokenDisposition){
                return true;
            }
        }
        return false;
    }

    static GetInactiveShareFlag(aura){
        //this is mainly a cleanup script for old methods.
        let shareAura = false;
        if(aura.getItemDictionaryFlag("shareInactive") == "true"){
            if(!aura.hasItemBooleanFlag('shareInactive')){
                aura.addItemBooleanFlag('shareInactive');
            }
            aura.removeItemDictionaryFlag('shareInactive');
            shareAura = true;
        }
        if(aura.getItemDictionaryFlag("alliesOnly") == "true"){
            if(!aura.hasItemBooleanFlag('shareInactive')){
                aura.addItemBooleanFlag('shareInactive');
            }
            aura.removeItemDictionaryFlag('alliesOnly');
            shareAura = true;
        }
        if(aura.hasItemBooleanFlag('shareInactive')){
            shareAura = true;
        }
        //we're running a repair on old methodology.
        return shareAura;
    }


    static IsUnconscious(actor){
        let unconsciousAuras = game.settings.get('aurashare', 'UnconsciousAuras');
        if (unconsciousAuras){
            return false;
        }
        let health = actor.system.attributes.hp.value;
        if(health < 1 && !this.dieHardCheck(actor)){
            return true;
        }
        return false;
    }

    static dieHardCheck(actor){
        let diehardEnabled = game.settings.get('aurashare', 'Diehard');
        if(actor.items.getName('Diehard') && diehardEnabled){
            return true;
        }
        else{
            return false;
        }
    }

    static shouldHandle = () => {
        const activeGMs = [...game.users]
            .filter(u => u.active && u.isGM)
            .sort((x, y) => {
                if (x.isGM === y.isGM) {
                    const idCompare = x.id > y.id ? 1 : -1;
                    return idCompare;
                }

                if (x.isGM) {
                    return 1;
                }

                return -1;
            });
        return activeGMs[0] === game.user;
    }


}