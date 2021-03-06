import React from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import JitsiMeetExternalAPI from '../jitsi-external';
import Actor from '../middleware/Actor';
import JitsiActorSystem from '../middleware/JitsiActorSystem';
import roomConfig from '../roomConfig';
import './Rooms.css';
import ScrollToBottom from 'react-scroll-to-bottom';
import PontoonBotActor from '../games/Pontoon/actor/PontoonBotActor';
import CatActor from '../games/Cat/actor/CatActor';
import { Pontoon } from '../games/Pontoon/components/Pontoon';
import newMesageMp3 from '../assets/newmessage.mp3';



export class StateActor extends Actor {

    constructor(key, rooms) {
        super(key);
        this.rooms = rooms;
    }

    onMessage(userMap) {
        this.rooms.userMap = userMap;
        this.rooms.updateState();
    }

}

export class RoomActor extends Actor {
    constructor(key, rooms) {
        super(key);
        this.key = key;
        this.rooms = rooms;
    }

    onMessage(message) {
        this.rooms.userToRoomMap.set(message.userId, message.data);
        this.rooms.updateState();
    }
}

export class MessageActor extends Actor {
    constructor(key, rooms) {
        super();
        this.key = key;
        this.rooms = rooms;
    }

    onMessage(message) {
        console.log('queerplace: '+message.userId+' '+message.data);
        this.rooms.newMessageSound.play();
        this.rooms.messages.push({name: this.rooms.userMap.get(message.userId), message: message.data});
        this.rooms.updateState();
    }
}

export class Rooms extends React.Component {

    api = null;
    domain = 'meet.jit.si';
    passwordTried = false;
    userToRoomMap = new Map();
    meetingUpdateActor = undefined;
    pontoonBotActor = undefined;
    usersToQuestion = [];
    initialRoom = undefined;
    currentRoomId = null;
    previousRoomId = null;
    rooms = [];
    roomMap = new Map();
    userMap = new Map();
    messages = [];
    newMessageSound = new Audio(newMesageMp3);

    constructor(props) {
        super(props);
        this.confirmUser.bind(this);
        this.rejectUser.bind(this);
        this.sendMessage.bind(this);
        this.setupRooms();
        this.userQuestionInput = React.createRef();
        this.messageInput = React.createRef();
        this.lastMessageItem = React.createRef();
        this.displayRoomWarning = false;

        this.actorSystem = new JitsiActorSystem(new StateActor('state', this), this.props.prefix, this.props.password, this.props.displayName,
        ()=>this.changeRooms(this.initialRoom), ()=>this.props.loginFailed());
        this.pontoonBotActor = new PontoonBotActor('pontoon', 'Migs', this);
        this.gameActors = [this.pontoonBotActor, new CatActor('Migs', this)];
        
        this.actorSystem.registerActor(new RoomActor('room', this));
        this.actorSystem.registerActor(new MessageActor('message', this));
        this.gameActors.map((actor)=>this.actorSystem.registerActor(actor));
        this.state = this.makeState();
    }

    setupRooms() {
        for (const room of roomConfig) {
            this.roomMap.set(room.roomId, room);
            if (room.roomType==='initial' && !this.initialRoom) {
                this.initialRoom = room.roomId;
            }
            this.rooms.push(room.roomId);
        }
    }

    confirmUser() {
        const newUserList = [];
        for (const user of this.usersToQuestion) {
            if (user.id !== this.userQuestionInput.current.value) {
                newUserList.push(user);
            }
        }
        this.usersToQuestion = newUserList;
        this.updateState();
    }

    rejectUser() {
        const newUserList = [];
        for (const user of this.usersToQuestion) {
            if (user.id !== this.userQuestionInput.current.value) {
                newUserList.push(user);
            }
        }
        this.usersToQuestion = newUserList;
        this.api.executeCommand('sendEndpointTextMessage', this.userQuestionInput.current.value, 'notcompliant');
        this.updateState();
    }

    sendMessage() {
        const messageText=this.messageInput.current.value;
        if (messageText && messageText.trim().length>0) {
            this.actorSystem.send('message', messageText);
            this.messageInput.current.value = '';
            this.applyBots(messageText);
        }
    }

    applyBots(text) {
        const cleanedText = text.toLowerCase().replace(/[ ]+/g,' ').replace(/[^0-9a-z ]/g,'').trim();
        this.gameActors.map((actor)=>actor.applyBot(cleanedText));

    }

    maybeSendMessage(target) {
        if (target.charCode === 13) {
            this.sendMessage();
        }
    }

    options() {
        return {
            roomName: this.props.prefix + this.currentRoomId,
            width: '100%',
            height: '650px',
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'chat',
                    'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'e2ee'
                ],
                SETTINGS_SECTIONS: ['devices', 'language']
            },
            parentNode: document.querySelector('#meet')
        };
    }


    changeRooms(roomId, askForConfirm = true) {
        if ((this.isRestrictedRoom(roomId) || this.isRestrictedRoom(this.currentRoomId)) && askForConfirm) {
            this.displayRoomWarning = true;
        }
        else {
            this.displayRoomWarning = false;
        }
        console.log('@@@ ' + roomId);
        this.previousRoomId = this.currentRoomId;
        this.currentRoomId = roomId;
        if (this.api) {
            this.api.executeCommand('hangup');
            this.api.dispose();
        }
        if (!this.displayRoomWarning) {
            console.log('@@@ ' + this.options());
            this.api = new JitsiMeetExternalAPI(this.domain, this.options());
            this.scrollToTop();
            if (this.isRestrictedRoom(this.currentRoomId)) {
                this.api.on('participantJoined', (user) => {
                    console.log('&& joined '+user.id);
                    this.usersToQuestion.push(user);
                    this.updateState();
                });
                this.api.on('participantLeft', (userWhoLeft) => {
                    const newUsersToQuestion = [];
                    for (const user of this.usersToQuestion) {
                        if (user.id !== userWhoLeft.id) {
                            newUsersToQuestion.push(user);
                        }
                    }
                    this.usersToQuestion = newUsersToQuestion;
                    this.updateState();
                });
                this.api.on('videoConferenceLeft', (data) => {
                    console.log('&& left '+data.roomName);
                    this.usersToQuestion.length = 0;
                    this.updateState();
                });
                this.api.on('endpointTextMessageReceived', (data) => {
                    this.api.executeCommand('hangup');
                    this.api.dispose();
                    this.displayRoomWarning = true;
                    this.updateState();
                });
            }
            this.api.on('passwordRequired', () => {
                this.api.executeCommand('password', this.props.password);
            });
            this.api.on('videoConferenceJoined', () => {
                this.api.executeCommand('password', this.props.password);
                this.api.executeCommand('subject', this.roomName(this.currentRoomId));
            });

            this.api.executeCommand('displayName', this.props.displayName);
            this.actorSystem.send('room', this.currentRoomId);
        }
        else {
            this.updateState();
            this.scrollToTop();
        }
    }

    scrollToTop() {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }


    isRestrictedRoom(roomId) {
        if (roomId) {
            return this.roomMap.get(roomId).roomType==='restricted';
        }
        else {
            return false;
        }
    }

    leaveParty() {
        this.props.logout();
    }

    componentWillUnmount() {
        if (this.api) {
            this.api.executeCommand('hangup');
            this.api.dispose();
        }
        this.actorSystem.shutdown();
    }


    updateState() {
        const newState = this.makeState(this.userMap);
        this.setState(newState);
    }

    roomName(roomId) {
        if (roomId) {
            const room= this.roomMap.get(roomId);
            return room.roomName + (room.roomLabel?' ('+room.roomLabel+')':'');
        }
        else {
            return undefined;
        }
    }

    makeState() {
        const otherRooms = [];
        const roomUserDisplayNameMap = new Map();
        this.userToRoomMap.forEach((room, userId, map) => {

            const displayName = this.userMap.get(userId);
            if (displayName && displayName.trim().length>0) {
                if (roomUserDisplayNameMap.has(room)) {
                    roomUserDisplayNameMap.get(room).push(displayName);
                }
                else {
                    roomUserDisplayNameMap.set(room, [displayName]);
                }
            }
        });
        for (const roomId of this.rooms) {
            otherRooms.push({ roomId: roomId, roomName: this.roomName(roomId), occupants: roomUserDisplayNameMap.get(roomId) });
        }
        const newState = {
            "displayRoomWarning": this.displayRoomWarning,
            "currentRoomId": this.currentRoom,
            "usersToQuestion": this.usersToQuestion,
            "currentRoom": this.roomName(this.currentRoomId),
            "otherRooms": otherRooms,
            "messages": this.messages,
            "playing": this.pontoonBotActor.playing
        };
        return newState;
    }

    escapeHtml(unsafe) {
        return unsafe
          .replace(/&/g, " &amp;")
          .replace(/</g, " &lt;")
          .replace(/>/g, " &gt;")
          .replace(/"/g, " &quot;")
          .replace(/'/g, " &#039;");
    }

    convertTextToLinks(text) {
        const exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
        return this.escapeHtml(text).replace(exp,"<a rel=\"noopener noreferrer\" target=\"_blank\" href='$1'>$1</a>").replace(/ &/g, '&');
    }

    render() {
        const otherRoomsCards = [];
        for (const room of this.state.otherRooms) {
            const occupantItems = [];
            if (room.occupants) {
                for (const occupant of room.occupants) {
                    occupantItems.push(<ListGroup.Item className="p-0 m-0">{occupant}</ListGroup.Item>);
                }
            }
            const maybeButton = (room.roomId!==this.currentRoomId)?<Button variant="primary" onClick={() => this.changeRooms(room.roomId)}>Enter</Button>:undefined;
            otherRoomsCards.push(<Row key={room.roomId}><Card style={{ width: '200px' }}>
                <Card.Header as="h6">{room.roomName}</Card.Header>
                <Card.Img src={'rooms/'+room.roomId+".jpeg"} />
                <Card.Body className="p-1 m-1">
                    <ListGroup className="p-0 m-0">{occupantItems}</ListGroup>
                </Card.Body>

                {maybeButton}
            </Card></Row>);
        }
        const anyRoomWarnings = [];
        const anyRoomQuestion = [];
        const room = this.roomMap.get(this.currentRoomId);
        if (this.state.displayRoomWarning) {
            const previousRoom = this.roomMap.get(this.previousRoomId);
            const text = (this.isRestrictedRoom(this.currentRoomId))?room.roomRestrictionText:previousRoom.roomLeavingText;
            const buttonText = (this.isRestrictedRoom(this.currentRoomId))?room.roomRestrictionButton:previousRoom.roomLeavingButton;
            anyRoomWarnings.push(<Container><Alert key='roomWarning' variant="warning">
                {text}</Alert>
                <Button variant="primary" onClick={() => this.changeRooms(this.currentRoomId, false)}>{buttonText}</Button></Container>);
        }
        else if (this.isRestrictedRoom(this.currentRoomId)) {
            const questionData = room.roomQuestion.split('%');
            const options = [];
            for (const user of this.state.usersToQuestion) {
                options.push(<option value={user.id} >{user.displayName}</option>)
            }
            if (options.length>0) {
            anyRoomQuestion.push(<Form inline>{questionData[0]}&nbsp;<Form.Group controlId="iscompliant">
                <Form.Control as="select" ref={this.userQuestionInput}>
                    {options}
            </Form.Control>&nbsp;{questionData[1]}&nbsp;<Button onClick={() => this.confirmUser()}>Yes</Button><Button onClick={() => this.rejectUser()}>No</Button>
            </Form.Group></Form>);
            }
        }
        const messageItems = [];
        var i = 0;
        for (const message of this.state.messages) {
            messageItems.push(<ListGroup.Item dangerouslySetInnerHTML={{ __html: `<b>${message.name}:</b>&nbsp;${this.convertTextToLinks(message.message)}`}} key={i} className="p-0 m-0"></ListGroup.Item>);

            ++i;
        }

        return (<Container fluid>
            <Row id="party-controls">
                <Button variant="primary" className="warn outside" onClick={() => this.leaveParty()}>Leave Party</Button>
            </Row>
            <Row>
                <Col md="auto"><Container fluid>{otherRoomsCards}</Container></Col>
                <Col>
                    <Card style={{ width: '100%' }}>
                        <Card.Header>{this.state.currentRoom}</Card.Header>
                        <Card.Body>
                            {anyRoomWarnings}
                            <div id="meet" style={{ width: '100%' }} />
                            {anyRoomQuestion}
                        </Card.Body>
                    </Card>
                    <Card style={{ width: '100%' }}>
                        <Card.Header>Party Chat</Card.Header>
                        <Card.Body className="chat">
                            <ScrollToBottom className="messageChat">
                                <ListGroup ref={this.lastMessageItem} className="p-0 m-0">{messageItems}</ListGroup>
                            </ScrollToBottom>
                            <InputGroup>
                                <Form.Control as="input" ref={this.messageInput} type="text" placeholder="Type a message" onKeyPress={(target)=>this.maybeSendMessage(target)}/>
                                <Button onClick={() => this.sendMessage()}>Send</Button>
                            </InputGroup>
                        </Card.Body>
                    </Card>
                    <Pontoon pontoonBotActor={this.pontoonBotActor} userMap={this.userMap} />
                </Col>
            </Row>
        </Container>);
    }
}