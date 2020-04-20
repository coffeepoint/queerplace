import React from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import JitsiMeetJS from '../jitsi-meet-js';
import JitsiMeetExternalAPI from '../jitsi-external';
import roomConfig from '../roomConfig';


export class Rooms extends React.Component {

    domain = 'meet.jit.si';
    api = null;
    room = null;
    connection = null;
    currentRoomId = null;
    userMap = new Map();
    userToRoomMap = new Map();
    usersToQuestion = [];
    nakedRooms = [];
    initialRoom = undefined;
    rooms = [];
    roomMap = new Map();
    passwordTried = false;

    constructor(props) {
        super(props);
        this.confirmUser.bind(this);
        this.rejectUser.bind(this);
        this.setupRooms();

        this.userQuestionInput = React.createRef();
        this.displayNakedRoomWarning = false;
        this.state = this.makeState();
        // initiate Jitsi
        const lowLevelOptions = {
            hosts: {
                domain: 'meet.jit.si',
                muc: 'conference.meet.jit.si',
            },
            bosh: 'wss://meet.jit.si/xmpp-websocket?room=' + this.props.prefix,
            serviceUrl: 'wss://meet.jit.si/xmpp-websocket?room=' + this.props.prefix,
            clientNode: 'http://jitsi.org/jitsimeet',
            websocket: 'wss://meet.jit.si/xmpp-websocket' // FIXME: use xep-0156 for that
        };
        const initOptions = {
            disableAudioLevels: true
        };
        JitsiMeetJS.init(initOptions);
        const that = this;
        const connection = new JitsiMeetJS.JitsiConnection(null, null, lowLevelOptions);
        function onConnectionSuccess() {
            console.log('Connection Success');
            that.room = connection.initJitsiConference(that.props.prefix, {
                'startSilent': true,
                openBridgeChannel: true
            });
            that.room.on(JitsiMeetJS.events.conference.USER_JOINED, (id, participant) => {
                console.log('user joined ' + id + ' ' + participant.getDisplayName());
                if (participant.getDisplayName()) {
                    that.userMap.set(id, participant.getDisplayName());
                }
            });
            that.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, track => { });
            that.room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
                console.log(`track removed!!!${track}`);
            });
            that.room.on(JitsiMeetJS.events.conference.USER_LEFT, id => {
                console.log('user left ' + id);
                that.userMap.delete(id);
                that.userToRoomMap.delete(id);
                that.updateState();
            });
            that.room.on(JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (id, displayName) => {
                console.log('user ' + id + ' changed name to ' + displayName);
                that.userMap.set(id, displayName);
            });
            that.room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, () => {
                console.log('Conference Joined');
                if (!that.passwordTried) {
                    that.room.lock(that.props.password);
                }
                that.userMap.set(that.room.myUserId(), that.props.displayName);
                that.room.setDisplayName(that.props.displayName);
                that.changeRooms(that.initialRoom);
            });
            that.room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (errorCode) => {
                if (errorCode === JitsiMeetJS.errors.conference.PASSWORD_REQUIRED) {
                    if (that.passwordTried) {
                        that.props.loginFailed();
                    }
                    else {
                        that.passwordTried = true;
                        that.room.join(that.props.password);
                    }
                }
            });
            that.room.on(JitsiMeetJS.events.conference.MESSAGE_RECEIVED, (id, roomId, ts) => {
                console.log('Room change ' + id + ':' + that.userMap.get(id) + ' ' + roomId);
                that.userToRoomMap.set(id, roomId);
                that.updateState();
            });
            that.room.join();
        }
        connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, onConnectionSuccess);
        connection.connect();
    }

    setupRooms() {
        for (const room of roomConfig) {
            this.roomMap.set(room.roomId, room.roomName+(room.roomType==='naked'?' (Naked)':''));
            if (room.roomType==='naked') {
                this.nakedRooms.push(room.roomId);
                this.rooms.push(room.roomId);
            }
            else if (room.roomType==='initial' && !this.initialRoom) {
                this.initialRoom = room.roomId;
            }
            else {
                this.rooms.push(room.roomId);
            }
        }
    }

    confirmUser() {
        const newUserList = [];
        for (const user of this.usersToQuestion) {
            if (user.id != this.userQuestionInput.current.value) {
                newUserList.push(user);
            }
        }
        this.usersToQuestion = newUserList;
        this.updateState();
    }

    rejectUser() {
        const newUserList = [];
        for (const user of this.usersToQuestion) {
            if (user.id != this.userQuestionInput.current.value) {
                newUserList.push(user);
            }
        }
        this.usersToQuestion = newUserList;
        this.api.executeCommand('sendEndpointTextMessage', this.userQuestionInput.current.value, 'notnaked'); 
        this.updateState();      
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
        if ((this.isNakedRoom(roomId) || this.isNakedRoom(this.currentRoomId)) && askForConfirm) {
            this.displayNakedRoomWarning = true;
        }
        else {
            this.displayNakedRoomWarning = false;
        }
        console.log('@@@ ' + roomId);
        const i = this.rooms.indexOf(roomId);
        console.log('@@@ ' + i);
        if (i > -1) {
            this.rooms[i] = this.currentRoomId;
        }
        this.currentRoomId = roomId;
        if (this.api) {
            this.api.executeCommand('hangup');
            this.api.dispose();
        }
        if (!this.displayNakedRoomWarning) {
            console.log('@@@ ' + this.options());
            this.api = new JitsiMeetExternalAPI(this.domain, this.options());
            if (this.isNakedRoom(this.currentRoomId)) {
                this.api.on('participantJoined', (user) => {
                    console.log('&& joined '+user.id);
                    this.usersToQuestion.push(user);
                    this.updateState();
                });
                this.api.on('participantLeft', (userWhoLeft) => {
                    const newUsersToQuestion = [];
                    for (const user of this.usersToQuestion) {
                        if (user.id!=userWhoLeft.id) {
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
                    this.displayNakedRoomWarning = true;
                    this.updateState();
                });
            }
            this.api.on('passwordRequired', () => {
                this.api.executeCommand('password', this.props.password);
            });
            this.api.on('videoConferenceJoined', () => {
                this.api.executeCommand('password', this.props.password);
                this.api.executeCommand('subject', this.roomMap.get(this.currentRoomId));
            });

            this.api.executeCommand('displayName', this.props.displayName);
            this.room.sendTextMessage(this.currentRoomId);
        }
        else {
            this.updateState();
        }
    }


    isNakedRoom(roomId) {
        return this.nakedRooms.includes(roomId);
    }

    leaveParty() {
        this.cleanUpJitsi();
        this.props.logout();
    }


    cleanUpJitsi() {
        if (this.api) {
            this.api.executeCommand('hangup');
            this.api.dispose();
        }
        if (this.room) {
            this.room.leave();
        }
        if (this.connection) {
            this.connection.disconnect();
        }
    }


    componentWillUnmount() {
        this.cleanUpJitsi();
    }


    updateState() {
        const newState = this.makeState();
        this.setState(newState);
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
            otherRooms.push({ roomId: roomId, roomName: this.roomMap.get(roomId), occupants: roomUserDisplayNameMap.get(roomId) });
        }
        const newState = {
            "displayNakedRoomWarning": this.displayNakedRoomWarning,
            "currentRoomId": this.currentRoom,
            "usersToQuestion": this.usersToQuestion,
            "currentRoom": this.roomMap.get(this.currentRoomId),
            "otherRooms": otherRooms
        };
        return newState;
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
            otherRoomsCards.push(<Row key={room.roomId}><Card style={{ width: '200px' }}>
                <Card.Header as="h6">{room.roomName}</Card.Header>
                <Card.Img src="https://storiescdn.hornet.com/wp-content/uploads/2017/03/06131906/fire_island.jpg" />
                <Card.Body className="p-1 m-1">
                    <ListGroup className="p-0 m-0">{occupantItems}</ListGroup>
                </Card.Body>

                <Button variant="primary" onClick={() => this.changeRooms(room.roomId)}>Enter</Button>
            </Card></Row>);
        }
        const anyRoomWarnings = [];
        const anyRoomQuestion = [];
        if (this.state.displayNakedRoomWarning) {
            const text = ((this.isNakedRoom(this.currentRoomId))?'Mig\'s insists that those in his room are, like him, naked. Please respect other people in the room and only enter if you are not wearing anything. '+
            'If you are not comfortable being naked please join another room.':'Put some clothes on, you are entering a non-naked room!');
            const buttonText = (this.isNakedRoom(this.currentRoomId))?'OK I\'m naked, let me in':'OK I\'m decent, let me in';
            anyRoomWarnings.push(<Container><Alert key='nakedWarning' variant="warning">
                {text}</Alert>
                <Button variant="primary" onClick={() => this.changeRooms(this.currentRoomId, false)}>{buttonText}</Button></Container>);
        }
        else if (this.isNakedRoom(this.currentRoomId)) {
            const options = [];
            for (const user of this.state.usersToQuestion) {
                options.push(<option value={user.id} >{user.displayName}</option>)
            }
            if (options.length>0) {
                anyRoomQuestion.push(<Form inline>Is&nbsp;<Form.Group controlId="isnaked">
                <Form.Control as="select" ref={this.userQuestionInput}>
                    {options}
                </Form.Control>&nbsp;naked?&nbsp;<Button onClick={() => this.confirmUser()}>Yes</Button><Button onClick={() => this.rejectUser()}>No</Button>
            </Form.Group></Form>);
            }
        }
        return (<Container fluid>
            <Row>
                <Button variant="primary" onClick={() => this.leaveParty()}>Leave Party</Button>
            </Row>
            <Row>
                <Col>
                    <Card style={{ width: '80%' }}>
                        <Card.Header>{this.state.currentRoom}</Card.Header>
                        <Card.Body>
                            {anyRoomWarnings}
                            <div id="meet" style={{ width: '100%' }} />
                            {anyRoomQuestion}
                        </Card.Body>
                    </Card>

                </Col>
                <Col md="auto"><Container fluid>{otherRoomsCards}</Container></Col>
            </Row>

        </Container>);
    }
}
