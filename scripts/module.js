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
       
function GetActorAuras(auraActor, getParentAuras){
    //will filter for parent/child auras automatically using the booleon getParentAuras flag.
    let auras = [];
    if(getParentAuras == true){
        auras = (auraActor.items.filter(o => o.system.flags.dictionary.radius > 0));
        //Auras with a radius greater than 0 share.
    }else{
        auras = (auraActor.items.filter(o => o.system.flags.dictionary.radius === 0)); 
        //likewise auras with a radius of 0 do not share.
    }
    return auras ?? null;
}

function GetInactiveShareFlag(aura){
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


 function AddAura(aura, childToken){
    let filteredChildAuras = childToken.actor.items.filter(o => o.system.identifiedName == aura.system.identifiedName);
    //just double check that the aura isn't present.
    if(filteredChildAuras.length == 0){
         childToken.actor.createEmbeddedDocuments('Item', aura);
        //This is where the aura is granted.
    }
    return;
}

 function RemoveAura(undesiredAura, childToken){
    let childAuras = GetActorAuras(childToken.actor, false);
    let auraIDsToDelete = [];
    //we're making an array containing aura objects, but only if the name matches an existing aura. It'll be 0-1 length array. deleteEmbeddedDocuments expects an array.
    childAuras.forEach(childAura => {
            if(undesiredAura.name === childAura.system.identifiedName){
                if (childToken.actor.getEmbeddedDocument('Item', childAura.id)){
                    auraIDsToDelete.push(childAura.id);
                }
            };
    });
    if(auraIDsToDelete?.length > 0){
        let activeEffects = (childToken.actor.effects.filter(o => o.label == undesiredAura.name));
        let effectsToDelete = activeEffects.map(a => a.id);
        //childToken.actor.deleteEmbeddedDocuments("ActiveEffect", effectsToDelete);
        childToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
        //remove the aura documents from the actor
    }
    return;
}

 function ApplyActorAuras(parentToken, childToken){
    let distance = canvas.grid.measureDistance(childToken, parentToken); 
    let parentAuras = GetActorAuras(parentToken.actor, true);
    //Grabs the parent auras of the token that just moved
    if(parentAuras?.length > 0 && distance != undefined){
        parentAuras.forEach( parentAura => {
            //Create Aura Copy//
            let newAura = parentToken.actor.items.getName(parentAura.name).toObject();
            newAura.name = parentAura.name + " (" + parentToken.name + ")";
            newAura.system.identifiedName = parentAura.name + " (" + parentToken.name + ")";
            newAura.system.flags.dictionary.radius = 0;
            newAura.system.active = true;
            newAura._id = randomID();
            //we grabbed the aura, added the parents (name) to it, set the radius to 0 (necessary), and told the system that it will be active when applied.
            let radius = parentAura.getItemDictionaryFlag('radius');
            let inRange = (distance <= radius);
            let shareIfInactive = GetInactiveShareFlag(parentAura);
            let canShareAura = CanShareAura(parentToken, childToken, parentAura) ?? true;
            let validateAura = ((parentAura.system.active === true || shareIfInactive) && inRange === true  && !IsUnconcious(parentToken.actor) && canShareAura);
            //if the buff has a radius but the distance is greater.
            if(validateAura){
                 AddAura(newAura, childToken);
            }else{
                 RemoveAura(newAura, childToken);
            }
        });
    }
    return;
}

function refreshAuras(activeToken){
    let passiveTokens = canvas.tokens.placeables;
    passiveTokens.forEach(passiveToken => {
        if(passiveToken.name != activeToken.name){
            if(GetActorAuras(passiveToken.actor, true)){
                ApplyActorAuras(passiveToken, activeToken);
                //Main token moved, let's see if it lost anyone's auras.
            }
            ApplyActorAuras(activeToken, passiveToken);
        }
    });
    return;
}

function CanShareAura(parentToken, childToken, aura){
    //verifies that the aura is set to apply to allies, or else if enemies verifies that target is an enemy.
    let parentTokenDisposition = parentToken.document?.disposition ?? parentToken.disposition
    let childTokenDisposition = childToken.document?.disposition ?? childToken.disposition
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


function IsUnconcious(actor){
    let health = actor.system.attributes.hp.value;
    if(health < 1){
        return true;
    }
    return false;
}

function DebuffAllies(parentActor){
    let parentAuras = GetActorAuras(parentActor, true);
    let childTokens = canvas.tokens.placeables;
    if(parentAuras?.length > 0){
        let targetAuras = [];
        parentAuras.forEach(parentAura => {
            let newAura = parentActor.items.getName(parentAura.name).toObject();
            newAura.name = parentAura.name + " (" + parentActor.name + ")";
            newAura.system.identifiedName = parentAura.name + " (" + parentActor.name + ")";
            targetAuras.push(newAura);
        });
        childTokens.forEach(childToken => {
            if(childToken.actor.name != parentActor.name){
                targetAuras.forEach(targetAura => {
                    RemoveAura(targetAura, childToken);
                });
            }
        });
    }
    return;
}

const shouldHandle = () => {
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


Hooks.on('updateToken', (token, update, _options, _userId) => {
    if(shouldHandle() && (update?.hasOwnProperty('x') || update?.hasOwnProperty('y'))){
        refreshAuras(token);
    }
    return;
});

/*
Hooks.on('destroyToken', (PlaceableObject) =>{
    if(shouldHandle()){
        refreshAuras(PlaceableObject);
    }    
});
*/

Hooks.on('pf1.toggleActorBuff',  (actor, itemData) =>{
    let tokens = actor?.getActiveTokens();
    if(tokens && shouldHandle() && itemData.getItemDictionaryFlag('radius') > 0){
        refreshAuras(tokens[0]);
    }
})


/*
Hooks.on('sightRefresh',  (canvas)=>{
    if(shouldHandle()){
        ApplyAllAuras();
    }
});
*/