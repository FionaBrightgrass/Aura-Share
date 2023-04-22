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
// This macro should be run once foundry loads a scene.
// It will basically add these steps into the game right after sightRefresh.
// Tokens refresh sight at the end of movement by default, so this reduces how often it fires. There's likely a better hook.
// Unconcious tokens do not give buffs
// When a token faints all buffs it offers are removed.

    function GetActorAuras(auraActor, getParentAuras){
        let auras = [];
        if(getParentAuras == true){
            auras = (auraActor.items.filter(o => o.system.flags.dictionary.radius > 0));
            //Auras with a radius greater than 0 share automatically.
        }else{
            auras = (auraActor.items.filter(o => o.system.flags.dictionary.radius == 0)); 
            //likewise auras with a radius of 0 do not share.
        }
        return auras;
    }

    function ApplyActorAuras(parentToken, childToken){
        let distance = Math.ceil(canvas.grid.measureDistance(childToken, parentToken));
        let parentAuras = GetActorAuras(parentToken.actor, true);
        //Grabs the parent auras of the token that just moved
        if(parentAuras != null && parentAuras != 'undefined' && parentAuras != 'none'){
            parentAuras.forEach(parentAura => {
                let childAuras = GetActorAuras(childToken.actor, false);
                let newAura = parentAura.actor.items.getName(parentAura.name).toObject();
                newAura.name = parentAura.name + " (" + parentToken.name + ")";
                newAura.system.identifiedName = parentAura.name + " (" + parentToken.name + ")";
                newAura.system.flags.dictionary.radius = 0;
                newAura.system.active = true;
                //we grabbed the aura, added the parents (name) to it, set the radius to 0 (necessary), and told the system that it will be active when applied.
                let radius = parentAura.system.flags.dictionary.radius;
                let deletePassiveAuras = [];
                if(radius != null && radius != 'undefined' && distance > radius){
                    let auraIDsToDelete = [];
                    //we're making an array containing aura objects, but only if the name matches
                    childAuras.forEach(childAura => {
                        if(newAura.name == childAura.system.identifiedName){
                            auraIDsToDelete.push(childAura.id);
                        };
                    })
                    if(auraIDsToDelete != 'undefined' && auraIDsToDelete != null){
                        childToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
                        //remove the aura document
                    }
                }
                    //If a token is in range, add the aura:
                if(radius != null && radius != 'undefined' && distance <= radius && !IsUnconcious(parentToken.actor)){
                    filteredChildAuras = childToken.actor.items.filter(o => o.system.identifiedName == newAura.system.identifiedName);
                    if(filteredChildAuras.length == 0){
                        childToken.actor.createEmbeddedDocuments('Item', newAura);
                        //This is where the aura is granted.
                    }
                }
            });
        }
        return;
    }

    function ApplyAllAuras(){
        let activeToken = canvas.tokens.controlled[0];
        let activeTokenDisposition = activeToken.document.disposition;
        let passiveTokens = canvas.tokens.placeables;
        passiveTokens.forEach(passiveToken => {
            if(passiveToken.actor.data.name != activeToken.actor.data.name){
                //We also don't want the actor to give his buffs to himself.
                let passiveTokenDisposition = passiveToken.document.disposition;
                if(passiveTokenDisposition == activeTokenDisposition){
                        //I know its not real Disposition
                        ApplyActorAuras(activeToken, passiveToken);
                        //Token that moved -> Every ally around them.
                        ApplyActorAuras(passiveToken, activeToken);
                        //Every ally -> token to moved.
                }
            }
            if(IsUnconcious(passiveToken.actor)){
                DebuffAllies(passiveToken.actor);
            }
            //We want to remove all buffs from sleepy heads.
        });
        if(IsUnconcious(activeToken.actor)){
            DebuffAllies(activeToken.actor);
        }
        //If they're unconcious let's strip the buffs. Just to be safe. There may be a more optimal way of doing this.
    }

    function IsUnconcious(actor){
        let hp = actor.system.attributes.hp.value;
        if(hp < 1){
            return true;
        }
        return false;
    }

    function DebuffAllies(parentActor){
        let parentAuras = GetActorAuras(parentActor, true);
        if(parentAuras != 'none' && parentAuras != 'undefined' && parentAuras != null){
            let childTokens = canvas.tokens.placeables;
            let targetAuraNames = [];
            parentAuras.forEach(parentAura => {
                targetAuraNames.push(parentAura.system.identifiedName + " (" + parentActor.name + ")");
            });
            //basically, we just made an array of auras in the name format that will match the child tokens. We're targetting auras of those names for deletion.
            childTokens.forEach(childToken => {
                let childAuras = GetActorAuras(childToken.actor, false);
                let auraIDsToDelete = [];
                //we're making an array containing aura objects, but only if the name matches
                childAuras.forEach(childAura => {
                    if(targetAuraNames.includes(childAura.system.identifiedName)){
                        auraIDsToDelete.push(childAura.id);
                    };
                })
                if(auraIDsToDelete != 'undefined' && auraIDsToDelete != null){
                    childToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
                    //remove the aura document
                }
            });
        }
    }

Hooks.on('updateActor', (actor) =>{
    //This one should be obvious but it fires when an actor updates but specifically checks if they hit 0 HP.
    if(PathfinderAuraShare.IsUnconcious(actor)){
        PathfinderAuraShare.DebuffAllies(actor);
    }
});

Hooks.on('sightRefresh',(canvas)=>{
    //Hook into site being updated when a token finishes moving.
    PathfinderAuraShare.ApplyAllAuras();
});