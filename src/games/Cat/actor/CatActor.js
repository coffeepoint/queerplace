import Actor from '../../../middleware/Actor';
import miaowMp3 from '../assets/miaow.mp3';
import catReplies from './CatReplies.js';

export default class CatActor extends Actor {

    miaowSound = new Audio(miaowMp3);
    constructor(key, rooms) {
        super(key);
        this.key = key;
        this.rooms = rooms;
    }

    applyBot(cleanedText) {
        const catReplyId = this.getRandomInt(catReplies.length);
        if (cleanedText==='wheres '+this.key.toLowerCase() || cleanedText === 'where is '+this.key.toLowerCase()) {
            setTimeout(()=>this.actorSystem.send(this.key,catReplies[catReplyId]), 1000);
        }
    }

    onMessage(message) {
        this.miaowSound.play();
        this.rooms.messages.push({name: this.key, message: message.data});
        this.rooms.updateState();
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}