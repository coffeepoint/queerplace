import React from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
export class LetMeIn extends React.Component {

  constructor(props) {
    super(props);
    this.nameInput = React.createRef();
    this.partyInput = React.createRef();
    this.passwordInput = React.createRef();
    this.saveDetailsInput = React.createRef();
  }

  
  render() {
    const alerts = [];
    if (this.props.message) {
      alerts.push(<Alert key='message' variant='danger'>{this.props.message}</Alert>);
    }
    return (<Form onSubmit={() => this.props.enterParty(
      this.nameInput.current.value, 
      this.partyInput.current.value, 
      this.passwordInput.current.value, 
      this.saveDetailsInput.current.checked)}>
      <Form.Group controlId="YourName">
        <Form.Label>Your Name</Form.Label>
        <Form.Control ref={this.nameInput} type="text" placeholder="Your Name" defaultValue={this.props.name} />
      </Form.Group>
      <Form.Group controlId="Party">
        <Form.Label>Party</Form.Label>
        <Form.Control ref={this.partyInput} type="text" placeholder="Enter Party to Join" defaultValue={this.props.partyName} />
        <Form.Text className="text-muted">
          Enter the string given to you by the host
        </Form.Text>
      </Form.Group>
      <Form.Group controlId="PartyPassword">
        <Form.Label>Password</Form.Label>
        <Form.Control ref={this.passwordInput} type="password" placeholder="Enter Password" defaultValue={this.props.password} />
        <Form.Text className="text-muted">
          Enter the password given to you by the host
        </Form.Text>
      </Form.Group>
      <Form.Group controlId="SaveDetails">
        <Form.Check custom type="switch" ref={this.saveDetailsInput} defaultChecked={this.props.saveDetails} label="Save Party Details and Password"/>
      </Form.Group>
      {alerts}
      <Button variant="primary" type="submit">
        Let's Party!
      </Button>
    </Form>);
  }
}
