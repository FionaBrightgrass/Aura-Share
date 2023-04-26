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
    let auras = [];
    if(getParentAuras == true){
        auras = (auraActor.items.filter(o => o.system.flags.dictionary.radius > 0));
        //Auras with a radius greater than 0 share automatically.
    }else{
        auras = (auraActor.items.filter(o => o.system.flags.dictionary.radius === 0)); 
        //likewise auras with a radius of 0 do not share.
    }
    return auras;
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

async function RemoveAura(undesiredAura, childToken){
    let childAuras = GetActorAuras(childToken.actor, false);
    let auraIDsToDelete = [];
    //we're making an array containing aura objects, but only if the name matches an existing aura. It'll be 0-1 length array. deleteEmbeddedDocuments expects an array.
    childAuras.forEach(childAura => {
            if(undesiredAura.name == childAura.system.identifiedName){
                if (childToken.actor.getEmbeddedDocument('Item', childAura.id)){
                    auraIDsToDelete.push(childAura.id);
                }
            };
    });
    if(auraIDsToDelete != 'undefined' && auraIDsToDelete != null && auraIDsToDelete.length > 0){
        childToken.actor.deleteEmbeddedDocuments('Item', auraIDsToDelete);
        //remove the aura documents from the actor
    }
    return;
}

async function ApplyActorAuras(parentToken, childToken){
    let distance = canvas.grid.measureDistance(childToken, parentToken); //adding 0.1 prevent foundry from trying to double delete an entry when moving the token from the radius edge to outside.
    let parentAuras = GetActorAuras(parentToken.actor, true);
    //Grabs the parent auras of the token that just moved
    if(parentAuras != null && parentAuras != 'undefined' && parentAuras != 'none'){
        parentAuras.forEach(async parentAura => {
            //Create Aura Copy//
            let newAura = parentToken.actor.items.getName(parentAura.name).toObject();
            newAura.name = parentAura.name + " (" + parentToken.name + ")";
            newAura.system.identifiedName = parentAura.name + " (" + parentToken.name + ")";
            newAura.system.flags.dictionary.radius = 0;
            newAura.system.active = true;
            //we grabbed the aura, added the parents (name) to it, set the radius to 0 (necessary), and told the system that it will be active when applied.
            let radius = parentAura.getItemDictionaryFlag('radius');
            let inRange = ((radius != null) && (radius != 'undefined') && (distance <= radius));
            let shareIfInactive = GetInactiveShareFlag(parentAura);
            let validateAura = ((parentAura.system.active || shareIfInactive) && inRange && !IsUnconcious(parentToken.actor));
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

async function ApplyAllAuras(){
    let activeTokens = canvas.tokens.placeables;
    activeTokens.forEach(async activeToken => {
        let activeTokenDisposition = activeToken.document.disposition;
        let passiveTokens = canvas.tokens.placeables;
        passiveTokens.forEach(passiveToken => {
            if(passiveToken.actor.data.name != activeToken.actor.data.name && passiveToken.document != 'undefined'){
                //We also don't want the actor to give his buffs to himself.
                let passiveTokenDisposition = passiveToken.document.disposition;
                if(passiveTokenDisposition == activeTokenDisposition){
                        ApplyActorAuras(activeToken, passiveToken);
                        //Token -> Every ally around them.
                }
            }
        });
    });
    //If they're unconcious let's strip the buffs. Just to be safe. There may be a more optimal way of doing this.
    return;
}

function IsUnconcious(actor){
    let health = actor.system.attributes.hp.value;
    if(health < 1){
        return true;
    }
    return false;
}

async function DebuffAllies(parentActor){
    let parentAuras = GetActorAuras(parentActor, true);
    if(parentAuras != 'none' && parentAuras != 'undefined' && parentAuras != null){
        let childTokens = canvas.tokens.placeables;
        let targetAuras = [];
        parentAuras.forEach(async parentAura => {
            let newAura = parentActor.items.getName(parentAura.name).toObject();
            newAura.name = parentAura.name + " (" + parentActor.name + ")";
            newAura.system.identifiedName = parentAura.name + " (" + parentActor.name + ")";
            targetAuras.push(newAura);
        });
        //basically, we just made an array of auras in the name format that will match the child tokens. We're targetting auras of those names for deletion.
        childTokens.forEach(async childToken => {
            if(childToken.actor.name != parentActor.name){
                targetAuras.forEach(async targetAura => {
                    RemoveAura(targetAura, childToken);
                });
            }
        });
    }
    return;
}

Hooks.on('destroyToken', (PlaceableObject) =>{
    DebuffAllies(PlaceableObject.actor);
});

Hooks.on('updateActor', (actor) =>{
    ApplyAllAuras();
});

Hooks.on('sightRefresh',(canvas)=>{
    //Hook into site being updated when a token finishes moving.
    ApplyAllAuras();
});


//I have no idea what the consequences of this will be, but it prevents errors from being thrown when a document is deleted but doesn't have any deletion method defined.
//It prevents some error spam BS.
Hooks.on('preDeleteItem', (Document) =>{
    console.log(Document);
    if(Document._onDelete == undefined || Document._onDelete == 'undefined'){
        return;
    }
});
