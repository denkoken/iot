var socket = io.connect('/camera');

var Nav = ReactBootstrap.Nav;
var NavItem = ReactBootstrap.NavItem;
var Panel = ReactBootstrap.Panel;

var UserList = React.createClass({
    propTypes: {
      users: React.PropTypes.array.isRequired,
    },
    render() {
      return (<div>Users : {this.props.users.join(', ')}</div>);
    }
});

var IoNodeTab = React.createClass({
    propTypes: {
      nodes: React.PropTypes.array.isRequired,
      activeNode: React.PropTypes.number.isRequired,
    },
    handleSelect(key) {
      socket.emit('changeIoNode', {idx: key});
    },
    render() {
      return (
        <Nav bsStyle="tabs"
             activeKey={this.props.activeNode}
             onSelect={this.handleSelect}>
          {
            this.props.nodes.map((name, idx) => {
                if (name) {
                  return (<NavItem key={idx} eventKey={idx}>{name}</NavItem>);
                }
            })
          }
        </Nav>
      );
    }
});

var ImageViewer = React.createClass({
    width : 1000,
    height : 1000 * 3 / 4,
    componentDidMount() {
      this.canvas = ReactDOM.findDOMNode(this.refs.canvas);
      this.ctx = this.canvas.getContext('2d');
    },
    clear() {
      this.ctx.clearRect(0, 0, this.width, this.height);
    },
    onFrame(data) {
      var that = this;
      var b64jpg = btoa(String.fromCharCode.apply(null, new Uint8Array(data)));
      var img = new Image();
      img.src = 'data:image/jpeg;base64,' + b64jpg;
      img.onload = () => {
        that.ctx.drawImage(img, 0, 0, that.width, that.height);
        socket.emit('frame'); // recursive event
      };
    },
    handleClick(e) {
      var rect = e.target.getBoundingClientRect();
      var clickX = (e.clientX - rect.left) / rect.width * 2.0 - 1.0;
      var clickY = (e.clientY - rect.top) / rect.height * 2.0 - 1.0;
      socket.emit('moveServo', {x: clickX, y: clickY});
    },
    render() {
      return <canvas ref="canvas"
              className="img-responsive"
              width={this.width} height={this.height}
              style={{backgroundColor: 'grey'}}
              onClick={this.handleClick} />;
    }
});

var IOT = React.createClass({
    getInitialState() {
      return {
        activeNode: 0,
        users: [],
        nodes: [],
      };
    },
    componentDidMount() {
      socket.on('frame', this.onFrame);
      socket.on('changeIoNode', this.onChangeIoNode);
      socket.on('usersInfo', this.onUsersInfo);
      socket.on('nodesInfo', this.onNodesInfo);

      // initial requests
      socket.emit('usersInfo');
      socket.emit('nodesInfo');
      socket.emit('frame', this.state.activeNode);
    },
    onFrame(data) {
      this.refs.viewer.onFrame(data);
    },
    onChangeIoNode(data) {
      this.setState({activeNode: data.activeNode});
    },
    onUsersInfo(data) {
      this.setState({users: data});
    },
    onNodesInfo(data) {
      this.setState({nodes: data});
    },
    render(){
      return (
        <div className="container-fluid">
          <div className="row">
            <div className="col-sm-7 col-xs-12 xs-nopadding">
              <IoNodeTab
                nodes={this.state.nodes}
                activeNode={this.state.activeNode} />
              <ImageViewer ref="viewer"
                activeNode={this.state.activeNode} />
            </div>
            <div className="col-sm-5 col-xs-12">
              <UserList users={this.state.users} />
              <a href="/admin"> admin </a><br />
              <a href="/logout"> logout </a>
            </div>
          </div>
        </div>
      );
    }
});

ReactDOM.render(
  <IOT />,
  document.getElementById('content')
);
