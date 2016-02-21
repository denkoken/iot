var LoginForm = React.createClass({
    nameText: "Name",
    passwordText: "Password",
    comment: "",
    url: "",
    componentDidMount() {
    },
    handleOnSubmit(){
      $.ajax({
          url: this.url,
          dataType:'json',
          type:'POST',
          data: this.comment,
          success:function(data){
            if(data.error_type === "false"){
              this.comment = "mistake user or password";
            }else if(data.error_type === "multiple"){
              this.comment = "mutiple login";
            }
          }.bind(this),
          error:function(xhr,status,err){
              this.comment = status;
          }.bind(this)
      });
    },
    render(){
      return (
        <div>
          <form method="POST" onSubmit={this.handleOnSubmit}>
            {this.nameText}
            <input type="text" name="name" /><br />
            {this.passwordText}
            <input type="password" name="password" /><br />
            <input type="submit" /> 
            {this.comment}
          </form>
        </div>
      );
    }
});

var Login = React.createClass({
  render(){
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
