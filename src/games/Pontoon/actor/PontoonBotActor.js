import Actor from '../../../middleware/Actor';
import config from './pontoonConfig';

export default class PontoonBotActor extends Actor {

    players = new Map();
    playerOrder = [];
    playerResults = [];
    dealer = undefined;
    myturn = false;
    deck = [];
    hand = [];
    state = 'initiate';
    stick = false;
    playing = false;


    constructor(key, announcer, rooms) {
        super(key);
        this.accouncer =  announcer;
        this.rooms = rooms;
        this.stateFunctions = {
            'initiate': this.initiate.bind(this),
            'invite': this.invite.bind(this),
            'deal': this.deal.bind(this),
            'play': this.play.bind(this),
            'results': this.results.bind(this)
        };
    }

    gameName() {
        return (this.announce?config.announcePrefix:'')+config.gameName;
    }

    onMessage(message) {
        this.stateFunctions[this.state](message);
    }


    initiate(message) {
        if (message.data==='initiate' || message.data==='announce') {
            this.players = new Map();
            this.playerOrder = [];
            this.playerResults = [];
            this.dealer = undefined;
            this.myturn = false;
            this.deck = [];
            this.hand = [];
            this.stick = false;
            this.playing = false;
            this.dealer = this.actorSystem.room.myUserId()===message.userId;
            this.state = 'invite';
            this.announce = (message.data==='announce');
            if (this.dealer) {
                this.actorSystem.send(this.key,'join');
            }
            this.rooms.updateState();
        }        
    }

    invite(message) {
        if (message.data==='start') {
            if (this.dealer) {
                this.shuffle();
                this.dealCards();
            }
            this.state = 'deal';
        }
        else if (message.data==='join') {
            this.players.set(message.userId, {'cards': 0, 'state': 'awaiting turn'});
            this.playerOrder.push(message.userId);
            if (message.userId===this.actorSystem.room.myUserId()) {
                this.playing = true;
            }
            this.rooms.updateState();
        }    
    }

    shuffle() {
        const suits = ['S','H','D','C'];
        const ranks = [ '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const unshuffledCards = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                unshuffledCards.push(suit+rank);
            }
        }
        const shuffledCards = [];
        while (unshuffledCards.length>0) {
            const cardCount = unshuffledCards.length;
            const cardStart = this.getRandomInt(cardCount);
            const card = unshuffledCards.splice(cardStart,1);
            shuffledCards.push(...card);
        }
        this.deck = shuffledCards;
    }

    dealCards() {
        for (const player of this.playerOrder) {
            this.actorSystem.send(this.key, 'cards:'+player+':'+this.deck.pop()+','+this.deck.pop());
        }
        this.actorSystem.send(this.key,'play');
        this.notifyNextPlayer();
    }

    dealNextCard(player) {
        this.actorSystem.send(this.key,'card:'+this.deck.pop());
    }


    notifyNextPlayer() {
        const myPlayerPosition = this.playerOrder.indexOf(this.actorSystem.room.myUserId());
        const nextPlayerPosition = (myPlayerPosition + 1) % this.playerOrder.length;
        this.myturn = false;
        this.actorSystem.send(this.key, 'nextplayer:'+this.playerOrder[nextPlayerPosition]);
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    gameFinished() {
        for (const player of this.players.values()) {
            console.log('GAMEFINISHED '+player+' '+player.state);
            if (player.state !== 'stick') {
                return false;
            }
        }
        return true;
    }

    deal(message) {
        console.log('DEAL '+message.userId+' '+message.data);
        if (message.data==='play') {
            this.state = 'play';
            this.rooms.updateState();
        }
        else {
            const data = message.data.split(':');
            if (data[0]==='cards') {
                const cards = data[2].split(',');
                if (data[1]===this.actorSystem.room.myUserId()) {
                    this.hand = cards;
                }
                this.players.set(data[1], {'cards': cards.length, 'state': 'awaiting turn'});
            }
            
        }
    }

    play(message) {
        if (this.gameFinished()) {
            this.state = 'results';
            if (this.dealer) {
                this.actorSystem.send(this.key, 'reveal');
            }
        }
        else {

            if (message.data==='twist') {
                if (this.dealer) {
                    this.dealNextCard(message.userId);
                }
                const currentCardCount = this.players.get(message.userId).cards;
                this.players.set(message.userId, {'cards': currentCardCount+1, 'state': 'awaiting turn'});

            }
            else if (message.data==='stick') {

                const currentCardCount = this.players.get(message.userId).cards;
                this.players.set(message.userId, {'cards': currentCardCount, 'state': 'stick'});
                
                if (message.userId===this.actorSystem.room.myUserId()) {
                    this.stick = true;
                    this.notifyNextPlayer();
                }


            }
            else {
                const data = message.data.split(':');
                if (data[0]==='nextplayer') { 
                    const currentState = this.players.get(data[1]).state;    
                    if (currentState!=='stick') {
                        const currentCardCount = this.players.get(data[1]).cards;
                        this.players.set(data[1], {'cards': currentCardCount, 'state': 'playing'});
                    }
                    if  (data[1]===this.actorSystem.room.myUserId()) {
                        if (!this.canPlay())  {
                            this.actorSystem.send(this.key,'stick');
                        } 
                        else {
                            this.myturn = true;
                        }
                    }
                }
                else if (data[0]==='card' && this.myturn) {
                    this.hand.push(data[1]);
                    this.notifyNextPlayer();

                }
            }
            this.rooms.updateState();
 
        } 
    }

    canPlay() {
        if (!this.stick) {
            const handTotal = this.totalHand(this.hand);
            return (this.hand.length<5 && handTotal<21 && handTotal>0);
        }
        else {
            return false;
        }
    }

    applyBot(cleanedText) {
        if (cleanedText==='lets play '+config.gameName.toLowerCase()) {
            if (this.state!=='initiate') {
                this.actorSystem.send(this.accouncer, 'A game is already in progress, join the next one');
            }
            else { 
                this.actorSystem.send('pontoon', 'initiate');
            }
        }
        else if (cleanedText==='lets play '+config.announcePrefix.toLowerCase()+config.gameName.toLowerCase()) {
            if (this.state!=='initiate') {
                this.actorSystem.send(this.accouncer, 'A game is already in progress, join the next one');
            }
            else { 
                this.actorSystem.send('pontoon', 'announce');
            }
        }
    }


    bestCardScore(hand) {
        var bestScore=0;
        for (const card  in hand) {
            const rank = this.totalHand([card]);
            var suitRank = 0;
            if (card.charAt(0)==='S') {
                suitRank = 3;
            }
            else if (card.charAt(0)==='H') {
                suitRank = 2;
            }
            else if (card.charAt(0)==='D') {
                suitRank = 1;
            }
            else if (card.charAt(0)==='C') {
                suitRank = 0;
            }
            const score = (suitRank*13) + rank;
            if (score>bestScore) {
                bestScore = score;
            } 
        }
    }

    results(message) {
        if (message.data==='reveal') {
            if (this.playing) {
                this.actorSystem.send(this.key, 'hand:'+this.hand.join());
            }
        }
        else if (message.data==='playagain') {
            this.state = 'initiate';
            if (this.actorSystem.room.myUserId()===message.userId) {
                this.actorSystem.send(this.key,this.announce?'announce':'initiate');
            }
        }
        else if (message.data==='reset') {
            this.state = 'initiate';
            this.rooms.updateState();
        }
        else {
            const data = message.data.split(':');
            if (data[0]==='hand') {
                const handTotal = this.totalHand(data[1].split(','));
                const bestCardScore = this.bestCardScore(data[1].split(','));
                this.playerResults.push({
                    player: message.userId,
                    hand: data[1],
                    bestCardScore: bestCardScore,
                    total: handTotal,
                    bust: (handTotal===0)       
                });
                if (this.playerResults.length===this.playerOrder.length) {
                    this.playerResults = this.playerResults.sort(this.playerCompare);
                    this.playerResults[0].winner=!this.playerResults[0].bust;
                    if (!this.playerResults[this.playerResults.length-1].bust) {
                        this.playerResults[this.playerResults.length-1].loser = true;
                    }
                    if (this.announce && this.dealer) {
                        for (const playerResult of this.playerResults) {
                            if (playerResult.winner) {
                                this.actorSystem.send(this.accouncer, config.winnerMessage.replace('%',this.rooms.userMap.get(playerResult.player)).replace('&',this.gameName()));
                            }
                            if (playerResult.bust) {
                                this.actorSystem.send(this.accouncer, config.bustMessage.replace('%',this.rooms.userMap.get(playerResult.player)).replace('&',this.gameName()));
                            }
                            if (playerResult.loser) {
                                this.actorSystem.send(this.accouncer, config.loserMessage.replace('%',this.rooms.userMap.get(playerResult.player)).replace('&',this.gameName()));
                            }
                        }
                    }
                    this.rooms.updateState();
                }
            }
        }
    }

    playerCompare(player1, player2) {
        if (player1.total===player2.total) {
            if (player1.bestCardScore===player2.bestCardScore) {
                return 0;
            }
            else if (player1.bestCardScore>player2.bestCardScore) {
                return -1;
            }
            else {
                return 1;
            }
        }
        else if (player1.total>player2.total) {
            return -1;
        }
        else {
            return 1;
        }
    }

    totalHand(hand) {
        
        var handHighTotal = 0;
        var numberOfAces = 0;
        for (const card of hand) {
            var rank = card.substring(1);
            if (rank==='J' || rank==='Q' || rank==='K') {
                rank = 10;
            }
            else if (rank==='A') {
                ++numberOfAces;
                rank = 11;
            }
            else {
                rank = parseInt(rank);
            }
            handHighTotal = handHighTotal + rank;
        }
        for (var i = 0; i<numberOfAces; ++i) {
            if (handHighTotal>21) {
                handHighTotal=handHighTotal-10;
            }
        }
        if (handHighTotal>21) {
            handHighTotal = 0;
        }
        return handHighTotal;
    }
}