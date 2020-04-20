import React from 'react';
import Container from 'react-bootstrap/Container';
import { LetMeIn } from './LetMeIn';
import { Rooms } from "./Rooms";
import Alert from 'react-bootstrap/Alert';


export class Party extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      displayName: undefined,
      partyName: undefined,
      password: undefined,
      setup: false
    };
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
    return (text && text.trim().length > 0);
  }


  loginFailed() {
    const newState = {
      displayName: this.state.displayName,
      partyName: this.state.partyName,
      password: undefined,
      setup: false,
      message: 'The password you entered was incorect!'
    };
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
      return (<Container fluid>
        <h1>Jitsi Party: A Multi-Room Virtual House Party</h1>
        <Alert key='info' variant="info">
        Rooms using this page are hosted on <a href="https://meet.jit.si">meet.jit.si</a>. No message, video or audio data goes via queerplace.net. 
        For questions about Jitsi security and privacy see <a href="https://jitsi.org/blog/security/">https://jitsi.org/blog/security/</a>. When only two people are in 
        a room, video and audio is encrypted end to end between the two occupant's computers. When more people are in the room, video and audio is encypted to and 
        from meet.jit.si. Data is always encrypted in transit.</Alert>
        <LetMeIn enterParty={this.enterParty} name={this.state.displayName} partyName={this.state.party} message={this.state.message} />
      </Container>);
    }
    else {
      return (<Container fluid>
        <h1>Jitsi Party: A Multi-Room Virtual House Party</h1>
        <Rooms loginFailed={this.loginFailed} logout={this.logout} prefix={this.state.partyName} displayName={this.state.displayName} password={this.state.password} />
      </Container>);
    }
  }
}
