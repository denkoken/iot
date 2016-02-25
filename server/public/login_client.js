var LoginForm = React.createClass({
    nameText: 'Name',
    passwordText: 'Password',
    url: '',

    getInitialState() {
      return {
        nameValue: '',
        passwordValue: '',
        comment: '',
      }
    },
    handleNameChange(e) {
      this.setState({nameValue: e.target.value});
    },
    handlePasswordChange(e) {
      this.setState({passwordValue: e.target.value});
    },
    handleSubmit(e) {
      e.preventDefault();
      var data = {
        name: this.state.nameValue,
        password: this.state.passwordValue
      };
      $.ajax({
          url: this.url,
          type:'POST',
          contentType:'application/json',
          dataType: 'json',
          data: JSON.stringify(data),
          success: function(res) {
            var message = res.message;
            var redirect = res.redirect;
            if(message) this.setState({comment: message});
            if(redirect) window.location = redirect;
          }.bind(this),
          error: function(xhr, status, err) {
            this.setState({comment: status});
          }.bind(this)
      });
    },
    render() {
      return (
        <div>
          <form onSubmit={this.handleSubmit}>
            {this.nameText}
            <input
              type="text"
              name="name"
              value={this.state.nameValue}
              onChange={this.handleNameChange}
            />
            <br />
            {this.passwordText}
            <input
              type="password"
              name="password"
              value={this.state.passwordValue}
              onChange={this.handlePasswordChange}
            />
            <br />
            <input
              type="submit"
              value="Post"
            /> 
            <br />
            {this.state.comment}
          </form>
        </div>
      );
    }
});

var Login = React.createClass({
  render() {
    return (
      <div>
        <LoginForm />
      </div>
    );
  }
});

ReactDOM.render(
  <Login />,
  document.getElementById('content')
);
