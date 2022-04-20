let game;

let gameOptions = {
  gameWidth: 1000,
  gameHeight: 1400,
  tileSize: 140,
  score: 0,
  fieldSize: {
    rows: 6,
    cols: 6,
  },
  fallSpeed: 250,
  colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x8b00ff],
};

window.onload = function () {
  game = new Phaser.Game(gameOptions.gameWidth, gameOptions.gameHeight);
  game.state.add("TheGame", TheGame);
  game.state.start("TheGame");
};

class TheGame {
  constructor() {}
  preload() {
    game.stage.backgroundColor = 0x444444;
    game.load.image("tiles", "./assets/sprites/tiles.png");
    game.load.image("arrows", "./assets/sprites/arrows.png");
  }
  create() {
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    this.createLevel();
    game.input.onDown.add(this.pickTile, this);
    this.createText();
  }
  createText() {
    game.score = game.add.text(700, 10, "POINTS: 0", {
      fill: "#fff",
      font: "50px Arial",
    });
  }
  setScore() {
    gameOptions.score++;
    game.score.setText("POINTS: " + gameOptions.score);
  }
  createLevel() {
    this.tilesArray = [];
    this.arrowsArray = [];
    this.tileGroup = game.add.group();
    this.arrowsGroup = game.add.group();
    this.tileGroup.x =
      (game.width - gameOptions.tileSize * gameOptions.fieldSize.cols) / 2;
    this.tileGroup.y =
      (game.height - gameOptions.tileSize * gameOptions.fieldSize.rows) / 2;
    this.arrowsGroup.x = this.tileGroup.x;
    this.arrowsGroup.y = this.tileGroup.y;
    let tileMask = game.add.graphics(this.tileGroup.x, this.tileGroup.y);
    tileMask.beginFill(0x343434);
    tileMask.drawRect(
      0,
      0,
      gameOptions.tileSize * gameOptions.fieldSize.cols,
      gameOptions.tileSize * gameOptions.fieldSize.rows
    );
    this.tileGroup.mask = tileMask;
    for (let i = 0; i < gameOptions.fieldSize.rows; i++) {
      this.tilesArray[i] = [];
      for (let j = 0; j < gameOptions.fieldSize.cols; j++) {
        this.addTile(i, j);
      }
    }
    this.removedTiles = [];
  }
  addTile(row, col) {
    let tileXPos = col * gameOptions.tileSize + gameOptions.tileSize / 2;
    let tileYPos = row * gameOptions.tileSize + gameOptions.tileSize / 2;
    let theTile = game.add.sprite(tileXPos, tileYPos, "tiles");
    theTile.anchor.set(0.5);
    theTile.picked = false;
    theTile.coordinate = new Phaser.Point(col, row);
    theTile.value = Phaser.ArrayUtils.getRandomItem(gameOptions.colors);
    theTile.tint = theTile.value;
    this.tilesArray[row][col] = theTile;
    let text = game.add.text(
      -gameOptions.tileSize / 4,
      0,
      "R" +
        theTile.coordinate.y.toString() +
        ", C" +
        theTile.coordinate.x.toString(),
      { fill: "#000", font: "1px Arial" }
    );
    theTile.addChild(text);
    this.tileGroup.add(theTile);
  }
  pickTile(e) {
    this.visitedTiles = [];
    this.visitedTiles.length = 0;
    if (this.tileGroup.getBounds().contains(e.position.x, e.position.y)) {
      let col = Math.floor(
        (e.position.x - this.tileGroup.x) / gameOptions.tileSize
      );
      let row = Math.floor(
        (e.position.y - this.tileGroup.y) / gameOptions.tileSize
      );
      this.tilesArray[row][col].alpha = 0.5;
      this.tilesArray[row][col].picked = true;
      this.pickedColor = this.tilesArray[row][col].value;
      game.input.onDown.remove(this.pickTile, this);
      game.input.onUp.add(this.releaseTile, this);
      game.input.addMoveCallback(this.moveTile, this);
      this.visitedTiles.push(this.tilesArray[row][col].coordinate);
    }
  }
  moveTile(e) {
    if (this.tileGroup.getBounds().contains(e.position.x, e.position.y)) {
      let col = Math.floor(
        (e.position.x - this.tileGroup.x) / gameOptions.tileSize
      );
      let row = Math.floor(
        (e.position.y - this.tileGroup.y) / gameOptions.tileSize
      );
      let distance = new Phaser.Point(
        e.position.x - this.tileGroup.x,
        e.position.y - this.tileGroup.y
      ).distance(this.tilesArray[row][col]);
      if (
        distance < gameOptions.tileSize * 0.4 &&
        this.tilesArray[row][col].value == this.pickedColor
      ) {
        if (
          !this.tilesArray[row][col].picked &&
          this.checkAdjacent(
            new Phaser.Point(col, row),
            this.visitedTiles[this.visitedTiles.length - 1]
          )
        ) {
          this.tilesArray[row][col].picked = true;
          this.tilesArray[row][col].alpha = 0.5;
          this.visitedTiles.push(this.tilesArray[row][col].coordinate);
          this.addArrow();
        } else {
          if (
            this.visitedTiles.length > 1 &&
            row == this.visitedTiles[this.visitedTiles.length - 2].y &&
            col == this.visitedTiles[this.visitedTiles.length - 2].x
          ) {
            this.tilesArray[this.visitedTiles[this.visitedTiles.length - 1].y][
              this.visitedTiles[this.visitedTiles.length - 1].x
            ].picked = false;
            this.tilesArray[this.visitedTiles[this.visitedTiles.length - 1].y][
              this.visitedTiles[this.visitedTiles.length - 1].x
            ].alpha = 1;
            this.visitedTiles.pop();
            this.arrowsArray[this.arrowsArray.length - 1].destroy();
            this.arrowsArray.pop();
          }
        }
      }
    }
  }
  releaseTile() {
    game.input.onUp.remove(this.releaseTile, this);
    game.input.deleteMoveCallback(this.moveTile, this);
    this.clearPath();
    this.tilesFallDown();
    this.placeNewTiles();
  }
  checkAdjacent(p1, p2) {
    return (
      (Math.abs(p1.x - p2.x) == 1 && p1.y - p2.y == 0) ||
      (Math.abs(p1.y - p2.y) == 1 && p1.x - p2.x == 0)
    );
  }
  addArrow() {
    let fromTile = this.visitedTiles[this.visitedTiles.length - 2];
    let arrow = game.add.sprite(
      this.tilesArray[fromTile.y][fromTile.x].x,
      this.tilesArray[fromTile.y][fromTile.x].y,
      "arrows"
    );
    this.arrowsGroup.add(arrow);
    arrow.anchor.set(0.5);
    arrow.value = this.pickedColor;
    arrow.tint = arrow.value;
    let tileDiff = new Phaser.Point(
      this.visitedTiles[this.visitedTiles.length - 1].x,
      this.visitedTiles[this.visitedTiles.length - 1].y
    );
    tileDiff.subtract(
      this.visitedTiles[this.visitedTiles.length - 2].x,
      this.visitedTiles[this.visitedTiles.length - 2].y
    );
    if (tileDiff.x == 0) {
      arrow.angle = -90 * tileDiff.y;
    } else {
      arrow.angle = 90 * (tileDiff.x + 1);
      if (tileDiff.y != 0) {
        arrow.frame = 1;
        if (tileDiff.y + tileDiff.x == 0) {
          arrow.angle -= 90;
        }
      }
    }
    this.arrowsArray.push(arrow);
  }
  clearPath() {
    this.arrowsGroup.removeAll(true);
    for (let i = 0; i < this.visitedTiles.length; i++) {
      this.tilesArray[this.visitedTiles[i].y][
        this.visitedTiles[i].x
      ].visible = false;
      this.removedTiles.push(
        this.tilesArray[this.visitedTiles[i].y][this.visitedTiles[i].x]
      );
      this.tilesArray[this.visitedTiles[i].y][this.visitedTiles[i].x] = null;
    }
  }
  tilesFallDown() {
    for (let i = gameOptions.fieldSize.cols - 1; i >= 0; i--) {
      for (let j = 0; j < gameOptions.fieldSize.rows; j++) {
        if (this.tilesArray[i][j] != null) {
          let holes = this.holesBelow(i, j);
          if (holes > 0) {
            let coordinate = new Phaser.Point(
              this.tilesArray[i][j].coordinate.x,
              this.tilesArray[i][j].coordinate.y
            );
            let destination = new Phaser.Point(j, i + holes);
            let tween = game.add.tween(this.tilesArray[i][j]).to(
              {
                y: this.tilesArray[i][j].y + holes * gameOptions.tileSize,
              },
              gameOptions.fallSpeed,
              Phaser.Easing.Linear.None,
              true
            );
            tween.onComplete.add(this.nextPick, this);
            this.tilesArray[destination.y][destination.x] =
              this.tilesArray[i][j];
            this.tilesArray[coordinate.y][coordinate.x] = null;
            this.tilesArray[destination.y][destination.x].coordinate =
              new Phaser.Point(destination.x, destination.y);
            this.tilesArray[destination.y][destination.x].children[0].text =
              "R" + destination.y + ", C" + destination.x;
          }
        }
      }
    }
  }
  placeNewTiles() {
    for (let i = 0; i < gameOptions.fieldSize.cols; i++) {
      let holes = this.holesInCol(i);
      if (holes > 0) {
        for (let j = 1; j <= holes; j++) {
          let tileXPos = i * gameOptions.tileSize + gameOptions.tileSize / 2;
          let tileYPos = -j * gameOptions.tileSize + gameOptions.tileSize / 2;
          let theTile = this.removedTiles.pop();
          theTile.position = new Phaser.Point(tileXPos, tileYPos);
          theTile.visible = true;
          theTile.alpha = 1;
          theTile.picked = false;
          theTile.value = Phaser.ArrayUtils.getRandomItem(gameOptions.colors);

          theTile.tint = theTile.value;
          let tween = game.add.tween(theTile).to(
            {
              y: theTile.y + holes * gameOptions.tileSize,
            },
            gameOptions.fallSpeed,
            Phaser.Easing.Linear.None,
            true
          );
          tween.onComplete.add(this.nextPick, this);
          theTile.coordinate = new Phaser.Point(i, holes - j);
          this.tilesArray[holes - j][i] = theTile;
          theTile.children[0].text =
            "R" + theTile.coordinate.y + ", C" + theTile.coordinate.x;
          this.setScore();
        }
      }
    }
  }
  nextPick() {
    if (!game.input.onDown.has(this.pickTile, this)) {
      game.input.onDown.add(this.pickTile, this);
    }
  }
  holesBelow(row, col) {
    let result = 0;
    for (let i = row + 1; i < gameOptions.fieldSize.rows; i++) {
      if (this.tilesArray[i][col] == null) {
        result++;
      }
    }
    return result;
  }
  holesInCol(col) {
    let result = 0;
    for (let i = 0; i < gameOptions.fieldSize.rows; i++) {
      if (this.tilesArray[i][col] == null) {
        result++;
      }
    }
    return result;
  }
}
