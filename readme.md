![image](https://i.imgur.com/K82oBFy.png)

  <br>
<strong>This is for: Pathfinder 1E</strong>  <br>

---

Pathfinder Aura Share: Automates the sharing of buffs between tokens. This makes handling auras easier. The conditions for automating the auras are listed in the notes below. (It's pretty simple)  <br>
  <br>
If you enjoy this mod feel free to tip! <br>
https://ko-fi.com/cactuarcrunch  <br>
  <br>
  <br>
Manifest URL: https://github.com/FionaBrightgrass/Aura-Share/raw/main/module.json  <br>
  <br>
  
---
  
<strong>Steps:</strong>  <br>
Create the following:  <br>
-Item Type: Buff  <br>
-Dictionary Flag: "radius" & value > 0  <br>
<em>....the buff  now auto shares</em>  <br>
Optional:  <br>
-Boolean Flag: "shareInactive"    <em>share the buff even if it is toggled off. Great for buffs that only impact allies.</em>  <br>
-Boolean Flag: "shareEnemies"     <em>share the aura with enemies (instead of allies). Typically combined with shareInactive.</em>  <br>
-Boolean Flag: "shareNeutral"     <em>share the aura with targets with neutral disposition.</em>  <br>
-Boolean Flag: "shareAll"         <em>share with everyone regardless of disposition.</em>  <br>    <br>

![image](https://i.imgur.com/zRj6ITb.png)
  <br>

---

  <br>
<strong>Details</strong>  <br>
Add a buff to a PF1E actor. Name it whatever you'd like.  <br>
  <br>
Give the buff/aura a Dictionary Flag of "radius" with a value greater than 0.  <br>
  <br>
It will auto copy to other tokens except with:  <br>
The new buff name becomes: Aura Name (Source Actor's Name)  <br>
"radius" is set to 0 on the recipient   <br>
  <br>
optional: Give the aura a Boolean Flag of shareInactive to allow sharing of disabled auras.   <br>
optional: Give the aura a Boolean Flag of shareEnemies to target enemies instead of allies. Combine this with shareInactive for enemies only.   <br>
optional: Give the aura a Boolean Flag of shareNeutral to share with neutral tokens.   <br>
optional: Give the aura a Boolean Flag of shareAll to share with everyone.   <br>
optional: Give an actor the Diehard feat to share when HP is below 0. (Toggle in options)   <br>
  <br>

---

  <br>
<strong>Conditions for Applying Auras</strong>  <br>
Adds the buff to allies if:  <br>
-The source actor has a buff with a radius > 0.  <br>
-The buff is enabled, OR if the source actor's buff has the "shareInactive" Boolean flag.  <br>
  <br>
Adds the buff to allies when:  <br>
-They enter range (either actor can move).  <br>
-The buff is toggled on.  <br>
-A Token is created in the scene, and allies are in range.  <br>
-The aura actor's HP rises above 0.  <br>
  <br>
Adds the buff to enemies if:  <br>
-The buff also has a "shareEnemies" Boolean Flag. Note: You typically would combine this with "shareInactive" so that the buff doesn't hurt the source actor.  <br>
   <br>
Adds the Buff when:  <br>
-A new buff has a radius set to > 0 and the token moves or the buff is toggled. Best to create it on the actor then add to scene.  <br>
-The buff is toggled on.  <br>
-A token with an aura buff is added to the scene. (radius > 0)  <br>
-The actor's HP increases over 0, and the actor was previously dead.  <br>
-An actor moves into range of the buff.  <br>
  <br>
Deactives the buff when:  <br>
-The source moves out of range.  <br>
-The recipient moves out of range.  <br>
-The source disables the buff, and the buff does not have the "alliesOnly" Boolean Flag  <br>
-The source's HP falls below zero, unless: It has the Diehard feat -OR- Unconscious Auras is toggled OFF in the menus.  <br>
  <br>
Removes the buff when:  <br>
-the source is deleted.  <br>
  <br>


---

  <br>
<strong>Updates</strong>  <br>
(v1.5.0)  Most stuff runs async now. Auras don't "delete" off of sheets, they just toggle inactive now. (performance reasons.)  <br>
(v1.3.2)  Actors with an item, buff, etc named "Diehard" will now continue to share their auras when below 0 HP.  <br>
(v1.3.1)  Delete Token, Create Token are now working. Deleting a token removes inherited buffs. Tokens hitting negative HP now triggers immediately.  <br>
(v1.2.7)  Delete Token hooks have once again been disabled. They were causing a bug with stacking buff icons.  <br>
(v1.2.0)  Using the shareEnemies Boolean Flag on an aura will switch it to only impact enemies.*   <br>
          *Combine this with ShareInactive or it will still impact the original token.  <br>
(v1.0.10) Code cleanup to improve readability and speed up processing of auras.  <br>
  <br>

---

  <br>
<strong>Future Updates:</strong>  <br>
-To Fix: Renaming an aura will not remove the old buff from a token. Rename auras on the character sheet before the token is placed on the scene.
