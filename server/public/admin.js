var Alert = ReactBootstrap.Alert;
var Input = ReactBootstrap.Input;
var ButtonInput = ReactBootstrap.ButtonInput;
var Panel = ReactBootstrap.Panel;

var Admin = React.createClass({
    render() {
      return (
        <div>
	<a href="/join"> Create Account </a><br />
	<a> Profile Settings </a> 
        </div>
      );
    }
});

ReactDOM.render(
  <Admin />,
  document.getElementById('content')
);
