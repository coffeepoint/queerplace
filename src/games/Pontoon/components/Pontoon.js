import React from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import yourTurnMp3 from '../assets/yourturn.mp3'
import './Pontoon.css';

export class Pontoon extends React.Component {

    yourTurnSound = new Audio(yourTurnMp3);

    getUserDisplayName(playerId) {
        return this.props.userMap.get(playerId);    
    }

    joinPontoon() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'join');
    }

    startPontoon() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'start');
    }

    twist() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'twist');
    }


    stick() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'stick');
    }

    leave() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'leave');
    }

    playagain() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'playagain');
    }

    resetPontoon() {
        this.props.pontoonBotActor.actorSystem.send('pontoon', 'reset');
    }

    render() {

        // Pontoon
        const pontoonCardBody = []
        if (this.props.pontoonBotActor.state==='invite') {
            const playerNames = []; 
            for (const playerId of this.props.pontoonBotActor.playerOrder) {
                playerNames.push(this.getUserDisplayName(playerId));
            }
            var prefix = undefined;
            if (playerNames.length===1) {
                prefix = playerNames[0] + ' wants';
            }
            else {
                prefix = playerNames.slice(0, playerNames.length-1).join(', ') + ' and ' + playerNames[playerNames.length -1] + ' want';
            }
            const maybeStartGameButton = [];
            if (playerNames.length>1) {
                maybeStartGameButton.push(<Button className='pontoon' onClick={() => this.startPontoon()}>Start Game</Button>); 
            }
            if (this.props.pontoonBotActor.playing()) {
            pontoonCardBody.push(<Form inline>{prefix} to play {this.props.pontoonBotActor.gameName()}!<Form.Group controlId="pontoon">
                {maybeStartGameButton}
                </Form.Group></Form>);
            }
            else {
                pontoonCardBody.push(<Form inline>{prefix} to play {this.props.pontoonBotActor.gameName()}!<Form.Group controlId="pontoon">
                <Button className='pontoon' onClick={() => this.joinPontoon()}>Join Them</Button>
                </Form.Group></Form>);
            } 
            
        }
        else if (this.props.pontoonBotActor.state==='play') {
            const yourHand=[];
            for (const playingCard of this.props.pontoonBotActor.hand) {
                yourHand.push(<img id='playing-card' alt={playingCard} src={'cards/'+playingCard.substring(1)+playingCard.charAt(0)+'.svg'} width='100' />);
            }
            const actions = [];
            if (this.props.pontoonBotActor.myturn) {
                this.yourTurnSound.play();
                actions.push(<Form inline> <Form.Group controlId="pontoon"><Button className='pontoon' onClick={() => this.twist()}>Twist!</Button>
                <Button className='pontoon' onClick={() => this.stick()}>Stick!</Button><Button className='pontoon' onClick={() => this.leave()}>Leave Game</Button>
             </Form.Group></Form>);
            }
            else if (this.props.pontoonBotActor.playing()) {
                actions.push(<Form inline> <Form.Group controlId="pontoon">
                <Button className='pontoon' onClick={() => this.leave()}>Leave Game</Button>
             </Form.Group></Form>);
            }
            const playerList = [];
            for (const playerId of this.props.pontoonBotActor.playerOrder) {
                const faceDownCards = [];
                for (var i=0; i<this.props.pontoonBotActor.players.get(playerId).cards; ++i) {
                    faceDownCards.push(<img id='playing-card'  alt='Face Down Card' src={'cards/RED_BACK.svg'} width='50' />)
                }
                playerList.push(<Row className={this.props.pontoonBotActor.players.get(playerId).state!=='playing'?'not-current-player':''}>
                    <Col>{this.getUserDisplayName(playerId)}</Col> 
                    <Col md='auto'>({this.props.pontoonBotActor.players.get(playerId).state})</Col>
                    <Col md='auto'>{faceDownCards}</Col>
                    
                    </Row>);
            }
            pontoonCardBody.push(<Container>
                <Row>
                    <Col><Container style={{ width: '80%' }}>
                            <Row>{yourHand}</Row>
                            <Row>{actions}</Row>
                        </Container></Col>
                    <Col md='auto'><Container>{playerList}</Container></Col>
                </Row>
            </Container>);

        }
        else if (this.props.pontoonBotActor.state==='results') {
            const playerList = [];
            for (const player of this.props.pontoonBotActor.playerResults) {
                const hand = [];
                for (const playingCard of player.hand.split(',')) {
                    hand.push(<img id='playing-card' alt={playingCard} src={'cards/'+playingCard.substring(1)+playingCard.charAt(0)+'.svg'} width='50' />);
                }
                playerList.push(<Row><Col>{this.getUserDisplayName(player.player)} {player.winner?'wins with ':''} {player.bust?'is bust!':player.total}</Col><Col>{hand}</Col></Row>)
            }
            pontoonCardBody.push(<Container>
                {playerList}
                <Row>
                <Button className='pontoon' onClick={() => this.playagain()}>Play Again</Button>
                <Button className='pontoon' onClick={() => this.resetPontoon()}>Maybe Later</Button>
                </Row>
            </Container>);        
        }

        const pontoonCard = [];
        if (this.props.pontoonBotActor.state!=='initiate') {
            pontoonCard.push(<Card style={{ width: '100%' }}>
            <Card.Header>Pontoon</Card.Header>
            <Card.Body id='card-table'>
                {pontoonCardBody}
            </Card.Body>
        </Card> );
        }

        return pontoonCard;
    }

}
