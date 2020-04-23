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
      saveDetails: undefined,
      setup: false
    };

    if (localStorage.getItem('displayName') !== "") {
      this.state.displayName = localStorage.getItem('displayName');
    }
    if (localStorage.getItem('partyName') !== "") {
      this.state.partyName = localStorage.getItem('partyName');
    }
    if (localStorage.getItem('password') !== "") {
      this.state.password = localStorage.getItem('password');
    }
    if (localStorage.getItem('saveDetails') !== "") {
      this.state.saveDetails = localStorage.getItem('saveDetails');
    }

    this.enterParty = this.enterParty.bind(this);
    this.loginFailed = this.loginFailed.bind(this);
    this.logout = this.logout.bind(this);
  }


  enterParty(displayName, partyName, password, saveDetails) {
    if (this.definedAndOfNoneZeroLength(displayName) && this.definedAndOfNoneZeroLength(partyName) && this.definedAndOfNoneZeroLength(password)) {
      this.setState({
        displayName: displayName,
        partyName: partyName,
        password: password,
        setup: true
      });

      if (saveDetails === true) {
        localStorage.setItem('saveDetails', "true");
        this.setState({saveDetails: "true"});
      } else {
        localStorage.setItem('saveDetails', "false");
      }

      if (saveDetails) {
        localStorage.setItem('displayName', displayName);
        localStorage.setItem('partyName', partyName);
        localStorage.setItem('password', password);
      } else {
        localStorage.clear();
      }
    }
    else {
      this.setState({
        displayName: displayName,
        partyName: partyName,
        password: password,
        setup: false,
        message: 'All fields are required',
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
    if (this.state.saveDetails !== "true") {
      this.setState({
        displayName: undefined,
        partyName: undefined,
        password: undefined,
      });
    }
    
    this.setState({
      setup: false,
      message: undefined,
    })
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
        <LetMeIn 
          enterParty={this.enterParty} 
          message={this.state.message} 
          name={this.state.displayName} 
          partyName={this.state.partyName} 
          password={this.state.password} 
          saveDetails={this.state.saveDetails === "true"} />
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
