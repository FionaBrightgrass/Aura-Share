import { AuraLogic } from './auralogic.js';
import { Settings } from './settings.js';


let sceneTokens = [];
export class Utils{
    static createTokenArray(){
        let tokens = canvas.tokens.placeables;
        let tokenDocuments = [];
        tokens?.forEach( token => {
            tokenDocuments.push(token.document);
        });
        return tokenDocuments;
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