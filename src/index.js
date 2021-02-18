import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Confetti from 'react-confetti';

var numberRow = 7;
var numberSqr = 6;


function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function HomeButton() {
  return (
    <button className="menu-button" onClick={() => {
      setCookie("mode", "menu", 100)
      window.location.href = window.location.href;
    }}>
      home
    </button>
  );
}

function RestartButton() {
  return (
    <button className="menu-button" onClick={() => {
      window.location.href = window.location.href;
    }}>
      restart
    </button>
  );
}

function Square(props) {
  if (props.value === 1 && !props.highlight){
    return (
      <button className="square-p1" onClick={props.onClick}>
      </button>
    );
  }else if (props.value === 1 && props.highlight){
    return (
      <button className="square-p1-high" onClick={props.onClick}>
      </button>
    );
  }else if (props.value === 2 && !props.highlight){
    return (
      <button className="square-p2" onClick={props.onClick}>
      </button>
    );
  }else if (props.value === 2 && props.highlight){
    return (
      <button className="square-p2-high" onClick={props.onClick}>
      </button>
    );
  }else {
    return (
      <button className="square-blank" onClick={props.onClick}>
      </button>
    );
  }
}

class Row extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      squares: new Array(numberSqr).fill(0),    
      lastPlace: 0,
    };
  }

  dropCoin(){
    var stillFalling = false;
    for (let index = numberSqr-1; index > 0; index--) {
      if (this.state.squares[index - 1] !== 0 && this.state.squares[index] === 0){
        let row = this.state.squares;
        row[index] = row[index - 1];
        row[index - 1] = 0;

        this.setState({
          squares: row,
          lastPlace: index,
        });
        stillFalling = true;
      }
    }
    if(stillFalling){
      setTimeout(() => {this.dropCoin();}, 200)
    }else{
      this.props.onPlace(this.state.lastPlace);
      this.setState({
        lastPlace: 0,
      });
    }
  }

  handleSelection(){
    let row = this.state.squares;
    row[0] = this.props.whoIsNext;
    this.props.onClick();
    this.setState({
      squares: row,
    });
    setTimeout(() => {this.dropCoin();}, 200);
  }

  handleClick(){
    let row = this.state.squares;
    if (this.props.canPlay && row[0] === 0){
      this.handleSelection();
    }
  }

  renderSquares(){
    let element = [];
    let highlight = false;

    for (let index = 0; index < numberSqr; index++) {
      if (this.props.highlightSqrs.includes(index)){
        highlight = true;
      }else{
        highlight = false;
      }
      element.push(
        <Square 
          value={this.state.squares[index]}
          onClick={() => this.handleClick()}
          key={index}
          index={index}
          highlight={highlight}
        />
        
      );
    }
    return element;
  }

  //Todo arrumar pra handleSelection nao ficar dentro do render
  render(){
    if (this.props.nextPlay){
      this.handleSelection();
    }
    return(
      <div className="board-row">
        {this.renderSquares()}
      </div>
    );
  }
}

class MultiBoard extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      whoIsNext: 1,
      canPlay:true,
      rows: new Array(numberRow).fill().map(() => Array(numberSqr).fill(0)),
      gameOver: false,
      nextPlay: false,
      lastRow: 0,
      lastSqr: 0,
      highlightPositions: [],
      tie: false,
    };
  }

  handleApiGame(gameOver, positions){
    if (gameOver === "tie"){
      this.setState({
        gameOver: true,
        tie: true
      })
    }else if (gameOver === false){
      this.setState({
        canPlay: true,
        whoIsNext: (this.state.whoIsNext === 1? 2:1),
      });
    }else{
      this.setState({
        gameOver: true,
        highlightPositions: positions,
      });
    }
  }

  postApiGame(lastRow, lastSqr){
    fetch('http://localhost:5000/game', {
      method: 'POST',
      cache: "no-cache",
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({board: this.state.rows, 
                            lastRow: lastRow, 
                            lastSqr: lastSqr, 
                            numberRow: numberRow, 
                            numberSqr: numberSqr
                          })
      }).then(response => response.json())
        .then((response) => this.handleApiGame(response["gameOver"], response["positions"])
        )
        .catch(error => console.log(error));
  }

  handleGame(row, sqr){
    let board = [...this.state.rows];
    board[row][sqr] = this.state.whoIsNext;
    this.setState({
      rows: board,
    });
    this.postApiGame(row, sqr);
  }

  handleClick(){
    this.setState({
      canPlay: false,
      nextPlay: false,
    });
  }

  // ToDo arrumar pra Api do handleGame ser processado antes de onPlace
  renderRows(){
    let element = [];

    for (let index = 0; index < numberRow; index++) {
      let highlightSqrs = [];
      for (let i = 0; i < this.state.highlightPositions.length; i++) {
        if (index === this.state.highlightPositions[i][0]){
          highlightSqrs.push(this.state.highlightPositions[i][1])
        }
      }

      element.push(
        <div className="board-row">
          <Row 
            whoIsNext={this.state.whoIsNext}
            canPlay={this.state.canPlay}
            nextPlay={this.state.nextPlay===index}
            highlightSqrs={highlightSqrs}
            onClick={() => this.handleClick()}
            onPlace={(sqr) => this.handleGame(index, sqr)}
            key={index}
          />
        </div>
        
      );
    }
    return element;
  }

  renderStatus(){
    if (this.state.tie){
      return(
        <div className="status">
          tie  
        </div>
      );
    }else if(this.state.gameOver){
      return(
        <div className="status">
        player {this.state.whoIsNext} wins  
      </div>
      );
    }else{
      return(
        <div className="status">
          player {this.state.whoIsNext} turn  
        </div>
      );
    }
  }

  renderConfetti(){
    if(this.state.gameOver){
      const { innerWidth: width, innerHeight: height } = window;
      return(
        <Confetti
          width={width}
          height={height}
        />
      )
    }
  }

  render (){
    return(
      <div className="game-area">
        <div className="game-board">
          {this.renderStatus()}
          {this.renderRows()}
          {this.renderConfetti()}
        </div>
        <div className="game-buttons">
          <HomeButton />
          <RestartButton />
        </div>
      </div>
    )
  }
}

class SingleBoard extends MultiBoard{
  constructor(props){
    super(props);
    this.state = {
      ...this.state,
    };
  }

  postApiOpponent(){
    var level = getCookie("dificulty");
    var dificultyLevel;

    if (level === "easy"){
      dificultyLevel = 2;
    }else if (level === "medium"){
      dificultyLevel = 3;
    }else{
      dificultyLevel = 4;
    }

    fetch('http://localhost:5000/opponent', {
      method: 'POST',
      cache: "no-cache",
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({board: this.state.rows, 
                            nextPlayer: this.state.whoIsNext, 
                            numberRow: numberRow, 
                            numberSqr: numberSqr,
                            dificultyLevel: 4,
                          })
      }).then(response => response.json())
        .then((response) => {
          let nextPlay;

          nextPlay = response["nextPlay"];
  
          this.setState({
            nextPlay: nextPlay,
          });
        })
        .catch(error => console.log(error));
  }

  handleApiGame(gameover, positions){
    if (gameover === "tie"){
      this.setState({
        gameOver: true,
        tie: true,
      })
    }else if (gameover){
      this.setState({
        gameOver: true,
        highlightPositions: positions,
      });
    }else{
      if (this.state.whoIsNext === 1){
        this.setState({
          canPlay: false,
          whoIsNext: 2,
        });
        this.postApiOpponent();
      }else{
        this.setState({
          canPlay: true,
          whoIsNext: 1,
          nextPlay: false,
        });
      }
    }
  }


  render (){
    return(
      <div className="game-area">
        <div className="game-board">
          {this.renderStatus()}
          {this.renderRows()}
          {this.renderConfetti()}
        </div>
        <div className="game-buttons">
          <HomeButton />
          <RestartButton />
        </div>
      </div>
    )
  }
}

class SelectBox extends React.Component{
  constructor(props){
    super(props);

    let currentValue = getCookie(this.props.name);

    this.state = {
      optionNumber: currentValue===""? 1:parseInt(currentValue),
    };

    this.handleLeftClick  = this.handleLeftClick.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
  }

  handleLeftClick(){
    let nextValue;
    if (this.state.optionNumber <= 0){
      nextValue = this.props.options.length - 1;
    }else{
      nextValue = this.state.optionNumber - 1;
    }
    this.handleChange(nextValue);
  }

  handleRightClick(){
    let nextValue;
    if (this.state.optionNumber >= this.props.options.length - 1){
      nextValue = 0;
    }else{
      nextValue = this.state.optionNumber + 1;
    }
    this.handleChange(nextValue);
  }

  handleChange(nextValue){
    this.setState({
      optionNumber: nextValue,
    });
    setCookie(this.props.name, nextValue, 100);
  }

  render(){
    let currentValue = this.props.options[this.state.optionNumber];

    return(
      <div className="select-box" name={this.props.name}>
        <div className="category-to-select">
          {this.props.name}
        </div>
        <button className="left-select-button" onClick={this.handleLeftClick}></button>
        <div className="selected-item">
          {currentValue}
        </div>
        <button className="right-select-button" onClick={this.handleRightClick}></button>
      </div>
    );
  }
}

class ConfigurationMenu extends React.Component{
  constructor(props){
    super(props);
  }

  render(){
    return(
      <div className="config-menu">
        <SelectBox 
          name="dificulty"
          options={["easy", "medium", "hard"]}
        />
        <SelectBox 
          name="board-style"
          options={["short", "standard", "long"]}
        />
        <SelectBox 
          name="who-is-first?"
          options={["cpu", "me"]}
        />

        <HomeButton />
      </div>
    );
  }
}

class Menu extends React.Component{
  constructor(props){
    super(props);
    this.state = {};
  }

  render(){
    return(
      <div className="main-menu">
        <button className="menu-button" onClick={this.props.onSingClick}>
          Single Player
        </button>
        <button className="menu-button" onClick={this.props.onMultClick}>
          Multiplayer Player
        </button>
        <button className="menu-button" onClick={this.props.onConfClick}>
          Configurations
        </button>
      </div>
    );
  }
}

class Game extends React.Component{
  constructor(props){
    super(props);

    let currentMode = getCookie("mode");

    this.state = {
      mode: currentMode===""? "menu":currentMode,
      dificultyLevel: "hard",
      npcTurn: 2,
      numberRow: 7,
      numberSqr: 6,
      lineLengthToWin: 4,
    };
  }

  handleSingClick() {
    setCookie("mode", "single", 100)

    this.setState({
      mode: "single",
    });
  }

  handleMultClick() {
    setCookie("mode", "multi", 100)

    this.setState({
      mode: "multi",
    });
  }

  handleConfClick() {
    setCookie("mode", "config", 100)
    
    this.setState({
      mode: "config",
    });
  }


  renderTitle(){
    return(
      <div className="title">
        <div className='title1'>C</div>
        <div className='title2'>o</div>
        <div className='title3'>n</div>
        <div className='title4'>n</div>
        <div className='title5'>e</div>
        <div className='title6'>c</div>
        <div className='title7'>t </div>
        <div className='title8'>4</div>
      </div>
    );
  }

  renderBody() {
    switch (this.state.mode){
      case "menu":
        return(
        <Menu 
          onSingClick={() => this.handleSingClick()}
          onMultClick={() => this.handleMultClick()}
          onConfClick={() => this.handleConfClick()}
        />
        );
      case "single":
        return(
          <SingleBoard />
        );
      case "multi":
        return(
          <MultiBoard />
        );
      case "config":
        return(
          <ConfigurationMenu />
        );
      default:
        return(
          <Menu 
            onClick={() => this.handleSingClick()}
            onMultClick={() => this.handleMultClick()}
            onConfClick={() => this.handleConfClick()}
          />
        );
    }
  }

  render (){
    return(
      <div className="game">
        {this.renderTitle()}
        {this.renderBody()}
      </div>
    );
  }
}


ReactDOM.render(
  <Game />,
  document.getElementById('root')
);