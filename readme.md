![image](https://i.imgur.com/Up1jqTJ.png)

  <br>
<strong>This mod is presently compatible with: Pathfinder 1e</strong>  <br>



Pathfinder Aura Share: Automates the sharing of buffs between tokens. This makes handling auras easier. The conditions for automating the auras are listed in the notes below. (It's pretty simple)  <br>
  <br>
If you enjoy this mod feel free to tip! <br>
https://ko-fi.com/cactuarcrunch  <br>
  <br>
  <br>
Manifest URL: https://github.com/FionaBrightgrass/Aura-Share/raw/main/module.json  <br>
  <br>
  <br>
## Instructions: <br>
Create the a buff with the dictionary flag: "radius" with a value greater than 0. <br>
<em>....the buff  now auto shares</em>  <br>  <br>
<strong>Optional:</strong>  <br>
- Boolean Flag: <font color="#AAFFAA">shareInactive    <em>shares the buff even if it is toggled off. Great for buffs that only impact allies.</em>  <br>
- Boolean Flag: shareEnemies     <em>shares the buff with enemies (instead of allies). Typically combined with shareInactive.</em>  <br>
- Boolean Flag: shareNeutral     <em>shares the buff with targets with neutral disposition.</em>  <br>
- Boolean Flag: shareAll         <em>shares the buff with everyone regardless of disposition.</em>  <br>
- Boolean Flag: shareUnconscious <em>shares the buff even if you're unconscious. (This works like the Diehard feat, but allows DMs more control over individual auras.)</em>  
  <br>
Example:  <br>
![image](https://i.imgur.com/zRj6ITb.png)
  <br>
  <br>
  <br>
## Conditions for Applying Auras  <br>
<strong>Adds the buff to allies if:</strong>  <br>
- The source actor has a buff with a radius > 0.  <br>
- The buff is enabled, OR if the source actor's buff has the "shareInactive" Boolean flag.  <br>
  <br>
  
<strong>Adds the buff to allies when:</strong>  <br>
- They enter range (either actor can move).  <br>
- The buff is toggled on.  <br>
- A Token is created in the scene, and allies are in range.  <br>
- The aura actor's HP rises above 0.  <br>
  <br>
  
<strong>Adds the buff to enemies if:</strong>  <br>
- The buff also has a "shareEnemies" Boolean Flag. Note: You typically would combine this with "shareInactive" so that the buff doesn't hurt the source actor.  <br>
   <br>

<strong>Deactives or Deletes the buff when:</strong>  <br>
<sub>NOTE: These can be toggled between activate auras and delete auras in the module settings</sub>  <br>
- The source moves out of range.  <br>
- The recipient moves out of range.  <br>
- The source disables the buff, and the buff does not have the "alliesOnly" Boolean Flag  <br>
- The source's HP falls below zero, unless: It has the Diehard feat -OR- Unconscious Auras is toggled OFF in the menus.  <br>
  <br>
  
<strong>Deletes the buff when:</strong>  <br>
- the source is deleted.  <br>
  <br>
