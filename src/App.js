import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import ListGroup from 'react-bootstrap/ListGroup';
import JitsiMeetJS from './jitsi-meet-js';
import JitsiMeetExternalAPI from './jitsi-external';



import './App.css';


class LetMeIn extends React.Component {

  constructor(props) {
    super(props);
    this.nameInput = React.createRef();
    this.partyInput = React.createRef();
    this.passwordInput = React.createRef();

  }

  render() {
    const alerts = [];
    if (this.props.message) {
      alerts.push(<Alert key='message' variant='danger'>{this.props.message}</Alert> );
    }
    return (<Form>
      
      <Form.Group controlId="YourName">
        <Form.Label>Your Name</Form.Label>
        <Form.Control ref={this.nameInput} type="text" placeholder="Your Name" value={this.props.name}/>
      </Form.Group>  
      <Form.Group controlId="Party">
        <Form.Label>Party</Form.Label>
        <Form.Control ref={this.partyInput} type="text" placeholder="Enter Party to Join" value={this.props.partyName}/>
        <Form.Text className="text-muted">
          Enter the string given to you by the host
        </Form.Text>
      </Form.Group>    
      <Form.Group controlId="PartyPassword" invalid="true" >
        <Form.Label>Password</Form.Label>
        <Form.Control ref={this.passwordInput} type="password" placeholder="Enter Password" />
        <Form.Text className="text-muted">
          Enter the password given to you by the host
        </Form.Text>
      </Form.Group>
      {alerts}
      <Button variant="primary" onClick={() => this.props.enterParty(this.nameInput.current.value, this.partyInput.current.value, this.passwordInput.current.value)}>
        Let's Party!
      </Button>
    </Form>);


  }
}

class Party extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      displayName: undefined,
      partyName: undefined,
      password: undefined,
      setup: false
    }
    this.enterParty = this.enterParty.bind(this);
    this.loginFailed = this.loginFailed.bind(this);
    this.logout = this.logout.bind(this);
  }

  enterParty(displayName, partyName, password) {

    if (this.definedAndOfNoneZeroLength(displayName) && this.definedAndOfNoneZeroLength(partyName) && this.definedAndOfNoneZeroLength(password)) {
      this.setState({
        displayName: displayName,
        partyName: partyName,
        password: password,
        setup: true      
      });
    }
    else {
      this.setState({
        displayName: displayName,
        partyName: partyName,
        password: password,
        setup: false,
        message: 'All fields are required'      
      });
    }



  }

  definedAndOfNoneZeroLength(text) {
    return (text && text.trim().length>0)  
  }

  loginFailed() {
    const newState = {
      displayName: this.state.displayName,
      partyName: this.state.partyName,
      password: undefined,
      setup: false,
      message: 'The password you entered was incorect!'      
    }
    this.setState(newState);
  }

  logout() {
    this.setState({
        displayName: undefined,
        partyName: undefined,
        password: undefined,
        setup: false,
        message: undefined
    });
  }

  render() {
    if (!this.state.setup) {
      return (  <Container fluid>
        <h1>Jitsi Party</h1>
      <LetMeIn enterParty={this.enterParty} name={this.state.displayName} party={this.state.party} message={this.state.message}/>
      </Container>);
    }
    else {
      return (<Container fluid>
        <h1>Jitsi Party</h1>
      <Rooms loginFailed={this.loginFailed} logout={this.logout} prefix={this.state.partyName} displayName={this.state.displayName} password={this.state.password}/>
      </Container>);      
    }
  }


}


class Rooms extends React.Component {

  domain = 'meet.jit.si';
  api = null;
  room = null;
  connection = null;
  currentRoomId = null;
  userMap = new Map();
  userToRoomMap = new Map();
  rooms = [ 't43hr3', 'dasdsa', 'herh3s', 'feyewr', 'weyrehj'];
  roomMap = new Map();
  passwordTried = false;


  constructor(props) {
    super(props);
    this.roomMap.set('hrwtre', 'Living Room');
    this.roomMap.set('t43hr3', 'Balcony');
    this.roomMap.set('dasdsa', 'Mig\'s Room');
    this.roomMap.set('herh3s', 'Brian And Tom\'s Bedroom');
    this.roomMap.set('feyewr', 'Terrace');
    this.roomMap.set('weyrehj', 'Kitchen');
    this.state = {
        currentRoom: "LivingRoom",
        currentRoomId: "hrwtre",
        otherRooms: [ { roomId: 't43hr3', roomName: "Balcony", occupants: [] },
      { roomId: 'dasdsa', roomName: "Mig's Room", occupants: [] },
      { roomId: 'herh3s', roomName: "Brian And Tom's Bedroom", occupants: [] },
      { roomId: 'feyewr',  roomName: "Terrace", occupants: [] },
      { roomId: 'weyrehj', roomName: "Kitchen", occupants: [] },
      ],
    }

    // initiate Jitsi
    const lowLevelOptions = {hosts: {
      domain: 'meet.jit.si',
      muc: 'conference.meet.jit.si',
    },
    bosh: 'wss://meet.jit.si/xmpp-websocket?room='+this.props.prefix,
    serviceUrl: 'wss://meet.jit.si/xmpp-websocket?room='+this.props.prefix,
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

      that.room  = connection.initJitsiConference(that.props.prefix, {
        'startSilent': true,
        openBridgeChannel: true
    });
      that.room.on(JitsiMeetJS.events.conference.USER_JOINED, (id, participant) => {
        console.log('user joined ' + id + ' ' + participant.getDisplayName());
        if (participant.getDisplayName()) {
          that.userMap.set(id, participant.getDisplayName());
        }
      });
      that.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, track => {});
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
        that.changeRooms('hrwtre');
      });
      that.room.on(JitsiMeetJS.events.conference.CONFERENCE_FAILED, (errorCode)=>{
        if (errorCode===JitsiMeetJS.errors.conference.PASSWORD_REQUIRED) {
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
    connection.addEventListener(
      JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
      onConnectionSuccess);
    connection.connect();

  }

  options() {
    return  {
      roomName: this.props.prefix + this.currentRoomId,
      width: '100%',
      height: '650px',
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'chat', 'recording',
           'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'e2ee'
        ],
  
        SETTINGS_SECTIONS: [ 'devices', 'language' ]
      },
      parentNode: document.querySelector('#meet')
    };
  }


  changeRooms(roomId) {
    console.log('@@@ '+roomId);
    const i = this.rooms.indexOf(roomId);
    console.log('@@@ '+i);
    if (i>-1) {
      this.rooms[i] = this.currentRoomId;
    }
    this.currentRoomId = roomId;
    if (this.api) {
      this.api.executeCommand('hangup');
      this.api.dispose();
    }
    console.log('@@@ '+this.options());
    this.api = new JitsiMeetExternalAPI(this.domain, this.options());

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
    const otherRooms = [];
    const roomUserDisplayNameMap = new Map();
    this.userToRoomMap.forEach((room, userId, map) => {
      const displayName = this.userMap.get(userId);
      if (roomUserDisplayNameMap.has(room)) {
        roomUserDisplayNameMap.get(room).push(displayName);
      }
      else {
        roomUserDisplayNameMap.set(room, [displayName]);
      }
    });
    for (const roomId of this.rooms) {
      otherRooms.push({ roomId: roomId, roomName: this.roomMap.get(roomId), occupants: roomUserDisplayNameMap.get(roomId) });
    }
    this.setState({
      "currentRoomId": this.currentRoom,
      "currentRoom": this.roomMap.get(this.currentRoomId),
      "otherRooms": otherRooms
    });
  }

  render() {

    const otherRoomsCards = [];

    for (const room of this.state.otherRooms) {
      const occupantItems = [];

      if (room.occupants) {
        for (const occupant of room.occupants) {
          occupantItems.push(<ListGroup.Item>{occupant}</ListGroup.Item>)
        }
      }
      
      otherRoomsCards.push(<Row key={room.roomId}><Card style={{ width: '200px' }}>
      <Card.Header as="h6">{room.roomName}</Card.Header>
      <Card.Img src="https://storiescdn.hornet.com/wp-content/uploads/2017/03/06131906/fire_island.jpg" />
      <Card.Body>
      <ListGroup>{occupantItems}</ListGroup>
      </Card.Body>

        <Button variant="primary" onClick={() => this.changeRooms(room.roomId)}>Enter</Button>
    </Card></Row>);
    }

    return (
      
    <Container fluid>
      <Row>
      <Button variant="primary" onClick={() => this.leaveParty()}>Leave Party</Button>  
      </Row>
      <Row>
        <Col>
    <Card style={{ width: '80%' }}>
      <Card.Img src="https://storiescdn.hornet.com/wp-content/uploads/2017/03/06131906/fire_island.jpg" />
      <Card.ImgOverlay>
        <Card.Title>{this.state.currentRoom}</Card.Title>
        <div id="meet" style={{ width: '100%' }}/> 
        </Card.ImgOverlay>
    </Card>
    </Col>
    <Col md="auto"><Container fluid>{otherRoomsCards}</Container></Col>
    </Row>

    </Container>
    );
  }


}


const App = () => (
  <Party />
  )

export default App;