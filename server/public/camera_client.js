var socket = io.connect('/camera');

var ImageViewer = React.createClass({
  width : 640,
  height : 480,
  componentDidMount() {
		this.ctx = ReactDOM.findDOMNode(this.refs.canvas).getContext('2d');
    socket.on('frame', this.onFrame);
    socket.emit('frame'); // initial request
  },
  onFrame(data){
    var that = this;
    var b64jpg = btoa(String.fromCharCode.apply(null, new Uint8Array(data)));
    var img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64jpg;
    img.onload = function() {
      that.ctx.drawImage(img, 0, 0, that.width, that.height);
      socket.emit('frame');
    };
  },
  handleClick(e) {
    var rect = e.target.getBoundingClientRect();
    var clickX = (e.clientX - rect.left) / this.width * 2.0 - 1.0;
    var clickY = (e.clientY - rect.top) / this.height * 2.0 - 1.0;
    socket.emit('move', {x: clickX, y: clickY});
  },
  render(){
    return <canvas ref='canvas' width={this.width} height={this.height}
            style={{backgroundColor: 'grey'}} onClick={this.handleClick} />;
  }
});

var IOT = React.createClass({
  render(){
    return (
      <div>
        <ImageViewer /><br />
        <a href="/logout"> logout </a>
      </div>
    );
  }
});

ReactDOM.render(
  <IOT />,
  document.getElementById('content')
);
