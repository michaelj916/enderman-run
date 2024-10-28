import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import endermanImage from './assets/enderman.webp';
import pearlImage from './assets/pearl.webp';

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.backgrounds = [];
    this.currentBg = 0;
    this.isPaused = false;
  }

  preload() {
    this.load.image('enderman', endermanImage);
    this.load.image('pearl', pearlImage);

    // Dynamically load all PNG backgrounds
    const context = require.context('./assets/background', false, /\.(png)$/);
    context.keys().forEach((key, index) => {
      const bgKey = `bg${index + 1}`;
      this.load.image(bgKey, context(key));
      this.backgrounds.push(bgKey);
    });
  }

  create() {
    this.startGame();
  }

  startGame() {
    this.children.removeAll(true);
    this.randomizeBackgrounds();
    this.currentBg = 0;
    this.createBackground();

    this.backgroundTimer = this.time.addEvent({
      delay: 10000,
      callback: this.changeBackground,
      callbackScope: this,
      loop: true
    });

    this.pearlSpeed = 300;
    this.maxPearlSpeed = this.pearlSpeed * 3; // Cap at 75% increase
    this.pearlSpeedTimer = this.time.addEvent({
      delay: 5000,
      callback: () => {
        if (this.pearlSpeed < this.maxPearlSpeed) {
          this.pearlSpeed += 20; // Increase speed gradually
        }
      },
      callbackScope: this,
      loop: true
    });

    this.enderman = this.physics.add.sprite(50, 50, 'enderman');
    this.enderman.setCollideWorldBounds(true);
    // Adjust hitbox size to be 80% of the sprite's size
    const endermanWidth = this.enderman.width * 0.8;
    const endermanHeight = this.enderman.height * 0.8;
    this.enderman.body.setSize(endermanWidth, endermanHeight);
    // Center the hitbox
    this.enderman.body.setOffset(
        (this.enderman.width - endermanWidth) / 2,
        (this.enderman.height - endermanHeight) / 2
    );
    this.pearls = this.physics.add.group();
    this.gameOver = false;
    this.startTime = Date.now();
    this.scoreText = this.add.text(16, 16, 'Score: 0.00', { fontSize: '32px', fill: '#000', fontFamily: 'CCOverbyteOffW00-Regular' });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    // Reset pearl spawn rate to initial value
    this.spawnPearlEvent = this.time.addEvent({
      delay: 2500,
      callback: this.spawnPearl,
      callbackScope: this,
      loop: true
    });

    // Add pause button
    this.pauseButton = this.add.text(16, 50, 'Pause', { fontSize: '32px', fill: '#000', fontFamily: 'CCOverbyteOffW00-Regular' })
      .setInteractive()
      .on('pointerdown', () => this.togglePause());
  }

  randomizeBackgrounds() {
    this.backgrounds = Phaser.Utils.Array.Shuffle(this.backgrounds);
  }

  createBackground() {
    if (this.background) {
      this.background.destroy();
    }

    this.background = this.add.tileSprite(
      0,
      0,
      this.sys.game.config.width,
      this.sys.game.config.height,
      this.backgrounds[this.currentBg]
    );
    this.background.setOrigin(0, 0);
    this.background.setDepth(-1);
  }

  changeBackground() {
    if (this.gameOver || this.isPaused) return;
    this.currentBg = (this.currentBg + 1) % this.backgrounds.length;
    this.createBackground();

    // Increase pearl spawn rate by 10% up to a maximum of 50%
    if (this.spawnPearlEvent.delay > 1250) {
      this.spawnPearlEvent.delay *= 0.5;
    }
  }

  spawnPearl() {
    if (this.gameOver || this.isPaused) return;
  
    const pearl = this.pearls.create(this.sys.game.config.width, Math.random() * this.sys.game.config.height, 'pearl');
    pearl.setScale(0.5);
    // Adjust hitbox size to be 60% of the scaled pearl size
    const pearlWidth = pearl.width * 0.6;
    const pearlHeight = pearl.height * 0.6;
    pearl.body.setSize(pearlWidth, pearlHeight);
    // Center the hitbox
    pearl.body.setOffset(
        (pearl.width - pearlWidth) / 2,
        (pearl.height - pearlHeight) / 2
    );
  
    // Calculate direction vector towards the enderman
    const directionX = this.enderman.x - pearl.x;
    const directionY = this.enderman.y - pearl.y;
    const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
  
    // Normalize the direction vector and set velocity
    pearl.setVelocityX((directionX / magnitude) * this.pearlSpeed);
    pearl.setVelocityY((directionY / magnitude) * this.pearlSpeed);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.backgroundTimer.paused = true;
      this.pearlSpeedTimer.paused = true;
      this.spawnPearlEvent.paused = true;
      this.pauseButton.setText('Resume');

      // Display pause message
      this.pauseText = this.add.text(
        this.sys.game.config.width / 2,
        this.sys.game.config.height / 2 - 50,
        `Paused\nPress 'Esc' to resume`,
        { fontSize: '48px', fill: '#000', align: 'center', fontFamily: 'CCOverbyteOffW00-Regular' }
      ).setOrigin(0.5);

      this.resumeButton = this.add.text(
        this.sys.game.config.width / 2,
        this.sys.game.config.height / 2 + 50,
        'Click to Resume',
        { fontSize: '32px', fill: '#000', fontFamily: 'CCOverbyteOffW00-Regular' }
      ).setOrigin(0.5).setInteractive();

      this.resumeButton.on('pointerdown', () => this.togglePause());
    } else {
      this.physics.resume();
      this.backgroundTimer.paused = false;
      this.pearlSpeedTimer.paused = false;
      this.spawnPearlEvent.paused = false;
      this.pauseButton.setText('Pause');

      // Remove pause message and resume button
      if (this.pauseText) this.pauseText.destroy();
      if (this.resumeButton) this.resumeButton.destroy();
    }
  }

  hitPearl(enderman, pearl) {
    pearl.destroy();
    this.gameOver = true;

    this.backgroundTimer.remove();
    this.pearlSpeedTimer.remove();
    this.spawnPearlEvent.remove();

    const finalScore = ((Date.now() - this.startTime) / 1000).toFixed(2);
    this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2 - 50, 
      'Game Over', { fontSize: '64px', fill: '#000', fontFamily: 'CCOverbyteOffW00-Regular' }).setOrigin(0.5);
    this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2 + 50, 
      'Final Score: ' + finalScore + ' seconds', { fontSize: '32px', fill: '#000', fontFamily: 'CCOverbyteOffW00-Regular' }).setOrigin(0.5);

    const restartButton = this.add.text(this.sys.game.config.width / 2, this.sys.game.config.height / 2 + 120, 
      'Click to Restart', { fontSize: '32px', fill: '#000', fontFamily: 'CCOverbyteOffW00-Regular' })
      .setOrigin(0.5)
      .setInteractive();

    restartButton.on('pointerdown', () => {
      restartButton.destroy(); // Remove the restart button to prevent multiple restarts
      this.startGame();
    });
  }

  updateScore() {
    if (!this.gameOver) {
      const currentTime = (Date.now() - this.startTime) / 1000;
      this.scoreText.setText('Score: ' + currentTime.toFixed(2));
      return currentTime;
    }
  }

  update() {
    if (this.gameOver) return;
  
    // Check for pause/resume key presses
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P))) {
      this.togglePause();
    }
  
    if (this.isPaused) {
      if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC))) {
        this.togglePause();
      }
      return;
    }
  
    // Handle keyboard input
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.enderman.setVelocityX(-300);
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.enderman.setVelocityX(300);
    } else {
      this.enderman.setVelocityX(0);
    }
  
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.enderman.setVelocityY(-300);
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.enderman.setVelocityY(300);
    } else {
      this.enderman.setVelocityY(0);
    }
  
    // Handle touch swipe input
    if (this.input.pointer1.isDown) {
      const pointer = this.input.pointer1;
      const swipeThreshold = 10; // Minimum distance for a swipe
  
      if (pointer.downX - pointer.x > swipeThreshold) {
        this.enderman.setVelocityX(-300); // Swipe left
      } else if (pointer.x - pointer.downX > swipeThreshold) {
        this.enderman.setVelocityX(300); // Swipe right
      }
  
      if (pointer.downY - pointer.y > swipeThreshold) {
        this.enderman.setVelocityY(-300); // Swipe up
      } else if (pointer.y - pointer.downY > swipeThreshold) {
        this.enderman.setVelocityY(300); // Swipe down
      }
    }
  
    this.enderman.y += 1;
  
    this.pearls.children.iterate((pearl) => {
      if (pearl) {
        pearl.y += Math.sin(pearl.x / 30) * 5;
        if (pearl.x < -30) {
          pearl.destroy();
        }
      }
    });
  
    this.updateScore();
    this.physics.overlap(this.enderman, this.pearls, this.hitPearl, null, this);
  }
}

const EndermanGame = () => {
  const gameRef = useRef(null);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#ffffff',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: GameScene
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ width: '100%', height: '100%' }} />;
};

export default EndermanGame;
