var socket = io.connect('/camera');

var ImageViewer = React.createClass({
  width : 640,
  height : 480,
  componentDidMount() {
		this.ctx = ReactDOM.findDOMNode(this.refs.canvas).getContext('2d');
    socket.on('frame', this.on_frame);
  },
  on_frame(data){
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
    var click_x = (e.clientX - rect.left) / this.width * 2.0 - 1.0;
    var click_y = (e.clientY - rect.top) / this.height * 2.0 - 1.0;
    socket.emit('move', {x: click_x, y: click_y});
  },
  render(){
    return <canvas ref='canvas' width={this.width} height={this.height}
            style={{backgroundColor: 'grey'}} onClick={this.handleClick} />;
  }
});

var CommentBox = React.createClass({
  render: function() {
    return (
      <div className="commentBox">
        Hello, world! I am a CommentBox.
      </div>
    );
  }
});

ReactDOM.render(
  <ImageViewer />,
  document.getElementById('content')
);
