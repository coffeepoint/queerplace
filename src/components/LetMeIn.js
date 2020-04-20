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
  }

  
  render() {
    const alerts = [];
    if (this.props.message) {
      alerts.push(<Alert key='message' variant='danger'>{this.props.message}</Alert>);
    }
    return (<Form>

      <Form.Group controlId="YourName">
        <Form.Label>Your Name</Form.Label>
        <Form.Control ref={this.nameInput} type="text" placeholder="Your Name" value={this.props.name} />
      </Form.Group>
      <Form.Group controlId="Party">
        <Form.Label>Party</Form.Label>
        <Form.Control ref={this.partyInput} type="text" placeholder="Enter Party to Join" value={this.props.partyName} />
        <Form.Text className="text-muted">
          Enter the string given to you by the host
        </Form.Text>
      </Form.Group>
      <Form.Group controlId="PartyPassword" invalid="true">
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
